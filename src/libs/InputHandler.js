'kiwi public';

import * as TextFormatting from '@/helpers/TextFormatting';
import * as Misc from '@/helpers/Misc';
import _ from 'lodash';
import AliasRewriter from './AliasRewriter';

// Map of commandName=commandHandlerFn
const inputCommands = {};

export default class InputHandler {
    constructor(state) {
        this.state = state;
        this.aliasRewriter = new AliasRewriter();

        // Load the aliases from general settings
        this.aliasRewriter.importFromString(state.setting('aliases'));

        // Only watch the user setting changes in order to reload them
        state.$watch('user_settings.aliases', (newVal) => {
            this.aliasRewriter.importFromString(state.setting('aliases'));
        });

        this.listenForInput();
    }

    defaultContext() {
        return {
            network: this.state.getActiveNetwork(),
            buffer: this.state.getActiveBuffer(),
        };
    }

    validateContext(context) {
        if (
            typeof context !== 'object' ||
            !Object.prototype.hasOwnProperty.call(context, 'buffer') ||
            !Object.prototype.hasOwnProperty.call(context, 'network') ||
            typeof context.buffer !== 'object' ||
            typeof context.network !== 'object'
        ) {
            throw new TypeError('context must contain both network and buffer properties');
        }
    }

    listenForInput() {
        this.state.$on('input.raw', (input, context = this.defaultContext()) => {
            let lines = input.split('\n');
            lines.forEach(line => this.processLine(line, context));
        });
    }

    processLine(rawLine, context = this.defaultContext()) {
        this.validateContext(context);
        const { network, buffer } = context;
        let line = rawLine;
        let stylesStrippedLine = Misc.stripStyles(line);

        // If no command specified, server buffers = send raw, channels/queries = send message
        let escapedCommand = stylesStrippedLine.substr(0, 2) === '//';
        if (stylesStrippedLine[0] !== '/' || escapedCommand) {
            if (escapedCommand) {
                line = line.substr(1);
            }

            if (buffer.isServer()) {
                line = '/quote ' + line;
            } else {
                line = '/msg ' + buffer.name + ' ' + line;
            }
        } else if (stylesStrippedLine[0] === '/' && line[0] !== '/') {
            // If attempting to send a /command but it has a colour code in front, use the
            // style stripped version of the line
            line = stylesStrippedLine;
        }

        let aliasVars = {
            network: network.name,
            server: network.connection.server,
            channel: network.isChannelName(buffer.name) ? buffer.name : '',
            query: network.isChannelName(buffer.name) ? '' : buffer.name,
            destination: buffer.name,
            nick: network.nick,
        };
        line = this.aliasRewriter.process(line, aliasVars);

        // An alias rewrite may have cancelled out the input
        if (!line) {
            return;
        }

        // Remove the / from the start of the line
        line = line.substr(1);

        let spaceIdx = line.indexOf(' ');
        if (spaceIdx === -1) spaceIdx = line.length;

        let command = line.substr(0, spaceIdx);
        let params = line.substr(spaceIdx + 1);

        let eventObj = {
            handled: false,
            raw: rawLine,
            command: command,
            params: params,
        };

        // Plugins may tap into this event to handle a command themselves
        this.state.$emit('input.command.' + command, eventObj, command, params);
        if (eventObj.handled) {
            return;
        }

        if (inputCommands[command.toLowerCase()]) {
            inputCommands[command.toLowerCase()].call(this, eventObj, command, params);
        }

        if (!eventObj.handled) {
            network.ircClient.raw(line);
        }
    }
}

/**
 * The actual handler functions for commands. Called in context of the InputHandler instance
 * inputCommand['the /command name'] = function(){};
 */

// /lines allows aliases to send multiple commands, separated by |
inputCommands.lines = function inputCommandLines(event, command, line) {
    event.handled = true;

    line.split('|').forEach((subLine) => {
        this.processLine(subLine.trim());
    });
};

function handleMessage(type, event, command, line) {
    event.handled = true;

    let network = this.state.getActiveNetwork();

    let spaceIdx = line.indexOf(' ');
    if (spaceIdx === -1) spaceIdx = line.length;

    let bufferName = line.substr(0, spaceIdx);
    let message = line.substr(spaceIdx + 1);

    // Mke sure we have some text to actually send
    if (!message) {
        return;
    }

    let localBuffer = bufferName;
    let extractedTarget = network.ircClient.network.extractTargetGroup(bufferName);
    if (extractedTarget) {
        localBuffer = extractedTarget.target;
    }

    let buffer = localBuffer.length && this.state.getOrAddBufferByName(network.id, localBuffer);
    if (buffer) {
        let textFormatType = 'privmsg';
        if (type === 'action') {
            textFormatType = 'action';
        } else if (type === 'notice') {
            textFormatType = 'notice';
        }

        let messageBody = TextFormatting.formatText(textFormatType, {
            nick: network.nick,
            text: message,
        });

        let newMessage = {
            time: Date.now(),
            nick: network.nick,
            message: messageBody,
            type: type,
        };

        this.state.addMessage(buffer, newMessage);
    }

    let fnNames = {
        privmsg: 'say',
        action: 'action',
        notice: 'notice',
    };
    let fnName = fnNames[type] || 'say';
    network.ircClient[fnName](bufferName, message);
}

inputCommands.msg = function inputCommandMsg(event, command, line) {
    handleMessage.call(this, 'privmsg', event, command, line);
};
inputCommands.action = function inputCommandMsg(event, command, line) {
    handleMessage.call(this, 'action', event, command, line);
};
inputCommands.notice = function inputCommandMsg(event, command, line) {
    handleMessage.call(this, 'notice', event, command, line);
};
inputCommands.dice = function inputCommandDice(event, command, line) {
    // /dice 100
    let buffer = this.state.getActiveBuffer();
    let network = this.state.getActiveNetwork();

    let sides = line.replace(/\D/g, '');
    sides = parseInt(sides || '0', 10);
    if (sides <= 0) {
        sides = 6;
    }
    let rndNumber = Math.floor(Math.random() * sides) + 1;

    let msg = TextFormatting.t('dice_roll', {
        sides: TextFormatting.formatNumber(sides),
        number: TextFormatting.formatNumber(rndNumber),
    });
    network.ircClient.action(buffer.name, msg);
    this.state.addMessage(buffer, {
        nick: network.nick,
        message: msg,
        type: 'action',
    });
};

inputCommands.ctcp = function inputCommandCtcp(event, command, line) {
    event.handled = true;

    let params = line.split(' ');
    let target = params.shift();
    let ctcpType = params.shift();

    if (!ctcpType || !target) {
        return;
    }

    let network = this.state.getActiveNetwork();
    network.ircClient.ctcpRequest(...[target, ctcpType].concat(params));
};

inputCommands.join = function inputCommandJoin(event, command, line) {
    event.handled = true;

    let network = this.state.getActiveNetwork();
    let bufferObjs = Misc.extractBuffers(line);

    // handle join without any buffers specified
    if (bufferObjs.length === 0) {
        let buffer = this.state.getActiveBuffer();

        // join the active channel if its not joined
        if (buffer.isChannel() && !buffer.joined) {
            network.ircClient.join(buffer.name, buffer.key);
            return;
        }

        // report an error if the user tries to join without specifying the channel
        this.state.addMessage(buffer, {
            nick: '*',
            message: TextFormatting.t('error_no_channel_join'),
            type: 'error',
        });
        return;
    }

    // Only switch to the first channel we join if multiple are being joined
    let hasSwitchedActiveBuffer = false;
    bufferObjs.forEach((bufferObj, idx) => {
        // /join 0 parts all channels and is only ever used to troll IRC newbies.
        // Just disable it entirely.
        if (bufferObj.name === '0') {
            return;
        }

        // Prepend a # channel prefix if not specified already
        let chanName = network.isChannelName(bufferObj.name) ?
            bufferObj.name :
            '#' + bufferObj.name;

        let newBuffer = this.state.addBuffer(network.id, chanName);

        if (newBuffer && !hasSwitchedActiveBuffer) {
            this.state.setActiveBuffer(network.id, newBuffer.name);
            hasSwitchedActiveBuffer = true;
        }

        if (bufferObj.key) {
            newBuffer.key = bufferObj.key;
        }

        network.ircClient.join(chanName, bufferObj.key);
    });
};

inputCommands.part = function inputCommandPart(event, command, line) {
    event.handled = true;

    let network = this.state.getActiveNetwork();
    let bufferNames = [];
    let message = '';

    if (line === '') {
        // /part
        bufferNames = [this.state.getActiveBuffer().name];
    } else {
        let lineParts = line.split(' ');
        if (network.isChannelName(lineParts[0])) {
            // /part #channel,#possible_channel possible part message
            bufferNames = _.compact(lineParts[0].split(','));
            message = lineParts.slice(1).join(' ');
        } else {
            // /part possible part message
            bufferNames = [this.state.getActiveBuffer().name];
            message = line;
        }
    }

    bufferNames.forEach((bufferName) => {
        network.ircClient.part(bufferName, message);
    });
};

inputCommands.quit = function inputCommandQuit(event, command, line) {
    event.handled = true;

    let network = this.state.getActiveNetwork();
    network.ircClient.quit(line);
};

inputCommands.topic = function inputCommandTopic(event, command, line) {
    event.handled = true;

    let network = this.state.getActiveNetwork();
    let bufferName = '';
    let newTopic = '';

    if (line === '') {
        // /topic
        return;
    }

    let lineParts = line.split(' ');
    if (network.isChannelName(lineParts[0])) {
        // /topic #channel a topic
        bufferName = lineParts[0];
        newTopic = lineParts.slice(1).join(' ');
    } else {
        // /topic a topic
        bufferName = this.state.getActiveBuffer().name;
        newTopic = line;
    }

    network.ircClient.setTopic(bufferName, newTopic);
};

inputCommands.kick = function inputCommandKick(event, command, line) {
    event.handled = true;

    let network = this.state.getActiveNetwork();
    let toKick = '';
    let bufferName = '';
    let kickReason = '';

    if (line === '') {
        // No params given
        return;
    }

    let lineParts = line.split(' ');

    if (network.isChannelName(lineParts[0])) {
        bufferName = lineParts.shift();
    }

    toKick = lineParts.shift();
    kickReason = lineParts.join(' ');

    if (!bufferName) {
        bufferName = this.state.getActiveBuffer().name;
    }
    if (!toKick) {
        return;
    }

    network.ircClient.raw('KICK', bufferName, toKick, kickReason);
};

inputCommands.ignore = function inputCommandIgnore(event, command, line) {
    event.handled = true;

    let network = this.state.getActiveNetwork();
    let toIgnore = line.split(' ').shift();

    if (!toIgnore) {
        return;
    }

    let user = this.state.getUser(network.id, toIgnore);
    if (user) {
        user.ignore = true;
        let buffer = this.state.getActiveBuffer();
        this.state.addMessage(buffer, {
            nick: '*',
            message: 'Ignoring ' + user.nick,
            type: 'message',
        });
    }
};

inputCommands.unignore = function inputCommandUnignore(event, command, line) {
    event.handled = true;

    let network = this.state.getActiveNetwork();
    let toUnignore = line.split(' ').shift();

    if (!toUnignore) {
        return;
    }

    let user = this.state.getUser(network.id, toUnignore);
    if (user) {
        user.ignore = false;
        let buffer = this.state.getActiveBuffer();
        this.state.addMessage(buffer, {
            nick: '*',
            message: 'No longer ignoring ' + user.nick,
            type: 'message',
        });
    }
};

inputCommands.close = function inputCommandClose(event, command, line) {
    event.handled = true;

    let network = this.state.getActiveNetwork();
    let bufferNames = _.compact(line.split(/[, ]/));
    if (bufferNames.length === 0) {
        bufferNames = [this.state.getActiveBuffer().name];
    }

    bufferNames.forEach((bufferName) => {
        let buffer = network.bufferByName(bufferName);
        if (!buffer) {
            return;
        }

        this.state.removeBuffer(buffer);
    });
};

inputCommands.query = function inputCommandQuery(event, command, line) {
    event.handled = true;

    let nicks = line.split(' ');
    let network = this.state.getActiveNetwork();

    // Only switch to the first buffer we open if multiple are being opened
    let hasSwitchedActiveBuffer = false;
    nicks.forEach((bufferName, idx) => {
        if (!bufferName) {
            return;
        }

        let newBuffer = this.state.addBuffer(network.id, bufferName);

        if (newBuffer && !hasSwitchedActiveBuffer) {
            this.state.setActiveBuffer(network.id, newBuffer.name);
            hasSwitchedActiveBuffer = true;
        }
    });
};

inputCommands.invite = function inputCommandInvite(event, command, line) {
    event.handled = true;

    let network = this.state.getActiveNetwork();
    let buffer = this.state.getActiveBuffer();

    let lineParts = line.split(' ');
    let nick = lineParts.shift();
    let channel = lineParts.shift();

    if (!channel) {
        channel = buffer.name;
    }

    if (!network.isChannelName(channel)) {
        return;
    }

    network.ircClient.raw('INVITE', nick, channel);
    this.state.addMessage(buffer, {
        nick: '*',
        message: `Invited ${nick} to ${channel}`,
        type: 'message',
    });
};

inputCommands.nick = function inputCommandNick(event, command, line) {
    event.handled = true;

    let spaceIdx = line.indexOf(' ');
    if (spaceIdx === -1) spaceIdx = line.length;

    let newNick = line.substr(0, spaceIdx);
    let network = this.state.getActiveNetwork();
    network.ircClient.changeNick(newNick);
};

inputCommands.away = function inputCommandAway(event, command, line) {
    event.handled = true;

    let network = this.state.getActiveNetwork();
    network.ircClient.raw('AWAY', line || 'Currently away');
};

inputCommands.back = function inputCommandAway(event, command, line) {
    event.handled = true;

    let network = this.state.getActiveNetwork();
    network.ircClient.raw('AWAY');
};

inputCommands.quote = function inputCommandQuote(event, command, line) {
    event.handled = true;

    let network = this.state.getActiveNetwork();
    network.ircClient.raw(line);
};

inputCommands.whois = function inputCommandWhois(event, command, line) {
    event.handled = true;

    let parts = line.split(' ');
    let network = this.state.getActiveNetwork();
    let buffer = this.state.getActiveBuffer();

    network.ircClient.whois(parts[0], parts[0], (whoisData) => {
        if (whoisData.error) {
            let messageBody = TextFormatting.formatText('whois_error', {
                nick: whoisData.nick,
                text: whoisData.error,
            });
            this.state.addMessage(buffer, {
                time: Date.now(),
                nick: '',
                message: messageBody,
                type: 'error',
            });
            return;
        }

        let out = [];
        let display = (message) => {
            if (!message) {
                return;
            }

            out.push(message);
        };
        let formats = {
            mask: 'is {{nick}}!{{user}}@{{host}} * ({{real_name}})',
            from: 'is connecting from {{actual_hostname}} {{actual_ip}}',
            channels: 'is on {{channels}}',
            server: 'is using {{server}} ({{server_info}})',
            operator: '{{operator}}',
            modes: '{{modes}}',
            account: 'is logged in as {{account}}',
            registered_nick: '{{registered_nick}}',
            secure: 'is using a secure connection',
            idle: 'has been idle for {{idle}}',
            logon: 'connected on {{logon}}',

            // The following entries will be ignored from whoisData as display() ignores
            // empty lines.
            nick: '',
            user: '',
            ident: '',
            hostname: '',
            real_name: '',
            actual_ip: '',
            server_info: '',
            actual_hostname: '',
        };

        // Display a select few entries first to keep a consistent order, and then
        // show any extra information at the end
        if (whoisData.nick && whoisData.hostname) {
            display(formats.mask
                .replace('{{nick}}', whoisData.nick)
                .replace('{{user}}', whoisData.ident)
                .replace('{{host}}', whoisData.hostname)
                .replace('{{real_name}}', whoisData.real_name));
        }
        if (whoisData.actual_hostname && whoisData.actual_ip) {
            display(formats.from
                .replace('{{actual_hostname}}', whoisData.actual_hostname)
                .replace('{{actual_ip}}', whoisData.actual_ip));
        }
        if (whoisData.channels) {
            display(formats.channels.replace('{{channels}}', whoisData.channels));
        }
        if (whoisData.server) {
            display(formats.server
                .replace('{{server}}', whoisData.server)
                .replace('{{server_info}}', whoisData.server_info));
        }
        if (whoisData.operator) {
            display(formats.operator.replace('{{operator}}', whoisData.operator));
        }
        if (whoisData.modes) {
            display(formats.modes.replace('{{modes}}', whoisData.modes));
        }
        if (whoisData.account) {
            display(formats.account.replace('{{account}}', whoisData.account));
        }
        if (whoisData.registered_nick) {
            display(formats.registered_nick.replace('{{registered_nick}}', whoisData.registered_nick));
        }
        if (whoisData.secure) {
            display(formats.secure);
        }
        if (whoisData.idle) {
            let idleSeconds = Math.floor(parseInt(whoisData.idle, 10));
            display(formats.idle.replace('{{idle}}', TextFormatting.formatDuration(idleSeconds)));
        }
        if (whoisData.logon) {
            let logonTime = parseInt(whoisData.logon, 10);
            if (!Number.isNaN(logonTime)) {
                let logonDate = new Date(logonTime * 1000);
                display(formats.logon.replace('{{logon}}', logonDate));
            }
        }

        _.each(whoisData, (val, key) => {
            // Only include lines we haven't already used
            if (typeof formats[key] === 'undefined') {
                // Some keys such as `special` are arrays of values
                if (_.isArray(val)) {
                    val.forEach(v => display(`${key}: ${v}`));
                } else {
                    display(`${key}: ${val}`);
                }
            }
        });

        out.forEach((l) => {
            this.state.addMessage(buffer, {
                nick: parts[0],
                message: l,
                type: 'whois',
            });
        });
    });
};

inputCommands.whowas = function inputCommandWhowas(event, command, line) {
    event.handled = true;

    let parts = line.split(' ');
    let network = this.state.getActiveNetwork();
    let buffer = this.state.getActiveBuffer();

    network.ircClient.whowas(parts[0], parts[0], (whowasData) => {
        if (whowasData.error) {
            let messageBody = TextFormatting.formatText('whowas_error', {
                nick: whowasData.nick,
                text: whowasData.error,
            });
            this.state.addMessage(buffer, {
                time: Date.now(),
                nick: '',
                message: messageBody,
                type: 'whowas',
            });
            return;
        }

        ['whowas_ident', 'whowas_server'].forEach((prop) => {
            let messageBody = TextFormatting.formatText(prop, {
                nick: whowasData.nick,
                ident: whowasData.ident,
                host: whowasData.hostname,
                name: whowasData.real_name,
                server: whowasData.server,
                info: whowasData.server_info,
            });

            this.state.addMessage(buffer, {
                time: Date.now(),
                nick: whowasData.nick,
                message: messageBody,
                type: 'whowas',
            });
        });
    });
};

inputCommands.mode = function inputCommandMode(event, command, line) {
    event.handled = true;

    // /mode [target] [+-modes]

    let network = this.state.getActiveNetwork();
    let buffer = this.state.getActiveBuffer();
    let target = buffer.isChannel() ?
        buffer.name :
        network.nick;

    let parts = _.compact(line.split(' '));

    if (line && line[0] !== '+' && line[0] !== '-') {
        target = parts.shift();
    }

    if (parts[0]) {
        // parts[0] = the mode(s)
        // parts[1] = optional mode arguments

        // If we're asking for a ban list, show the response in the active channel
        if (parts[0] === '+b' && !parts[1]) {
            buffer.flags.requested_banlist = true;
            // An IRCd may fuck up and simply not reply to a MODE command. Give a few seconds
            // for it to reply and if not, ignore our request was sent
            setTimeout(() => {
                buffer.flags.requested_banlist = false;
            }, 4000);
        }

        network.ircClient.mode(target, parts[0], parts[1]);
    } else {
        // No modes specified will request the modes for the target
        network.ircClient.mode(target);

        if (target === buffer.name) {
            // If we have requested modes for the active channel then flag it to show
            // the response in the buffer itself. Wait a few seconds before removing
            // the flag as there is no way to determine that everything has been received.
            buffer.flags.requested_modes = true;
            setTimeout(() => {
                buffer.flags.requested_modes = false;
            }, 4000);
        }
    }
};

inputCommands.names = function inputCommandNames(event, command, line) {
    event.handled = true;

    // /names [#channel]

    let network = this.state.getActiveNetwork();
    let args = line;

    if (!args) {
        args = this.state.getActiveBuffer().name;
    }

    network.ircClient.raw('NAMES ' + args);
};

inputCommands.clear = function inputCommandClear(event, command, line) {
    event.handled = true;

    let buffer = this.state.getActiveBuffer();
    let messages = buffer.getMessages();
    messages.splice(0, messages.length);

    this.state.addMessage(buffer, {
        nick: '*',
        message: 'Scrollback cleared',
    });
};

inputCommands.echo = function inputCommandEcho(event, command, line) {
    event.handled = true;

    let buffer = this.state.getActiveBuffer();

    this.state.addMessage(buffer, {
        nick: '*',
        message: line,
    });
};

inputCommands.set = function inputCommandEcho(event, command, line) {
    event.handled = true;

    let buffer = this.state.getActiveBuffer();

    let setting = '';
    let spacePos = line.indexOf(' ');

    if (spacePos > -1) {
        // Anything after the space becomes the new setting value
        // false = boolean false
        // true = boolean true
        // off = boolean false
        // on = boolean true
        // "false" = string false
        // "true" = string true
        setting = line.substr(0, spacePos);
        let value = line.substr(spacePos + 1).trim();
        switch (value.toLowerCase().trim()) {
        case 'true':
        case 'on':
            value = true;
            break;
        case 'false':
        case 'off':
            value = false;
            break;
        default:
        }

        // Unquote any quoted values
        // ie.  "true" should jsut be the string true
        if (value[0] === '"' && value[value.length - 1] === '"') {
            value = value.substr(1, value.length - 2);
        }

        this.state.setting(setting, value);
    } else {
        setting = line;
    }

    this.state.addMessage(buffer, {
        nick: '*',
        message: `${setting} = ${this.state.setting(setting)}`,
    });
};

inputCommands.list = function inputCommandList(event, command, line) {
    event.handled = true;

    let network = this.state.getActiveNetwork();
    if (!network.channel_list.length && network.channel_list_state !== 'updating') {
        network.channel_list_state = 'updating';
        network.ircClient.raw('LIST');
    }

    network.showServerBuffer('channels');
};

inputCommands.server = function inputCommandServer(event, command, line) {
    event.handled = true;

    let parts = line.split(' ');
    let serverAddr = parts[0];
    let serverPort = parts[1] || 6667;
    let serverTls = false;
    let serverPassword = parts[2];
    let nick = parts[3] || 'ircuser';

    if (serverPort[0] === '+') {
        serverTls = true;
        serverPort = parseInt(serverPort.substr(1), 10);
    } else {
        serverTls = false;
        serverPort = parseInt(serverPort, 10);
    }

    this.state.addNetwork(serverAddr, nick, {
        server: serverAddr,
        port: serverPort,
        tls: serverTls,
        password: serverPassword,
    });
};

inputCommands.beep = function inputCommandBeep(event, command, line) {
    this.state.$emit('audio.bleep');
};

inputCommands.notify = function inputCommandNotify(event, command, line) {
    this.state.$emit('notification.show', line);
};

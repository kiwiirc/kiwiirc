import _ from 'lodash';
import AliasRewriter from './AliasRewriter';
import * as Misc from '@/helpers/Misc';

// Map of commandName=commandHandlerFn
const inputCommands = {};

export default class InputHandler {
    constructor(state) {
        this.state = state;
        this.aliasRewriter = new AliasRewriter();

        // Load the aliases from general settings
        this.aliasRewriter.importFromString(state.setting('aliases'));

        // Only watch the user setting changes in order to reload them
        state.$watch('user_settings.aliases', newVal => {
            this.aliasRewriter.importFromString(state.setting('aliases'));
        });

        this.addInputCommands();
        this.listenForInput();
    }


    listenForInput() {
        this.state.$on('input.raw', (input) => {
            let lines = input.split('\n');
            lines.forEach(line => this.processLine(line));
        });
    }


    processLine(rawLine) {
        let line = rawLine;
        let activeNetwork = this.state.getActiveNetwork();
        let activeBuffer = this.state.getActiveBuffer();

        // If no command specified, server buffers = send raw, channels/queries = send message
        let escapedCommand = line.substr(0, 2) === '//';
        if (line[0] !== '/' || escapedCommand) {
            if (escapedCommand) {
                line = line.substr(1);
            }

            if (activeBuffer.isServer()) {
                line = '/quote ' + line;
            } else {
                line = '/msg ' + activeBuffer.name + ' ' + line;
            }
        }

        let aliasVars = {
            server: activeNetwork.name,
            channel: activeNetwork.isChannelName(activeBuffer.name) ? activeBuffer.name : '',
            query: activeNetwork.isChannelName(activeBuffer.name) ? '' : activeBuffer.name,
            destination: activeBuffer.name,
            nick: activeNetwork.nick,
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

        // Include command and params as their own arguments just for ease of use
        this.state.$emit('input.command.' + command, eventObj, command, params);

        if (!eventObj.handled) {
            activeNetwork.ircClient.raw(line);
        }
    }


    addInputCommands() {
        _.each(inputCommands, (fn, event) => {
            this.state.$on('input.command.' + event, fn.bind(this));
        });
    }
}


/**
 * The actual handler functions for commands. Called in context of the InputHandler instance
 * inputCommand['the /command name'] = function(){};
 */

// /lines allows aliases to send multiple commands, separated by |
inputCommands.lines = function inputCommandLines(event, command, line) {
    event.handled = true;

    line.split('|').forEach(subLine => {
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

    let buffer = this.state.getBufferByName(network.id, bufferName);
    if (buffer) {
        let newMessage = {
            time: Date.now(),
            nick: this.state.getActiveNetwork().nick,
            message: message,
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

    // Only switch to the first channel we join if multiple are being joined
    let hasSwitchedActiveBuffer = false;
    bufferObjs.forEach(bufferObj => {
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

        network.ircClient.part(bufferName);
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

    network.ircClient.whois(parts[0], parts[0], whoisData => {
        let out = [];
        let display = message => {
            if (!message) {
                return;
            }

            out.push(message);
        };
        let formats = {
            account: 'User account: {{account}}',
            server: 'Connected to server {{server}} ({{server_info}})',
            secure: 'Using a secure connection',
            channels: 'Also on channels {{channels}}',
            mask: '{{nick}}!{{user}}@{{host}} ({{real_name}})',
            idle: 'Idle for {{idle}} seconds',
            logon: 'Connected at {{logon}}',
            actualip: 'Real IP: {{actualip}}',
            actualhost: 'Real hostname: {{actualhost}}',

            // The following entries will be ignored from whoisData as display() ignores
            // empty lines.
            nick: '',
            user: '',
            host: '',
            real_name: '',
            server_info: '',
        };

        // Display a select few entries first to keep a consistent order, and then
        // show any extra information at the end
        if (whoisData.account) {
            display(formats.account.replace('{{account}}', whoisData.account));
        }
        if (whoisData.nick) {
            display(
                formats.mask
                    .replace('{{nick}}', whoisData.nick)
                    .replace('{{user}}', whoisData.user)
                    .replace('{{host}}', whoisData.host)
                    .replace('{{real_name}}', whoisData.real_name)
            );
        }
        if (whoisData.server) {
            display(
                formats.server
                    .replace('{{server}}', whoisData.server)
                    .replace('{{server_info}}', whoisData.server_info)
            );
        }
        if (whoisData.secure) {
            display(formats.secure);
        }
        if (whoisData.idle) {
            let idleSeconds = Math.floor(parseInt(whoisData.idle, 10) / 1000);
            display(formats.idle.replace('{{idle}}', idleSeconds));
        }
        if (whoisData.logon) {
            let logonTime = parseInt(whoisData.logon, 10);
            if (!Number.isNaN(logonTime)) {
                let logonDate = new Date(logonTime * 1000);
                display(formats.logon.replace('{{logon}}', logonDate));
            }
        }
        if (whoisData.channels) {
            display(formats.channels.replace('{{channels}}', whoisData.channels));
        }
        if (whoisData.actualip) {
            display(formats.actualip.replace('{{actualip}}', whoisData.actualip));
        }
        if (whoisData.actualhost) {
            display(formats.actualhost.replace('{{actualhost}}', whoisData.actualhost));
        }

        _.each(whoisData, (val, key) => {
            // Only include lines we haven't already used
            if (typeof formats[key] === 'undefined') {
                display(`${key}: ${val}`);
            }
        });

        out.forEach(l => {
            this.state.addMessage(buffer, {
                nick: parts[0],
                message: l,
                type: 'whois',
            });
        });
    });
};


inputCommands.mode = function inputCommandMode(event, command, line) {
    event.handled = true;

    // /mode [target] [+-modes]

    let network = this.state.getActiveNetwork();
    let target = network.nick;

    let parts = _.compact(line.split(' '));

    if (line && line[0] !== '+' && line[0] !== '-') {
        target = parts.shift();
    }

    if (parts[0]) {
        // parts[0] = the mode(s)
        // parts[1] = optional mode arguments
        network.ircClient.mode(target, parts[0], parts[1]);
    } else {
        // No modes specified will request the modes for the target
        network.ircClient.mode(target);
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

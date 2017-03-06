import _ from 'lodash';
import state from './state';
import AliasRewriter from './AliasRewriter';

let aliasRewriter = new AliasRewriter();
aliasRewriter.importFromString(state.user_settings.aliases);

state.$watch('user_settings.aliases', newVal => {
    aliasRewriter.importFromString(newVal);
});

state.$on('input.raw', (input) => {
    let lines = input.split('\n');
    lines.forEach(processLine);
});


function processLine(rawLine) {
    let line = rawLine;
    let activeNetwork = state.getActiveNetwork();
    let activeBuffer = state.getActiveBuffer();

    // If no command specified, server buffers = send raw, channels/queries = send message
    if (line[0] !== '/') {
        if (activeBuffer.isServer()) {
            line = '/quote ' + line;
        } else {
            line = '/msg ' + activeBuffer.name + ' ' + line;
        }
    }

    let aliasVars = {
        server: activeNetwork.name,
        channel: activeBuffer.name,
        destination: activeBuffer.name,
        nick: activeNetwork.nick,
    };
    line = aliasRewriter.process(line, aliasVars);

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
    state.$emit('input.command.' + command, eventObj, command, params);

    if (!eventObj.handled) {
        activeNetwork.ircClient.raw(line);
    }
}


// /lines allows aliases to send multiple commands, separated by |
state.$on('input.command.lines', (event, command, line) => {
    event.handled = true;

    line.split('|').forEach(subLine => {
        processLine(subLine.trim());
    });
});


function handleMessage(type, event, command, line) {
    event.handled = true;

    let spaceIdx = line.indexOf(' ');
    if (spaceIdx === -1) spaceIdx = line.length;

    let bufferName = line.substr(0, spaceIdx);
    let message = line.substr(spaceIdx + 1);

    let network = state.getActiveNetwork();
    let buffer = state.getBufferByName(network.id, bufferName);
    if (buffer) {
        let newMessage = {
            time: Date.now(),
            nick: state.getActiveNetwork().nick,
            message: message,
            type: type,
        };

        state.addMessage(buffer, newMessage);
    }

    let fnNames = {
        msg: 'say',
        action: 'action',
        notice: 'notice',
    };
    let fnName = fnNames[type] || 'say';
    network.ircClient[fnName](bufferName, message);
}

state.$on('input.command.msg', _.partial(handleMessage, 'msg'));
state.$on('input.command.me', _.partial(handleMessage, 'action'));
state.$on('input.command.notice', _.partial(handleMessage, 'notice'));


state.$on('input.command.join', (event, command, line) => {
    event.handled = true;

    let spaceIdx = line.indexOf(' ');
    if (spaceIdx === -1) spaceIdx = line.length;

    let bufferNames = line.substr(0, spaceIdx).split(',');
    let keys = line.substr(spaceIdx + 1).split(',');

    let network = state.getActiveNetwork();

    // Only switch to the first channel we join if multiple are being joined
    let hasSwitchedActiveBuffer = false;
    bufferNames.forEach((bufferName, idx) => {
        let newBuffer = state.addBuffer(network.id, bufferName);

        if (newBuffer && !hasSwitchedActiveBuffer) {
            state.setActiveBuffer(network.id, newBuffer.name);
            hasSwitchedActiveBuffer = true;
        }

        network.ircClient.join(bufferName, keys[idx]);
    });
});


state.$on('input.command.part', (event, command, line) => {
    event.handled = true;

    let network = state.getActiveNetwork();
    let bufferNames = [];
    let message = '';

    if (line === '') {
        // /part
        bufferNames = [state.getActiveBuffer().name];
    } else {
        let lineParts = line.split(' ');
        if (network.isChannelName(lineParts[0])) {
            // /part #channel,#possible_channel possible part message
            bufferNames = _.compact(lineParts[0].split(','));
            message = lineParts.slice(1).join(' ');
        } else {
            // /part possible part message
            bufferNames = [state.getActiveBuffer().name];
            message = line;
        }
    }

    bufferNames.forEach((bufferName) => {
        network.ircClient.part(bufferName, message);
    });
});


state.$on('input.command.close', (event, command, line) => {
    event.handled = true;

    let network = state.getActiveNetwork();
    let bufferNames = _.compact(line.split(/[, ]/));
    if (bufferNames.length === 0) {
        bufferNames = [state.getActiveBuffer().name];
    }

    bufferNames.forEach((bufferName) => {
        let buffer = network.bufferByName(bufferName);
        if (!buffer) {
            return;
        }

        network.ircClient.part(bufferName);
        state.removeBuffer(buffer);
    });
});


state.$on('input.command.query', (event, command, line) => {
    event.handled = true;

    let nicks = line.split(' ');
    let network = state.getActiveNetwork();

    // Only switch to the first buffer we open if multiple are being opened
    let hasSwitchedActiveBuffer = false;
    nicks.forEach((bufferName, idx) => {
        let newBuffer = state.addBuffer(network.id, bufferName);

        if (newBuffer && !hasSwitchedActiveBuffer) {
            state.setActiveBuffer(network.id, newBuffer.name);
            hasSwitchedActiveBuffer = true;
        }
    });
});


state.$on('input.command.nick', (event, command, line) => {
    event.handled = true;

    let spaceIdx = line.indexOf(' ');
    if (spaceIdx === -1) spaceIdx = line.length;

    let newNick = line.substr(0, spaceIdx);
    let network = state.getActiveNetwork();
    network.ircClient.changeNick(newNick);
});


state.$on('input.command.quote', (event, command, line) => {
    event.handled = true;

    let network = state.getActiveNetwork();
    network.ircClient.raw(line);
});


state.$on('input.command.clear', (event, command, line) => {
    event.handled = true;

    let buffer = state.getActiveBuffer();
    let messages = buffer.getMessages();
    messages.splice(0, messages.length);

    state.addMessage(buffer, {
        nick: '*',
        message: 'Scrollback cleared',
    });
});


state.$on('input.command.echo', (event, command, line) => {
    event.handled = true;

    let buffer = state.getActiveBuffer();

    state.addMessage(buffer, {
        nick: '*',
        message: line,
    });
});


state.$on('input.command.server', (event, command, line) => {
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

    state.addNetwork(serverAddr, nick, {
        server: serverAddr,
        port: serverPort,
        tls: serverTls,
        password: serverPassword,
    });
});

import _ from 'lodash';
import state from './state';
import AliasRewriter from './AliasRewriter';

let aliasRewriter = new AliasRewriter();
_.extend(aliasRewriter.aliases, {
    // General aliases
    '/p': '/part $1+',
    '/me': '/action $1+',
    '/j': '/join $1+',
    '/q': '/query $1+',
    '/w': '/whois $1+',
    '/raw': '/quote $1+',
    '/connect': '/server $1+',

    // Op related aliases
    '/op': '/quote mode $channel +o $1+',
    '/deop': '/quote mode $channel -o $1+',
    '/hop': '/quote mode $channel +h $1+',
    '/dehop': '/quote mode $channel -h $1+',
    '/voice': '/quote mode $channel +v $1+',
    '/devoice': '/quote mode $channel -v $1+',
    '/k': '/kick $channel $1+',
    '/ban': '/quote mode $channel +b $1+',
    '/unban': '/quote mode $channel -b $1+',

    // Misc aliases
    '/slap': '/me slaps $1 around a bit with a large trout',
    '/tick': '/msg $channel ✔',
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
    };
    line = aliasRewriter.process(line, aliasVars);

    // Remove the / from the start of the line
    line = line.substr(1);

    let spaceIdx = line.indexOf(' ');
    if (spaceIdx === -1) spaceIdx = line.length;

    let command = line.substr(0, spaceIdx);
    let params = line.substr(spaceIdx + 1);

    state.$emit('input.command.' + command, command, params);
}


state.$on('input.command.msg', (command, line) => {
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
        };

        state.addMessage(buffer, newMessage);
    }

    network.ircClient.say(bufferName, message);
});


state.$on('input.command.join', (command, line) => {
    let spaceIdx = line.indexOf(' ');
    if (spaceIdx === -1) spaceIdx = line.length;

    let bufferNames = line.substr(0, spaceIdx).split(',');
    let keys = line.substr(spaceIdx + 1).split(',');

    let network = state.getActiveNetwork();

    bufferNames.forEach((bufferName, idx) => {
        state.addBuffer(network.id, bufferName);
        console.log('Joining ' + bufferName);
        network.ircClient.join(bufferName, keys[idx]);
    });
});


state.$on('input.command.part', (command, line) => {
    let network = state.getActiveNetwork();
    let bufferNames = _.compact(line.split(','));
    if (bufferNames.length === 0) {
        bufferNames = [state.getActiveBuffer().name];
    }

    bufferNames.forEach((bufferName) => {
        network.ircClient.part(bufferName);
    });
});


state.$on('input.command.nick', (command, line) => {
    let spaceIdx = line.indexOf(' ');
    if (spaceIdx === -1) spaceIdx = line.length;

    let newNick = line.substr(0, spaceIdx);
    let network = state.getActiveNetwork();
    network.ircClient.changeNick(newNick);
});


state.$on('input.command.quote', (command, line) => {
    let network = state.getActiveNetwork();
    network.ircClient.raw(line);
});


state.$on('input.command.server', (command, line) => {
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

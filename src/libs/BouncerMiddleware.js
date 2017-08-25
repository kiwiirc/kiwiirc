export default function bouncerMiddleware() {
    let networks = [];
    let buffers = {};

    return function middleware(client, rawEvents, parsedEvents) {
        addFunctionsToClient(client);
        rawEvents.use(theMiddleware);
    };

    function theMiddleware(command, message, rawLine, client, next) {
        if (command !== 'BOUNCER') {
            next();
            return;
        }

        let params = message.params;
        console.log(command, params);

        if (params[0] === 'listnetworks' && params[1] === 'end') {
            client.emit('bouncer networks', networks);
            networks = [];
        } else if (params[0] === 'listnetworks') {
            let tags = parseTags(params[1]);
            networks.push({
                name: tags.network,
                host: tags.host,
                port: parseInt(tags.port, 10),
                tls: tags.tls === '1',
                connect: tags.state === 'connected',
                nick: tags.nick,
                currentNick: tags.currentNick,
            });
        } else if (params[0] === 'listbuffers' && params[2] === 'end') {
            let netName = (params[1] || '').toLowerCase();
            let detectedBuffers = buffers[netName] || [];
            delete buffers[netName];

            client.emit('bouncer buffers', detectedBuffers);
            client.emit('bouncer buffers ' + netName, detectedBuffers);
        } else if (params[0] === 'listbuffers') {
            let netName = (params[1] || '').toLowerCase();
            let tags = parseTags(params[2]);
            buffers[netName] = buffers[netName] || [];
            buffers[netName].push({
                network: tags.network,
                name: tags.buffer,
                topic: tags.topic,
                joined: tags.joined === '1',
            });
        }

        if (params[0] === 'addnetwork' && params[2].substr(0, 4) === 'ERR_') {
            client.emit('bouncer addnetwork error', {
                error: params[1],
                reason: params[2],
            });
        } else if (params[0] === 'addnetwork' && params[2] === 'RPL_OK') {
            client.emit('bouncer addnetwork ok', {
                network: params[2],
            });
        }

        next();
    }
}


function addFunctionsToClient(client) {
    let bnc = client.bnc = {};

    bnc.getNetworks = function getNetworks() {
        return new Promise((resolve, reject) => {
            client.raw('BOUNCER listnetworks');
            client.once('bouncer networks', networks => {
                resolve(networks);
            });
        });
    };

    bnc.getBuffers = function getBuffers(netName) {
        return new Promise((resolve, reject) => {
            client.raw('BOUNCER listbuffers ' + netName);
            console.log('listening for', 'bouncer buffers ' + netName.toLowerCase());
            client.once('bouncer buffers ' + netName.toLowerCase(), buffers => {
                console.log('resolving buffers', netName);
                resolve(buffers);
            });
        });
    };

    bnc.addNetwork = function addNetwork(netName, host, port, tls, nick, user) {
        let tags = {};
        tags.network = netName;
        tags.host = host;
        tags.port = port;
        tags.tls = tls ? 1 : 0;
        tags.nick = nick;
        tags.user = user;

        let tagParts = [];
        for (let tag in tags) {
            if (tags.hasOwnProperty(tag)) {
                tagParts.push(tag + '=' + tags[tag]);
            }
        }

        let tagString = tagParts.join(';');

        return new Promise((resolve, reject) => {
            client.raw('BOUNCER addnetwork ' + tagString);
            client.on('bouncer addnetwork ok', onOk);
            client.on('bouncer addnetwork error', onError);

            function onOk(event) {
                resolve();
            }
            function onError(event) {
                reject({
                    error: event.error,
                    reason: event.reason,
                });
            }
        });
    };
}


function parseTags(tagString) {
    let tags = Object.create(null);
    (tagString || '').split(';').forEach(tag => {
        let parts = tag.replace('\\s', ' ')
            .replace('\\:', ';')
            .split('=');

        tags[parts[0]] = parts[1] || null;
    });

    return tags;
}

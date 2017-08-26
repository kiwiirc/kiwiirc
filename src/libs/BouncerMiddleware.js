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
            let netName = (params[1] || '').toLowerCase();
            let eventObj = {
                error: params[2],
                reason: params[3] || '',
            };
            client.emit('bouncer addnetwork error', eventObj);
            client.emit('bouncer addnetwork error ' + netName, eventObj);
        } else if (params[0] === 'addnetwork' && params[2] === 'RPL_OK') {
            let netName = (params[1] || '').toLowerCase();
            let eventObj = {
                network: params[2],
            };
            client.emit('bouncer addnetwork ok', eventObj);
            client.emit('bouncer addnetwork ok ' + netName, eventObj);
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
            client.once('bouncer buffers ' + netName.toLowerCase(), buffers => {
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

        if (user) {
            tags.user = user;
        }

        let tagString = createTagString(tags);
        return new Promise((resolve, reject) => {
            client.raw('BOUNCER addnetwork ' + tagString);
            client.once('bouncer addnetwork ok', onOk);
            client.once('bouncer addnetwork error', onError);

            function onOk(event) {
                client.off('bouncer addnetwork error', onError);
                resolve();
            }
            function onError(event) {
                client.off('bouncer addnetwork ok', onOk);
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

function createTagString(tags) {
    let tagParts = [];

    for (let tag in tags) {
        if (tags.hasOwnProperty(tag)) {
            let val = tags[tag];
            if (typeof val !== 'undefined') {
                val = val.toString()
                    .replace(' ', '\\s')
                    .replace(';', '\\:');
                tagParts.push(tag + '=' + val);
            } else {
                tagParts.push(tag);
            }
        }
    }

    return tagParts.join(';');
}

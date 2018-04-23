import _ from 'lodash';

// "#chan,#chan2" => 2 channels without a key
// "#chan,#chan2 key" => 2 channels, the first having a key
// "#chan,#chan2 key1,key2" => 2 channels, both having a key
// "#chan,#chan2 ,key2" => 2 channels, the second having a key
export function extractBuffers(str) {
    let spaceIdx = str.indexOf(' ');
    if (spaceIdx === -1) spaceIdx = str.length;

    let bufferNames = str.substr(0, spaceIdx).split(',');
    let keys = str.substr(spaceIdx + 1).split(',');

    let buffers = [];
    bufferNames.forEach((bufferName, idx) => {
        buffers.push({
            name: bufferName,
            key: keys[idx] || '',
        });
    });

    return buffers;
}

export function splitHost(uri) {

}

// Does a string mention a nickname
export function mentionsNick(input, nick) {
    let punc = ',.!:;-+)]?¿\\/<>@';

    let idx = input.toLowerCase().indexOf(nick.toLowerCase());
    if (idx === -1) {
        return false;
    }

    let startIdx = input.lastIndexOf(' ', idx);
    if (startIdx === -1) {
        startIdx = 0;
    } else {
        startIdx++;
    }

    let endIdx = input.indexOf(' ', idx);
    if (endIdx === -1) {
        endIdx = input.length;
    }

    let segment = input.substring(startIdx, endIdx);
    let potentialNick = _.trim(segment, punc);

    return potentialNick.toLowerCase() === nick.toLowerCase();
}

// Get a users prefix symbol on a buffer from its modes
export function userModePrefix(user, buffer) {
    // The user may not be on the buffer
    if (!user.buffers[buffer.id]) {
        return '';
    }

    let modes = user.buffers[buffer.id].modes;
    if (modes.length === 0) {
        return '';
    }

    let network = buffer.getNetwork();
    let netPrefixes = network.ircClient.network.options.PREFIX;
    // Find the first (highest) netPrefix in the users buffer modes
    let prefix = _.find(netPrefixes, p => modes.indexOf(p.mode) > -1);

    return prefix ?
        prefix.symbol :
        '';
}

// Get a users mode on a buffer
export function userMode(user, buffer) {
    // The user may not be on the buffer
    if (!user.buffers[buffer.id]) {
        return '';
    }

    let modes = user.buffers[buffer.id].modes;
    if (modes.length === 0) {
        return '';
    }

    let network = buffer.getNetwork();
    let netPrefixes = network.ircClient.network.options.PREFIX;
    // Find the first (highest) netPrefix in the users buffer modes
    let prefix = _.find(netPrefixes, p => modes.indexOf(p.mode) > -1);

    return prefix ?
        prefix.mode :
        '';
}

// Get a query string value from the current URL
export function queryStringVal(_name, _url) {
    let url = _url || window.location.href;
    let name = _.escapeRegExp(_name);
    let regex = new RegExp('[?&]' + name + '(=([^&#]*)|&|#|$)');
    let results = regex.exec(url);

    if (!results) {
        return null;
    }
    if (!results[2]) {
        return '';
    }

    return decodeURIComponent(results[2].replace(/\+/g, ' '));
}

// Convert a known error code to a human readable message
export function networkErrorMessage(err) {
    let errs = {
        err_unknown_host: 'Unknown domain name or host',
        err_forbidden: 'Forbidden to connect',
        err_timeout: 'Took too long to connect',
        err_refused: 'The server refused the connection',
        err_tls: 'Could not connect securely',
        err_proxy: 'The Kiwi IRC server had an error',
    };

    return errs[err] || 'Unknown error';
}

export function parseIrcUri(str) {
    // [ircs?://]irc.network.net:[+]6667/channel?nick=mynick;
    // Parse connection string such as this ^ into an object. Multiple connections
    // may be given, separated by ;
    let reg = /(?:(ircs?):\/\/)?([a-z.0-9]+)(?::(?:(\+)?([0-9]+)))?(?:\/([^?]*))?(?:\?(.*))?/;
    let connections = [];
    str.split(';').forEach((connectionString) => {
        if (!connectionString) {
            return;
        }

        let m = connectionString.match(reg);

        if (!m) {
            return;
        }

        let tls = m[1] === 'ircs' || !!m[3];
        let params = Object.create(null);
        (m[6] || '').split('&').forEach((p) => {
            let parts = p.split('=');
            if (parts.length === 2) {
                params[parts[0].toLowerCase()] = parts[1];
            }
        });

        let channels = (m[5] || params.channel || '');
        channels = _(channels.split(','))
            .compact()
            .map((_channelName) => {
                let hasPrefix = _channelName[0] === '#' ||
                    _channelName[0] === '&';

                let channelName = hasPrefix ?
                    _channelName :
                    '#' + _channelName;

                return channelName;
            });

        connections.push({
            tls: tls,
            server: m[2],
            port: parseInt(m[4] || (tls ? 6697 : 6667), 10),
            channels: channels,
            nick: params.nick || '',
            encoding: (params.encoding || 'utf8'),
            params: params,
        });
    });

    return connections;
}

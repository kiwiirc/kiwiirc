'kiwi public';

/** @module */

import _ from 'lodash';
import strftime from 'strftime';
import { urlRegex } from './TextFormatting';

const strftimeUTC = strftime.timezone('+0');
/**
 * Extract an array of buffers from a string, parsing multiple buffer names and channel keys
 * "#chan,#chan2" => 2 channels without a key
 * "#chan,#chan2 key" => 2 channels, the first having a key
 * "#chan,#chan2 key1,key2" => 2 channels, both having a key
 * "#chan,#chan2 ,key2" => 2 channels, the second having a key
 * @param {string} str List of buffer names and channel keys
 */
export function extractBuffers(str) {
    let spaceIdx = str.indexOf(' ');
    if (spaceIdx === -1) spaceIdx = str.length;

    let bufferNames = str.substr(0, spaceIdx).split(',');
    let keys = str.substr(spaceIdx + 1).split(',');

    let buffers = [];
    bufferNames.forEach((bufferName, idx) => {
        // return if bufferName is empty
        if (!bufferName.trim()) {
            return;
        }
        buffers.push({
            name: bufferName,
            key: keys[idx] || '',
        });
    });

    return buffers;
}

export function extractURL(str) {
    let matches = str.match(urlRegex);
    return matches ? matches[0] : '';
}

export function splitHost(uri) {

}

export function stripStyles(str) {
    return str.replace(/(\x03[0-9]{0,2})?([\x02\x16\x1d\x1f]+)?/g, '');
}

/**
 * Does a string mention a nickname?
 * @param {string} input The string to search within
 * @param {string} nick The nick to search for
 */
export function mentionsNick(input, nick) {
    if (input.toLowerCase().indexOf(nick.toLowerCase()) === -1) {
        return false;
    }
    let punc = '\\s,.!:;+()\\[\\]?¿\\/<>@-';
    let escapedNick = _.escapeRegExp(nick);
    let stylesStrippedInput = stripStyles(input);
    let r = new RegExp(`(^|[${punc}])${escapedNick}([${punc}]|$)`, 'i');
    return r.test(stylesStrippedInput);
}

/**
 * Get a query string value from the current URL
 * @param {string} _name The query string variable name
 * @param {string} _url The full URL to extract the variable from
 */
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

/**
 * Convert a known error code to a human readable message
 * @param {string} err The error message from the network connection
 */
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

/**
 * Parse a connection string into an object
 * E.g. [ircs?://]irc.network.net:[+]6667/channel?nick=mynick;
 * Multiple connections may be given, separated by ;
 * @param {string} str The connection string URI
 */
export function parseIrcUri(str) {
    let reg = /(?:(ircs?):\/\/)?([a-z.0-9-]+)(?::(?:(\+)?([0-9]+)))?(?:\/([^?]*))?(?:\?(.*))?/;
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

/**
 * Scan though an object and extend any dot notated keys
 * @param {Object} confObj Source object to traverse
 */
export function dedotObject(confObj, _place) {
    let place = _place || [];
    let regex = /\w\.\w/;

    _.each(confObj, (val, key) => {
        let ourPlace = place.concat([key]);
        if (typeof val === 'object') {
            dedotObject(confObj[key], ourPlace);
            return;
        }
        if (regex.test(key)) {
            delete confObj[key];
            _.set(confObj, ourPlace.join('.'), val);
        }
    });
}

/**
 * Replace the target object with source, while keeping the target object reference intact.
 * Delete all the properties from the target object and copy the properties from source
 * over to the target.
 * a = {one: 1, two: 2, three: 3}
 * b = {four: 4, five: 5, six: 6}
 * replaceObjectProps(a, b)
 * a.one === undefined;
 * a.six === 6;
 * @param {Object} target The target object that will be replaced
 * @param {Object} source The source object from which all properties will be copied from
 */
export function replaceObjectProps(target, source) {
    Object.keys(target).forEach((prop) => delete target[prop]);
    Object.keys(source).forEach((prop) => { target[prop] = source[prop]; });
}

/**
 * Create an ISO8601 formatted date
 * @param {Date} date The date object to create the time from. Defaults to the current time
 */
export function dateIso(date) {
    let d = date || new Date();
    return strftimeUTC('%Y-%m-%dT%H:%M:%S.%LZ', d);
}

'kiwi public';

/** @module */

import _ from 'lodash';
import Vue from 'vue';
import strftime from 'strftime';
import PluginWrapper from '@/components/utils/PluginWrapper';
import * as TextFormatting from '@/helpers/TextFormatting';
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
    const translationKey = err.replace(/^err_/, 'error_');
    const translation = TextFormatting.t(translationKey);
    if (translation === translationKey) {
        return TextFormatting.t('error_unknown');
    }

    return translation;
}

/**
 * Take a users connection object (usually from startupOptions) and normalise a connection
 * settings object. Parses websocket/direct/kiwiServer/etc options and creates a single
 * object that Kiwi can consistently read from.
 * @param {Object} config User provided connection config object
 */
export function connectionInfoFromConfig(config) {
    let connection = {
        tls: false,
        port: 0,
        hostname: '',
        direct: false,
        direct_path: '',
    };

    let wsUri = config.websocket ?
        matchUri(config.websocket) :
        null;

    if (wsUri) {
        connection.direct = true;
        connection.tls = ['wss', 'https', 'ircs'].indexOf(wsUri.protocol) > -1;
        connection.port = wsUri.port;
        connection.hostname = wsUri.hostname;
        connection.direct_path = wsUri.path;
        if (wsUri.search) {
            connection.direct_path += '?' + wsUri.search;
        }
    } else {
        connection.tls = config.tls;
        connection.port = config.port;
        connection.hostname = config.server;
        connection.direct = !!config.direct;
        connection.direct_path = config.direct_path || '';
    }

    return connection;
}

export function matchUri(uri) {
    let reg = /(?:([a-z]+):\/\/)?([a-z.0-9-]+)(?::(?:(\+)?([0-9]+)))?(?:\/([^?]*))?(?:\?(.*))?/;
    /*
    0: "ws://hostname.com:6676/erferf?foo=val"
    1: "ws"
    2: "hostname.com"
    3: undefined
    4: "6676"
    5: "erferf"
    6: "foo=var"
    */
    let m = uri.match(reg);
    if (!m) {
        return null;
    }

    return {
        protocol: (m[1] || '').toLowerCase(),
        hostname: m[2] || '',
        port: parseIntZero(m[4] || ''),
        path: '/' + (m[5] || ''),
        search: m[6] || '',
    };
}

/**
 * Parse a connection string into an object
 * E.g. [ircs?://]irc.network.net:[+]6667/channel?nick=mynick;
 * Multiple connections may be given, separated by ;
 * @param {string} str The connection string URI
 */
export function parseIrcUri(str) {
    let reg = /(?:(ircs?|wss?):\/\/)?([a-z.0-9-]+)(?::(?:(\+)?([0-9]+)))?(?:\/([^?]*))?(?:\?(.*))?/;
    let connections = [];
    str.split(';').forEach((connectionString) => {
        if (!connectionString) {
            return;
        }

        let m = connectionString.match(reg);

        if (!m) {
            return;
        }

        let tls = m[1] === 'ircs' || m[1] === 'wss' || !!m[3];
        let direct = m[1] === 'ws' || m[1] === 'wss';
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
            direct: direct,
        });
    });

    return connections;
}

/**
 * Parse preset server string to an object
 * format: freenode|irc.freenode.net:+6697
 * @param {string} input Preset server string
 */
export function parsePresetServer(input) {
    let ret = {
        name: '',
        server: '',
        port: 6667,
        tls: false,
    };

    ret.toUri = () => `${ret.server}:${ret.tls ? '+' : ''}${ret.port}`;

    let val = input;

    let pipePos = val.indexOf('|');
    if (pipePos > -1) {
        ret.name = val.substr(0, pipePos);
        val = val.substr(pipePos + 1);
    }

    let colonPos = val.indexOf(':');
    if (colonPos === -1) {
        ret.server = val;
        val = '';
    } else {
        ret.server = val.substr(0, colonPos);
        val = val.substr(colonPos + 1);
    }

    if (val[0] === '+') {
        ret.tls = true;
        val = val.substr(1);
    }

    if (val.length > 0) {
        ret.port = parseInt(val, 10);
        val = '';
    }

    if (!ret.name) {
        ret.name = ret.server;
    }

    return ret;
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

/**
 * Cast a string to an int, returning 0 if it fails
 * @param {String} inp The number as a string to convert to an int
 */
export function parseIntZero(inp) {
    let int = parseInt(inp, 10);
    return Number.isNaN(int) ?
        0 :
        int;
}

/**
 * Prepare plugin provided object, for use as a plugin component
 * @param {Number} pluginId The number to identify this plugin object
 * @param {Component} componentOrElement The vue.js component object or html element
 * @param {Object} args Optional arguments for this plugin { title: '', props: {} }
 */
export function makePluginObject(pluginId, componentOrElement, args = {}) {
    const plugin = {
        id: pluginId,
        component: null,
        title: () => '',
        props: {},
        tabName: '',
    };

    // copy props from args
    plugin.props = Object.assign(plugin.props, args.props);
    plugin.tabName = args.tabName || args.title || 'plugin_tab_' + pluginId;

    if (componentOrElement instanceof Element) {
        // componentOrElement is an html element, so wrap it in a functional component

        // eslint-disable-next-line no-underscore-dangle
        if (componentOrElement.__vue__ && !window.kiwi_deprecations_vueEl) {
            window.kiwi_deprecations_vueEl = true;
            // eslint-disable-next-line no-console
            console.warn('deprecated component.$el added to plugin api, please switch to just passing the vue.js component object');
        }
        plugin.component = PluginWrapper;
        plugin.props = Object.assign(plugin.props, {
            pluginElement: componentOrElement,
        });
    } else if (componentOrElement instanceof Object) {
        // componentOrElement is an object, attempt to make a vue component from it
        plugin.component = Vue.extend(componentOrElement);
    } else {
        plugin.component = componentOrElement;
    }

    if (typeof args.title === 'string') {
        // if args.title exists wrap it in a function, that can also be a translation string
        plugin.title = () => (args.title.slice(0, 2) === 't_' ? TextFormatting.t(args.title.slice(2)) : args.title);
    }

    return plugin;
}

/**
 * Check for trailing close bracket and return true if no matching open bracket is found
 * @param {String} str The string to check for trailing brackets
 * @returns {Boolean}  Boolean true when trailing bracket and no matching open bracket
 */
export function hasUnmatchedTrailingBracket(str) {
    const brackets = [
        { o: '(', c: ')' },
        { o: '[', c: ']' },
        { o: '{', c: '}' },
    ];

    const type = brackets.find((t) => t.c === str[str.length - 1]);
    if (!type) {
        return false;
    }

    let unmatched = 0;
    for (let i = str.length - 1; i >= 0; i--) {
        if (str[i] === type.c) {
            unmatched++;
        } else if (str[i] === type.o) {
            unmatched--;
        }
    }

    return (unmatched === 1);
}

// This provides a better sort for numbered nicks but does not work on ios9
let intlCollator;
if (global.Intl) {
    intlCollator = new Intl.Collator({}, { numeric: true });
}

export function strCompare(a, b) {
    if (intlCollator) {
        return intlCollator.compare(a, b);
    }

    if (a === b) {
        return 0;
    }

    return a > b ?
        1 :
        -1;
}

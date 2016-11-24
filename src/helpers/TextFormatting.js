import _ from 'lodash';
import * as Colours from './Colours';
import { md5 } from './Md5';

/**
 *   Formats a message. Adds bold, underline and colouring
 *   @param      {String}    msg The message to format
 *   @returns    {String}        The HTML formatted message
 */
const colourMatchRegexp = /^\x03(([0-9][0-9]?)(,([0-9][0-9]?))?)/;
export function ircCodesToHtml(msg) {
    function spanFromOpen() {
        let style = '';
        let colours;
        let classes = [];
        let result = '';

        if (openTags.bold || openTags.italic || openTags.underline || openTags.colour) {
            style += (openTags.bold) ? 'font-weight: bold; ' : '';
            style += (openTags.italic) ? 'font-style: italic; ' : '';
            style += (openTags.underline) ? 'text-decoration: underline; ' : '';
            if (openTags.colour) {
                colours = openTags.colour.split(',');
                classes.push(colours[0]);
                if (colours[1]) {
                    classes.push(colours[1]);
                }
            }
            result = '<span class="' + classes.join(' ') + '" style="' + style + '">';
        }

        return result;
    }
    function colourMatch(str) {
        return colourMatchRegexp.exec(str);
    }
    function colourFromNum(num) {
        switch (parseInt(num, 10)) {
        case 0:
            return 'white';
        case 1:
            return 'black';
        case 2:
            return 'blue';
        case 3:
            return 'green';
        case 4:
            return 'light-red';
        case 5:
            return 'brown';
        case 6:
            return 'purple';
        case 7:
            return 'orange';
        case 8:
            return 'yellow';
        case 9:
            return 'light-green';
        case 10:
            return 'cyan';
        case 11:
            return 'light-cyan';
        case 12:
            return 'light-blue';
        case 13:
            return 'pink';
        case 14:
            return 'grey';
        case 15:
            return 'light-grey';
        default:
            return null;
        }
    }

    let out = '';
    let currentTag = '';
    let openTags = {
        bold: false,
        italic: false,
        underline: false,
        colour: false,
    };
    let i = 0;
    let colours = [];
    let match = null;

    for (i = 0; i < msg.length; i++) {
        switch (msg[i]) {
        case '\x02':
            if ((openTags.bold || openTags.italic || openTags.underline || openTags.colour)) {
                out += currentTag + '</span>';
            }
            openTags.bold = !openTags.bold;
            currentTag = spanFromOpen();
            break;
        case '\x1D':
            if ((openTags.bold || openTags.italic || openTags.underline || openTags.colour)) {
                out += currentTag + '</span>';
            }
            openTags.italic = !openTags.italic;
            currentTag = spanFromOpen();
            break;
        case '\x1F':
            if ((openTags.bold || openTags.italic || openTags.underline || openTags.colour)) {
                out += currentTag + '</span>';
            }
            openTags.underline = !openTags.underline;
            currentTag = spanFromOpen();
            break;
        case '\x03':
            if ((openTags.bold || openTags.italic || openTags.underline || openTags.colour)) {
                out += currentTag + '</span>';
            }
            match = colourMatch(msg.substr(i, 6));
            if (match) {
                i += match[1].length;
                // 2 & 4
                colours[0] = 'irc-fg-colour-' + colourFromNum(match[2]);
                if (match[4]) {
                    colours[1] = 'irc-bg-colour-' + colourFromNum(match[4]);
                }
                openTags.colour = colours.join(',');
            } else {
                openTags.colour = false;
            }
            currentTag = spanFromOpen();
            break;
        case '\x0F':
            if ((openTags.bold || openTags.italic || openTags.underline || openTags.colour)) {
                out += currentTag + '</span>';
            }
            openTags.bold = openTags.italic = openTags.underline = openTags.colour = false;
            break;
        default:
            if ((openTags.bold || openTags.italic || openTags.underline || openTags.colour)) {
                currentTag += msg[i];
            } else {
                out += msg[i];
            }
            break;
        }
    }

    if ((openTags.bold || openTags.italic || openTags.underline || openTags.colour)) {
        out += currentTag + '</span>';
    }

    return out;
}

const urlRegex = new RegExp('' +
    // Detect either a protocol or 'www.' to start a URL
    /(([A-Za-z][A-Za-z0-9\-]*:\/\/)|(www\.))/.source +
    // The hostname..
    /([\w\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF.\-]+)/.source +
    // The hostname must end in 2-6 alpha characters (the TLD)
    /([a-zA-Z]{2,6})/.source +
    // Optional port..
    /(:[0-9]+)?/.source +
    // Optional path..
    /(\/[\w\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF!:.?$'()[\]*,;~+=&%@!\-\/]*)?/.source +
    // Optional fragment
    /(#.*)?/.source,
    'ig'
);

export function linkifyUrls(input) {
    let result = input.replace(urlRegex, _url => {
        let url = _url;
        let nice = url;

        // Don't allow javascript execution
        if (url.match(/^javascript:/i)) {
            return url;
        }

        // Add the http if no protoocol was found
        if (url.match(/^www\./i)) {
            url = 'http://' + url;
        }

        // Shorten the displayed URL if it's going to be too long
        if (nice.length > 100) {
            nice = nice.substr(0, 100) + '...';
        }

        // Make the link clickable
        return `<a target="_blank" href="${url.replace(/"/g, '%22')}">${_.escape(nice)}</a>`;
    });

    return result;
}

export function linkifyChannels(input) {
    return input.replace(/(^|\s)([#&][^ .,\007<>]+)/ig, _channel => {
        let channelName = _channel.trim();
        return `<a class="u-link kiwi-channel" data-channel-name="${_.escape(channelName)}">` +
            _.escape(_channel) +
        '</a>';
    });
}

/**
 * Convert a nickname string to a colour code
 */
let nickColourCache = Object.create(null);
export function createNickColour(nick) {
    if (nickColourCache[nick]) {
        return nickColourCache[nick];
    }

    // The HSL properties are based on this specific colour
    let startingColour = '#36809B'; // '#449fc1';

    let hash = md5(nick);
    let hueOffset = mapRange(hexVal(hash, 14, 3), 0, 4095, 0, 359);
    let satOffset = hexVal(hash, 17);
    let baseColour = Colours.rgb2hsl(Colours.hex2rgb(startingColour));
    baseColour.h = (((baseColour.h * 360 - hueOffset) + 360) % 360) / 360;

    if (satOffset % 2 === 0) {
        baseColour.s = Math.min(1, ((baseColour.s * 100) + satOffset) / 100);
    } else {
        baseColour.s = Math.max(0, ((baseColour.s * 100) - satOffset) / 100);
    }

    let rgb = Colours.hsl2rgb(baseColour);
    let nickColour = Colours.rgb2hex(rgb);

    nickColourCache[nick] = nickColour;

    return nickColour;
}

/**
 * Extract a substring from a hex string and parse it as an integer
 * @param {string} hash - Source hex string
 * @param {number} index - Start index of substring
 * @param {number} [length] - Length of substring. Defaults to 1.
 */
export function hexVal(hash, index, len) {
    return parseInt(hash.substr(index, len || 1), 16);
}

/*
 * Re-maps a number from one range to another
 * http://processing.org/reference/map_.html
 */
export function mapRange(value, vMin, vMax, dMin, dMax) {
    let vValue = parseFloat(value);
    let vRange = vMax - vMin;
    let dRange = dMax - dMin;

    return (vValue - vMin) * dRange / vRange + dMin;
}

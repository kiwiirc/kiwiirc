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

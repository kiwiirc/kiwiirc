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

import eventEmitter from 'event-emitter';

export default class NetworkProviderZnc {
    constructor(state) {
        eventEmitter(this);

        this.type = 'znc';
        this.state = state;
        this.networks = [];
        this.currentTable = null;
    }

    enumNetworks(network) {
        return this.getCommandOutput('listnetworks', network)
            .then(output => {
                this.networks = (output.data || []).map(zncNet => {
                    // Use the same password as this current ZNC connection but replace
                    // the network name
                    let password = network.connection.password;
                    password = password.replace(/(\/[^/]*)?:/, `/${zncNet.name}:`);

                    return {
                        name: zncNet.name,
                        server: network.connection.server,
                        port: network.connection.port,
                        tls: network.connection.tls,
                        password: password,
                        nick: network.nick,
                        connected: zncNet.connected,
                    };
                });

                if (this.networks.length) {
                    this.emit('networks', this.networks);
                }

                return this.networks;
            });
    }

    autoDetectZncNetworks() {
        this.state.$on('irc:raw', (command, event, network) => {
            let isZnc = event.prefix && event.prefix.indexOf('irc.znc.in') > -1;
            if (isZnc && !network.is_znc) {
                network.is_znc = true;
            }
        });

        this.state.$on('irc:registered', (event, network) => {
            if (network.is_znc) {
                this.enumNetworks(network);
            }
        });
    }

    getCommandOutput(command, network) {
        return new Promise((resolve, reject) => {
            let capture = this.lineCapture();
            capture.on('line', line => {
                // ZNC tables start with + on the first line
                if (!this.currentTable && line[0] === '+') {
                    this.currentTable = tableParser(line, onTableResult);
                } else if (this.currentTable) {
                    this.currentTable(line);
                }
            });

            network.ircClient.say('*status', command);
            capture.start();

            function onTableResult(rows, headers) {
                capture.stop();

                let data = parseTableContents(rows, headers);
                if (data.type) {
                    resolve({
                        data: data.data,
                        type: data.type,
                    });
                } else {
                    reject();
                }
            }
        });
    }

    lineCapture() {
        let ee = eventEmitter();
        ee.stop = () => {
            this.state.$off('irc:message', onLine);
            return ee;
        };
        ee.start = () => {
            this.state.$on('irc:message', onLine);
            return ee;
        };

        return ee;

        function onLine(event, network, ircEventObj) {
            let isFromZnc = (event.nick === '*status' && event.ident === 'znc');

            if (isFromZnc) {
                ee.emit('line', event.message);
                ircEventObj.handled = true;
            }
        }
    }
}

// While recieving a table from ZNC *status, parse its messages to extract the headers
// and rows
function tableParser(firstLine, cb) {
    let numSplittersReceived = 0;
    let headers = splitTableRow(firstLine);
    let rows = [];
    let splitter = '';

    function parseTableLine(line) {
        if (!splitter) {
            // Different ZNC versions format the table differently.
            // A splitter (start of table line, end of headers line, end of table line)
            // may be +-- +== or some other combination. We use the fact that they are
            // all the same in a single output and get the format from the first line
            // we process. That is then compared to further lines to detect each section
            // of the table.
            splitter = line.substr(0, 3);
        }

        if (line.substr(0, 3) === splitter) {
            numSplittersReceived++;
        }

        // The closing table row
        if (numSplittersReceived === 3) {
            composeData(cb);
            return;
        }

        if (isDataRow(line)) {
            if (numSplittersReceived === 1) {
                headers = splitTableRow(line);
            } else if (numSplittersReceived === 2) {
                rows.push(splitTableRow(line));
            }
        }
    }

    function composeData() {
        let data = [];
        for (let i = 0; i < rows.length; i++) {
            let row = rows[i];
            let cRow = Object.create(null);
            data.push(cRow);
            for (let j = 0; j < row.length; j++) {
                let colName = headers[j] || '';
                cRow[colName.toLowerCase()] = row[j] || '';
            }
        }

        cb(data, headers);
    }

    parseTableLine(firstLine);
    return parseTableLine;
}

function parseTableContents(data, headers) {
    let ret = {
        type: '',
        data: null,
    };

    let tableType = detectTableTypeFromHeaders(headers);

    if (tableType === 'listnetworks') {
        ret.type = 'listnetworks';
        ret.data = [];

        data.forEach(network => {
            ret.data.push({
                name: network.network,
                connected: network.onirc.toLowerCase() === 'yes',
                server: network['irc server'],
                mask: network['irc user'],
            });
        });
    }

    return ret;
}


function isDataRow(line) {
    return line.substr(0, 2) === '| ';
}
function splitTableRow(line) {
    let parts = line.split('|').map(s => s.trim());
    return parts.slice(1, parts.length - 1);
}
function detectTableTypeFromHeaders(headers) {
    function header(idx) {
        return headers[idx] ?
            headers[idx].toLowerCase() :
            '';
    }

    if (header(0) === 'network') {
        return 'listnetworks';
    }
    if (header(0) === 'name' && header(1) === 'set by') {
        return 'topics';
    }
    return '';
}

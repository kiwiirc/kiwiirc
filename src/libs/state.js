import * as Misc from '@/helpers/Misc';
import Vue from 'vue';
import _ from 'lodash';
import strftime from 'strftime';
import * as IrcClient from './IrcClient';
import Message from './Message';
import batchedAdd from './batchedAdd';

const stateObj = {
    // May be set by a StatePersistence instance
    persistence: null,

    // Settings may be overridden via config.json
    settings: {
        plugins: [],
        windowTitle: 'Kiwi IRC - The web IRC client',
        useMonospace: false,
        messageLayout: 'compact',
        theme: 'Default',
        themes: [
            { name: 'Default', url: 'static/themes/default' },
        ],
        // Restricted to a single IRC server
        restricted: true,
        // The startup screen
        startupScreen: 'customServer',
        // Where to find the kiwi server
        kiwiServer: '/webirc/kiwiirc/',
        // If active, all connections will be routed via this BNC server. Network settings
        // will be read and updated to the BNC as they are changed.
        bnc: {
            active: false,
            server: '',
            port: 6667,
            tls: false,
            username: '',
            password: '',
        },
        warnOnExit: true,
        // Default buffer settings
        buffers: {
            alert_on: 'highlight',
            timestamp_format: '%H:%M:%S',
            show_timestamps: true,
            scrollback_size: 250,
            show_joinparts: true,
            show_topics: true,
            show_nick_changes: true,
            show_mode_changes: true,
            traffic_as_activity: false,
            coloured_nicklist: true,
            colour_nicknames_in_messages: true,
            block_pms: false,
            show_emoticons: true,
            extra_formatting: true,
            mute_sound: false,
            hide_message_counts: false,
            default_ban_mask: '*!%i@%h',
            default_kick_reason: 'Your behavior is not conducive to the desired environment.',
        },
        // Startup screen default
        startupOptions: {
            server: '',
            port: 6667,
            tls: false,
            channel: '',
            nick: 'kiwi_?',
            direct: false,
            state_key: 'kiwi-state',
        },
        showAutocomplete: true,
        aliases: `
# General aliases
/p /part $1+
/me /action $destination $1+
/j /join $1+
/q /query $1+
/w /whois $1+
/raw /quote $1+
/connect /server $1+
/cycle $channel? /lines /part $channel | /join $channel

# Op related aliases
/op /quote mode $channel +o $1+
/deop /quote mode $channel -o $1+
/hop /quote mode $channel +h $1+
/dehop /quote mode $channel -h $1+
/voice /quote mode $channel +v $1+
/devoice /quote mode $channel -v $1+
/k /kick $channel $1+
/ban /quote mode $channel +b $1+
/unban /quote mode $channel -b $1+

# Misc aliases
/slap /me slaps $1 around a bit with a large trout
/tick /msg $channel ✔`,
        embedly: {
            Key: '',
        },
        /* eslint-disable quote-props */
        emojis: {
            '-___-': '1f611',
            ':\'-)': '1f602',
            '\':-)': '1f605',
            '\':-D': '1f605',
            '>:-)': '1f606',
            '\':-(': '1f613',
            '>:-(': '1f620',
            ':\'-(': '1f622',
            'O:-)': '1f607',
            '0:-3': '1f607',
            '0:-)': '1f607',
            '0;^)': '1f607',
            'O;-)': '1f607',
            '0;-)': '1f607',
            'O:-3': '1f607',
            '-__-': '1f611',
            ':-Þ': '1f61b',
            '<3': '2764',
            '</3': '1f494',
            ':\')': '1f602',
            ':-D': '1f603',
            '\':)': '1f605',
            '\'=)': '1f605',
            '\':D': '1f605',
            '\'=D': '1f605',
            '>:)': '1f606',
            '>;)': '1f606',
            '>=)': '1f606',
            'XD': '1f606',
            ';-)': '1f609',
            '*-)': '1f609',
            ';-]': '1f609',
            ';^)': '1f609',
            '\':(': '1f613',
            '\'=(': '1f613',
            ':-*': '1f618',
            ':^*': '1f618',
            '>:P': '1f61c',
            'X-P': '1f61c',
            '>:[': '1f61e',
            ':-(': '1f61e',
            ':-[': '1f61e',
            '>:(': '1f620',
            ':\'(': '1f622',
            ';-(': '1f622',
            '>.<': '1f623',
            '#-)': '1f635',
            '%-)': '1f635',
            'X-)': '1f635',
            '\\0/': '1f646',
            '\\O/': '1f646',
            '0:3': '1f607',
            '0:)': '1f607',
            'O:)': '1f607',
            'O=)': '1f607',
            'O:3': '1f607',
            'B-)': '1f60e',
            '8-)': '1f60e',
            'B-D': '1f60e',
            '8-D': '1f60e',
            '-_-': '1f611',
            '>:\\': '1f615',
            '>:/': '1f615',
            ':-/': '1f615',
            ':-.': '1f615',
            ':-P': '1f61b',
            ':Þ': '1f61b',
            ':-b': '1f61b',
            ':-O': '1f62e',
            'O_O': '1f62e',
            '>:O': '1f62e',
            ':-X': '1f636',
            ':-#': '1f636',
            ':-)': '1f642',
            '(y)': '1f44d',
            ':D': '1f603',
            '=D': '1f603',
            ';)': '1f609',
            '*)': '1f609',
            ';]': '1f609',
            ';D': '1f609',
            ':*': '1f618',
            '=*': '1f618',
            ':(': '1f61e',
            ':[': '1f61e',
            '=(': '1f61e',
            ':@': '1f620',
            ';(': '1f622',
            'D:': '1f628',
            ':$': '1f633',
            '=$': '1f633',
            '#)': '1f635',
            '%)': '1f635',
            'X)': '1f635',
            'B)': '1f60e',
            '8)': '1f60e',
            ':/': '1f615',
            ':\\': '1f615',
            '=/': '1f615',
            '=\\': '1f615',
            ':L': '1f615',
            '=L': '1f615',
            ':P': '1f61b',
            ':p': '1f61b',
            '=P': '1f61b',
            ':b': '1f61b',
            ':O': '1f62e',
            ':X': '1f636',
            ':#': '1f636',
            '=X': '1f636',
            '=#': '1f636',
            ':)': '1f642',
            '=]': '1f642',
            '=)': '1f642',
            ':]': '1f642',
        },
        emojiLocation: 'https://kiwiirc.com/shared/emoji/',
        textFormats: {
            user: '%nick',
            user_full: '%nick (%username@%host)',
            channel_join: '→ %text',
            channel_part: '← %text (%reason)',
            channel_quit: '← %text (%reason)',
            channel_kicked: '← %text',
            channel_selfkick: '× %text (%reason)',
            channel_badpassword: '× %text',
            channel_topic: 'ⓘ %text',
            channel_banned: '× %text',
            channel_badkey: '⚠ %text',
            channel_inviteonly: '⚠ %channel %text',
            channel_alreadyin: '⚠ %nick %text',
            channel_limitreached: '⚠ %channel %text',
            channel_invalid_name: '⚠ %channel %text',
            channel_topic_setby: 'ⓘ %text',
            channel_has_been_invited: 'ⓘ %nick %text',
            server_connecting: '%text',
            server_connecting_error: '%text',
            mode: 'ⓘ %text',
            selfmode: 'ⓘ %nick %text',
            nickname_alreadyinuse: '⚠ %text',
            network_disconnected: '⚠ %text',
            network_connected: '⚠ %text',
            whois_channels: '%text',
            whois_idle_and_signon: '%text',
            whois_away: '%text',
            whois_server: '%text',
            whois_idle: '%text',
            whois_notfound: 'ⓘ %text',
            nick_changed: 'ⓘ %text',
            applet_notfound: '⚠ %text',
            encoding_changed: 'ⓘ %text',
            encoding_invalid: '⚠ %text',
            settings_saved: 'ⓘ %text',
            ignore_title: '%text:',
            ignore_none: '%text',
            ignore_nick: '%text',
            ignore_stop_notice: '%text',
            ignore_stopped: '%text',
            chanop_privs_needed: '⚠ %text',
            no_such_nick: 'ⓘ %nick: %text',
            unknown_command: 'ⓘ %text',
            motd: '%text',
            ctcp_response: '[CTCP %nick reply] %message',
            ctcp_request: '[CTCP %nick] %message',
            privmsg: '%text',
            notice: '%text',
            action: '* %nick %text',
            whois_ident: '%nick [%nick!%ident@%host] * %text',
            whois: '%text',
            who: '%nick [%nick!%ident@%host] * %realname',
            quit: '%text',
            rejoin: '%text',
            set_setting: 'ⓘ %text',
            list_aliases: 'ⓘ %text',
            ignored_pattern: 'ⓘ %text',
            wallops: '[WALLOPS] %text',
            message_nick: '%prefix%nick',
            general_error: '%text',
        },
    },
    user_settings: {
    },
    connection: {
        // disconnected / connecting / connected
        status: 'connected',
        sessionId: '',
    },
    ui: {
        active_network: 0,
        active_buffer: '',
        last_active_buffers: [],
        app_has_focus: true,
        app_width: 0,
        app_height: 0,
        is_touch: false,
        favicon_counter: 0,
    },
    networks: [
        /* {
            id: 1,
            name: 'sumnetwork',
            state: 'disconnected',
            state_error: '',
            connection: {
                server: 'irc.freenode.net',
                port: 6667,
                tls: false,
                password: ''
            },
            nick: 'prawnsalad',
            username: 'prawn',
            settings: { show_raw: false },
            auto_commands: '',
            is_znc: false,
            channel_list: [],
            channel_list_state: '',
            buffers: [
                {
                    id: 0,
                    networkid: 1,
                    name: '#kiwiirc',
                    topic: 'A hand-crafted IRC client',
                    joined: true,
                    flags: { unread: 4, highlight: true },
                    settings: { alert_on: 'all' },
                    users: [ref_to_user_obj],
                },
            ],
            users: {
                prawnsalad: {
                    nick: 'prawnsalad',
                    host: 'isp.net',
                    username: 'prawn',
                    modes: '+ix',
                    buffers: {1: {modes: []}}
                },
            },
        },
        {
            id: 2,
            name: 'snoonet',
            state: 'disconnected',
            connection: {
                server: 'irc.freenode.net',
                port: 6667,
                tls: false,
                password: ''
            },
            nick: 'prawnsalad',
            username: 'prawn',
            buffers: [
                {
                    id: 1
                    networkid: 2,
                    name: '#orangechat',
                    topic: '',
                    joined: false,
                    flags: { unread: 0 },
                    settings: { alert_on: 'all' },
                    users: [ref_to_user_obj],
                },
            ],
            users: {
                prawnsalad: {
                    nick: 'prawnsalad',
                    host: 'isp.net',
                    username: 'prawn',
                    modes: '+ix',
                    buffers: {1: {modes: []}},
                },
                someone: {
                    nick: 'someone',
                    host: 'masked.com',
                    username: 'someirc',
                    modes: '+ix',
                    buffers: {1: {modes: []}},
                },
            },
        }, */
    ],
};

// Messages are seperate from the above state object to keep them from being reactive. Saves CPU.
const messages = [
    /* {
        networkid: 1,
        buffer: '#kiwiirc',
        messages: [
            {
                time: Date.now(),
                nick: 'prawnsalad',
                message: 'hello',
            },
        ],
    },
    {
        networkid: 2,
        buffer: '#orangechat',
        messages: [
            {
                time: Date.now(),
                nick: 'prawnsalad',
                message: 'boom boom boom',
            },
            {
                time: Date.now() + 10000,
                nick: 'someone',
                message: '.. you want me in your room?',
            },
        ],
    }, */
];

const availableStartups = Object.create(null);

// TODO: Move these state changing methods into vuex or something
const state = new Vue({
    data: stateObj,
    methods: {
        // Export enough state so that it can be imported in future to resume
        exportState(includeBuffers) {
            let toExport = {};

            if (includeBuffers) {
                toExport.networks = state.networks.map((network) => {
                    let networkObj = {
                        id: network.id,
                        name: network.name,
                        connection: {
                            server: network.connection.server,
                            port: network.connection.port,
                            tls: network.connection.tls,
                            path: network.connection.path,
                            password: network.connection.password,
                            direct: network.connection.direct,
                            encoding: network.connection.encoding,
                        },
                        auto_commands: network.auto_commands,
                        settings: _.cloneDeep(network.settings),
                        nick: network.nick,
                        username: network.username,
                        gecos: network.gecos,
                        password: network.password,
                        buffers: [],
                    };

                    networkObj.buffers = network.buffers.map((buffer) => {
                        let bufferObj = {
                            name: buffer.name,
                            key: buffer.key,
                            enabled: !!buffer.enabled,
                            settings: _.cloneDeep(buffer.settings),
                        };

                        return bufferObj;
                    });

                    return networkObj;
                });
            }

            toExport.user_settings = state.user_settings;

            return JSON.stringify(toExport);
        },

        // Import a previously exported state to continue that state
        importState(stateStr) {
            let importObj = JSON.parse(stateStr);
            if (importObj && importObj.networks) {
                this.resetState();
                importObj.networks.forEach((importNetwork) => {
                    let network = createEmptyNetworkObject();
                    network.id = importNetwork.id;
                    network.name = importNetwork.name;
                    network.connection = importNetwork.connection;
                    network.auto_commands = importNetwork.auto_commands || '';
                    network.settings = importNetwork.settings;
                    network.nick = importNetwork.nick;
                    network.username = importNetwork.username;
                    network.gecos = importNetwork.gecos;
                    network.password = importNetwork.password;

                    this.networks.push(network);
                    initialiseNetworkState(network);

                    importNetwork.buffers.forEach((importBuffer) => {
                        let buffer = createEmptyBufferObject();
                        buffer.name = importBuffer.name;
                        buffer.key = importBuffer.key;
                        buffer.networkid = network.id;
                        buffer.enabled = !!importBuffer.enabled;
                        buffer.settings = importBuffer.settings;

                        network.buffers.push(buffer);
                        initialiseBufferState(buffer);
                    });
                });
            }

            if (importObj && importObj.user_settings) {
                this.user_settings = importObj.user_settings;
            }
        },

        resetState() {
            this.$set(this.$data, 'user_settings', []);
            this.$set(this.$data, 'networks', []);
            messages.splice(0);
        },

        setting(name, val) {
            if (typeof val !== 'undefined') {
                // Setting any setting always goes into the user own settings space
                return this.setSetting('user_settings.' + name, val);
            }

            // Check the user specific settings before reverting to global settings
            let userSetting = this.getSetting('user_settings.' + name);
            let result = typeof userSetting !== 'undefined' ?
                userSetting :
                this.getSetting('settings.' + name);

            return result;
        },

        // Accept 'dotted.notation' to read a state property of any depth
        getSetting(name) {
            let parts = name.split('.');
            let val = this.$data;

            for (let i = 0; i < parts.length; i++) {
                val = val[parts[i]];
                if (typeof val === 'undefined') {
                    break;
                }
            }

            return val;
        },

        // Accept 'dotted.notation' to set a state property of any depth
        setSetting(name, newVal) {
            let parts = name.split('.');
            let val = this.$data;

            for (let i = 0; i < parts.length; i++) {
                let propName = parts[i];
                let nextVal = val[propName];

                if (i < parts.length - 1 && typeof nextVal === 'undefined') {
                    nextVal = this.$set(val, propName, {});
                } else if (i === parts.length - 1) {
                    this.$set(val, propName, newVal);
                }

                val = nextVal;
            }

            return val;
        },

        getActiveNetwork() {
            return this.getNetwork(this.ui.active_network);
        },

        getNetwork(networkid) {
            let network = _.find(this.networks, {
                id: networkid,
            });

            return network;
        },

        getNetworkFromAddress(netAddr) {
            return _.find(this.networks, (net) => {
                let isMatch = netAddr.toLowerCase() === net.connection.server.toLowerCase();
                return isMatch;
            });
        },

        addNetwork(name, nick, serverInfo) {
            // Find the current largest ID and increment it by 1
            function networkidReduce(currentMax, network) {
                return network.id > currentMax ?
                    network.id :
                    currentMax;
            }
            let networkid = serverInfo.channelId ?
                parseInt(serverInfo.channelId, 10) :
                _.reduce(this.networks, networkidReduce, 0) + 1;

            let network = createEmptyNetworkObject();
            network.id = networkid;
            network.name = name;
            network.nick = nick;
            network.username = serverInfo.username;
            network.gecos = serverInfo.gecos;
            network.password = serverInfo.password;
            network.connection.server = serverInfo.server || '';
            network.connection.port = serverInfo.port || 6667;
            network.connection.tls = serverInfo.tls || false;
            network.connection.path = serverInfo.path || '';
            network.connection.password = serverInfo.password || '';
            network.connection.direct = !!serverInfo.direct;
            network.connection.path = serverInfo.path || '';
            network.connection.encoding = serverInfo.encoding || 'utf8';
            network.connection.bncname = serverInfo.bncname || '';

            if (serverInfo.services) {
                network.services = serverInfo.services;
            }

            this.networks.push(network);
            initialiseNetworkState(network);

            // Add the server server buffer
            this.addBuffer(network.id, '*').joined = true;

            let eventObj = { network };
            state.$emit('network.new', eventObj);

            return network;
        },

        removeNetwork(networkid) {
            let network = this.getNetwork(networkid);
            if (!network) {
                return;
            }

            if (network.state === 'connected') {
                network.ircClient.quit();
            }

            if (network === this.getActiveNetwork()) {
                this.setActiveBuffer(null);
            }

            let idx = this.networks.indexOf(network);
            this.networks.splice(idx, 1);

            let eventObj = { network };
            state.$emit('network.removed', eventObj);
        },

        getActiveBuffer() {
            return this.getBufferByName(this.ui.active_network, this.ui.active_buffer);
        },

        setActiveBuffer(networkid, bufferName) {
            if (!networkid) {
                this.ui.active_network = 0;
                this.ui.active_buffer = '';
            } else {
                if (this.ui.active_network) {
                    // Keep track of last 20 viewed buffers. When closing buffers we can go back to
                    // one of the previous ones
                    this.ui.last_active_buffers.push({
                        networkid: this.ui.active_network,
                        bufferName: this.ui.active_buffer,
                    });

                    let lastActive = this.ui.last_active_buffers;
                    this.ui.last_active_buffers = lastActive.splice(lastActive.length - 20);
                }

                this.ui.active_network = networkid;
                this.ui.active_buffer = bufferName;

                // Clear any unread messages counters for this buffer
                let buffer = this.getBufferByName(networkid, bufferName);
                if (buffer && buffer.flags.unread) {
                    buffer.flags.unread = 0;
                }

                // Update the buffers last read time
                if (buffer) {
                    buffer.markAsRead(true);
                }
            }
        },

        openLastActiveBuffer: function openLastActiveBuffer() {
            let targetNetwork;
            let targetBuffer;
            let lastActive = this.ui.last_active_buffers;

            // Find the last buffer in our history that still exists
            for (let i = lastActive.length - 1; i >= 0; i--) {
                let network = this.getNetwork(lastActive[i].networkid);
                if (!network) {
                    continue;
                }

                let buffer = network.bufferByName(lastActive[i].bufferName);
                if (!buffer) {
                    continue;
                }

                targetNetwork = network;
                targetBuffer = buffer;

                // Trim the buffer history to this point
                lastActive.splice(i);
                break;
            }

            // If we ran out of buffer history, try going to the active networks server buffer
            if (!targetBuffer) {
                let network = this.getActiveNetwork();
                if (network) {
                    targetNetwork = network;
                    targetBuffer = network.serverBuffer().name;
                }
            }

            if (targetBuffer) {
                this.setActiveBuffer(targetNetwork.id, targetBuffer.name);
            } else {
                this.setActiveBuffer();
            }
        },

        updateBufferLastRead(networkid, bufferName) {
            let buffer = this.getBufferByName(networkid, bufferName);
            if (buffer) {
                buffer.last_read = Date.now();
                buffer.active_timeout = null;
            }
        },

        getOrAddBufferByName(networkid, bufferName) {
            let network = this.getNetwork(networkid);
            if (!network) {
                return null;
            }

            let toMatch = bufferName.toLowerCase();
            let buffer = _.find(network.buffers, b => b.name.toLowerCase() === toMatch);

            if (!buffer) {
                buffer = this.addBuffer(networkid, bufferName);
            }

            return buffer;
        },

        getBufferByName(networkid, bufferName) {
            if (!bufferName) {
                return null;
            }

            let network = this.getNetwork(networkid);
            if (!network) {
                return null;
            }

            let toMatch = bufferName.toLowerCase();
            let buffer = _.find(network.buffers, b => b.name.toLowerCase() === toMatch);

            return buffer;
        },

        addBuffer(networkid, bufferName) {
            // If we already have this buffer, don't re-add it
            let buffer = this.getBufferByName(networkid, bufferName);
            if (buffer) {
                return buffer;
            }

            // Make sure we at least we have this network
            let network = this.getNetwork(networkid);
            if (!network) {
                return false;
            }

            buffer = createEmptyBufferObject();
            buffer.networkid = network.id;
            buffer.name = bufferName;
            network.buffers.push(buffer);

            initialiseBufferState(buffer);

            let eventObj = { buffer };
            state.$emit('buffer.new', eventObj);

            return buffer;
        },

        removeBuffer(buffer) {
            let isActiveBuffer = (this.getActiveBuffer() === buffer);

            let network = this.getNetwork(buffer.networkid);
            if (!network) {
                return;
            }

            let eventObj = { buffer };
            state.$emit('buffer.close', eventObj);

            let bufferIdx = network.buffers.indexOf(buffer);
            if (bufferIdx > -1) {
                network.buffers.splice(bufferIdx, 1);
            }

            let messageIdx = _.findIndex(messages, {
                networkid: network.id,
                buffer: buffer.name,
            });
            if (messageIdx > -1) {
                messages.splice(messageIdx, 1);
            }

            if (buffer.isChannel() && buffer.joined) {
                network.ircClient.part(buffer.name);
            }

            if (isActiveBuffer) {
                this.openLastActiveBuffer();
            }

            // Remove this buffer from any users
            /* eslint-disable guard-for-in */
            Object.keys(buffer.users).forEach((nick) => {
                let user = buffer.users[nick];
                delete user.buffers[buffer.id];
            });
        },

        addMessage(buffer, message) {
            let user = this.getUser(buffer.networkid, message.nick);
            let bufferMessage = new Message(message, user);
            if (user && user.ignore) {
                bufferMessage.ignore = true;
            }

            buffer.addMessage(bufferMessage);

            // Increment the unread counter if this buffer is not active
            let includeAsActivity = false;
            let typesForActivty = ['privmsg', 'action', 'notice'];
            if (buffer.setting('traffic_as_activity') && message.type === 'traffic') {
                typesForActivty.push('traffic');
            }

            if (typesForActivty.indexOf(message.type) > -1) {
                includeAsActivity = true;
            }

            let isActiveBuffer = (
                buffer.networkid === this.ui.active_network &&
                buffer.name === this.ui.active_buffer
            );

            let network = buffer.getNetwork();
            let isNewMessage = message.time >= buffer.last_read;
            let isHighlight = Misc.mentionsNick(bufferMessage.message, network.ircClient.user.nick);

            // Check for extra custom highlight words
            let extraHighlights = (state.setting('highlights') || '').toLowerCase().split(' ');
            if (!isHighlight && extraHighlights.length > 0) {
                extraHighlights.forEach((word) => {
                    if (!word) {
                        return;
                    }

                    if (bufferMessage.message.indexOf(word) > -1) {
                        isHighlight = true;
                    }
                });
            }

            bufferMessage.isHighlight = isHighlight;

            if (isNewMessage && isActiveBuffer && state.ui.app_has_focus) {
                buffer.last_read = message.time;
            }

            // Handle buffer flags
            if (isNewMessage && includeAsActivity && !isActiveBuffer) {
                buffer.incrementFlag('unread');
                if (isHighlight) {
                    buffer.flag('highlight', true);
                }
            }

            // Handle any notifications
            let settingAlertOn = buffer.setting('alert_on');
            let isSelf = message.nick === network.nick;
            if (isNewMessage && settingAlertOn !== 'never' && !isSelf) {
                let notifyTitle = '';
                let notifyMessage = message.nick ?
                    message.nick + ': ' :
                    '';
                notifyMessage += message.message;

                if (isHighlight) {
                    notifyTitle = 'You were mentioned in ' + buffer.name;
                } else if (settingAlertOn === 'message' && !isHighlight) {
                    notifyTitle = buffer.name;
                }

                if (notifyTitle) {
                    this.$emit('notification.show', notifyMessage, {
                        title: notifyTitle,
                        onclick: () => {
                            state.setActiveBuffer(buffer.networkid, buffer.name);

                            // Newer webkit browser use parent.focus() while older webkit uses
                            // window.focus()
                            /* eslint-disable no-restricted-globals */
                            if (parent && parent.focus) {
                                parent.focus();
                            }
                            if (window.focus) {
                                window.focus();
                            }
                        },
                    });
                }
            }

            this.$emit('message.new', bufferMessage, buffer);
        },

        getMessages(buffer) {
            let bufMessages = _.find(messages, {
                networkid: buffer.networkid,
                buffer: buffer.name,
            });

            return bufMessages ?
                bufMessages.messages :
                [];
        },

        getUser(networkid, nick, usersArr_) {
            let user = null;
            let users = usersArr_;

            if (!users) {
                let network = this.getNetwork(networkid);
                if (network) {
                    users = network.users;
                }
            }

            if (users) {
                user = users[nick.toLowerCase()];
            }

            return user;
        },

        // Modify a networks user array without hitting vues reactive system until fn()
        // has completed. Good for making large changes in bulk
        usersTransaction(networkid, fn) {
            let network = this.getNetwork(networkid);
            if (!network) {
                return;
            }

            let users = _.clone(network.users);
            fn(users);
            this.$set(network, 'users', users);
        },

        addUser(networkid, user, usersArr_) {
            let network = null;

            // Accept either a network ID or a direct network object
            if (typeof networkid === 'number') {
                network = this.getNetwork(networkid);
            } else {
                network = networkid;
            }

            if (!network) {
                return null;
            }

            let usersArr = usersArr_ || network.users;
            let userObj = null;

            if (!usersArr[user.nick.toLowerCase()]) {
                userObj = usersArr[user.nick.toLowerCase()] = {
                    nick: user.nick,
                    host: user.host || '',
                    username: user.username || '',
                    realname: user.realname || '',
                    modes: user.modes || '',
                    away: user.away || '',
                    buffers: Object.create(null),
                };
            } else {
                // Update the existing user object with any new info we have
                userObj = state.getUser(network.id, user.nick, usersArr);
                _.each(user, (val, prop) => {
                    if (typeof val !== 'undefined') {
                        userObj[prop] = val;
                    }
                });
            }

            return userObj;
        },

        removeUser(networkid, user) {
            let network = this.getNetwork(networkid);
            if (!network) {
                return;
            }

            let buffers = state.getBuffersWithUser(networkid, user.nick);
            buffers.forEach((buffer) => {
                state.removeUserFromBuffer(buffer, user.nick);
            });

            this.$delete(network.users, user.nick.toLowerCase());
        },

        addMultipleUsersToBuffer(buffer, newUsers) {
            let network = this.getNetwork(buffer.networkid);
            let bufUsers = _.clone(buffer.users);

            state.usersTransaction(network.id, (users) => {
                newUsers.forEach((newUser) => {
                    let user = newUser.user;
                    let modes = newUser.modes;
                    let userObj = state.getUser(network.id, user.nick, users);

                    if (!userObj) {
                        userObj = this.addUser(network, user, users);
                    }
                    bufUsers[userObj.nick.toLowerCase()] = userObj;

                    // Add the buffer to the users buffer list
                    if (!userObj.buffers[buffer.id]) {
                        userObj.buffers[buffer.id] = {
                            modes: modes || [],
                            buffer: buffer,
                        };
                    } else {
                        userObj.buffers[buffer.id].modes = modes || [];
                    }
                });
            });

            buffer.users = bufUsers;
        },

        addUserToBuffer(buffer, user, modes) {
            let network = this.getNetwork(buffer.networkid);
            let userObj = state.getUser(network.id, user.nick);

            if (!userObj) {
                userObj = this.addUser(network, user);
            }

            buffer.addUser(userObj);

            // Add the buffer to the users buffer list
            if (!userObj.buffers[buffer.id]) {
                state.$set(userObj.buffers, buffer.id, {
                    modes: modes || [],
                    buffer: buffer,
                });
            } else {
                state.$set(userObj.buffers[buffer.id], 'modes', modes || []);
            }
        },

        removeUserFromBuffer(buffer, nick) {
            buffer.removeUser(nick);
        },

        getBuffersWithUser(networkid, nick) {
            let network = this.getNetwork(networkid);
            if (!network) {
                return [];
            }

            let normalisedNick = nick.toLowerCase();
            let buffers = [];
            network.buffers.forEach((buffer) => {
                if (buffer.users[normalisedNick]) {
                    buffers.push(buffer);
                }
            });

            return buffers;
        },

        changeUserNick(networkid, oldNick, newNick) {
            let network = this.getNetwork(networkid);
            if (!network) {
                return;
            }

            let user = state.getUser(network.id, oldNick);
            if (!user) {
                return;
            }

            let normalisedNew = newNick.toLowerCase();
            let normalisedOld = oldNick.toLowerCase();

            user.nick = newNick;
            state.$set(network.users, normalisedNew, network.users[normalisedOld]);
            state.$delete(network.users, normalisedOld);

            Object.keys(user.buffers).forEach((bufferId) => {
                let buffer = user.buffers[bufferId].buffer;
                state.$set(buffer.users, normalisedNew, buffer.users[normalisedOld]);
                state.$delete(buffer.users, normalisedOld);
            });
        },

        getStartups() {
            return availableStartups;
        },
    },
});

export default state;

function createEmptyNetworkObject() {
    return {
        id: 0,
        name: '',
        // State of the transport
        state: 'disconnected',
        state_error: '',
        // Last error from the IRC server. Resets on reconnect
        last_error: '',
        auto_commands: '',
        is_znc: false,
        channel_list: [],
        channel_list_state: '',
        connection: {
            server: '',
            port: 6667,
            tls: false,
            path: '',
            password: '',
            direct: false,
            encoding: 'utf8',
            bncname: '',
        },
        settings: {},
        nick: '',
        username: '',
        gecos: '',
        password: '',
        buffers: [],
        users: Object.create(null),
    };
}

let nextBufferId = 0;
function createEmptyBufferObject() {
    return {
        id: nextBufferId++,
        networkid: 0,
        name: '',
        topic: '',
        key: '',
        joined: false,
        enabled: true,
        users: Object.create(null),
        modes: Object.create(null),
        flags: {
            unread: 0,
            alert_on: 'default',
            has_opened: false,
            chathistory_available: true,
        },
        settings: {
        },
        last_read: Date.now(),
        active_timeout: null,
        message_count: 0,
    };
}

function initialiseNetworkState(network) {
    Object.defineProperty(network, 'ircClient', {
        value: IrcClient.create(state, network.id),
    });
    Object.defineProperty(network, 'bufferByName', {
        value: _.partial(state.getBufferByName, network.id),
    });
    Object.defineProperty(network, 'serverBuffer', {
        value: _.partial(state.getBufferByName, network.id, '*'),
    });
    Object.defineProperty(network, 'setting', {
        value: function setting(name, val) {
            if (typeof val !== 'undefined') {
                state.$set(network.settings, name, val);
                return val;
            }

            return network.settings[name];
        },
    });
    Object.defineProperty(network, 'isChannelName', {
        value: function isChannelName(input) {
            if (typeof input !== 'string' || !input) {
                return false;
            }

            let chanPrefixes = this.ircClient.network.supports('CHANTYPES') || '#&';
            return chanPrefixes.indexOf(input[0]) > -1;
        },
    });
    Object.defineProperty(network, 'showServerBuffer', {
        value: function showServerBuffer(tabName) {
            state.setActiveBuffer(network.id, network.serverBuffer().name);
            // Hacky, but the server buffer component listens for events to switch
            // between tabs
            setImmediate(() => {
                state.$emit('server.tab.show', tabName || 'settings');
            });
        },
    });

    // If this network is being imported from a stored state, make sure it is
    // now set as 'disconnected' as it will not connected at this point.
    network.state = 'disconnected';
}

function initialiseBufferState(buffer) {
    Object.defineProperty(buffer, 'getNetwork', {
        value: function getNetwork() { return state.getNetwork(buffer.networkid); },
    });
    Object.defineProperty(buffer, 'getMessages', {
        value: function getNetwork() { return state.getMessages(buffer); },
    });
    Object.defineProperty(buffer, 'isServer', {
        value: function isServer() { return buffer.name === '*'; },
    });
    Object.defineProperty(buffer, 'isChannel', {
        value: function isChannel() {
            let chanPrefixes = ['#', '&'];
            let ircNetwork = buffer.getNetwork().ircClient.network;
            if (ircNetwork && ircNetwork.options.CHANTYPES) {
                chanPrefixes = ircNetwork.options.CHANTYPES;
            }

            return chanPrefixes.indexOf(buffer.name[0]) > -1;
        },
    });
    Object.defineProperty(buffer, 'isQuery', {
        value: function isQuery() {
            let chanPrefixes = ['#', '&'];
            let ircNetwork = buffer.getNetwork().ircClient.network;
            if (ircNetwork && ircNetwork.options.CHANTYPES) {
                chanPrefixes = ircNetwork.options.CHANTYPES;
            }

            return chanPrefixes.indexOf(buffer.name[0]) === -1 &&
                !this.isSpecial() &&
                !this.isServer();
        },
    });
    Object.defineProperty(buffer, 'isSpecial', {
        value: function isSpecial() {
            // Special buffer names (Usually controller queries, like *status or *raw).
            // Server buffer '*' is not included in this classification.
            let name = buffer.name;
            return name[0] === '*' && name.length > 1;
        },
    });
    Object.defineProperty(buffer, 'isUserAnOp', {
        value: function isUserAnOp(nick) {
            let user = state.getUser(buffer.networkid, buffer.getNetwork().nick);
            if (!user) {
                return false;
            }

            let userBufferInfo = user.buffers[buffer.id];
            if (!userBufferInfo) {
                return false;
            }

            let modes = userBufferInfo.modes;
            let opModes = ['Y', 'y', 'q', 'a', 'o', 'h'];
            let hasOp = _.find(modes, mode => opModes.indexOf(mode.toLowerCase()) > -1);

            return !!hasOp;
        },
    });
    // Get/set a setting set on this buffer. If undefined, get the global setting
    Object.defineProperty(buffer, 'setting', {
        value: function setting(name, val) {
            if (typeof val !== 'undefined') {
                state.$set(buffer.settings, name, val);
                return val;
            }

            // Check the buffer specific settings before reverting to global settings
            let result = typeof buffer.settings[name] !== 'undefined' ?
                buffer.settings[name] :
                state.setting('buffers.' + name);

            return result;
        },
    });
    Object.defineProperty(buffer, 'flag', {
        value: function flag(name, val) {
            if (typeof val !== 'undefined') {
                state.$set(buffer.flags, name, val);
                return val;
            }

            return buffer.flags[name];
        },
    });
    Object.defineProperty(buffer, 'requestScrollback', {
        value: function requestScrollback(_direction) {
            let direction = _direction || 'backward';
            let time = '';
            // Negative number gets messages before the timestamps, positive gets messages after
            let numMessages = -50;

            // Going backwards takes the earliest message we already have and requests messages
            // before it. Going forward takes the last emssage we have and requests messages after
            // it.

            if (direction === 'backward') {
                let lastMessage = this.getMessages().reduce((earliest, current) => {
                    let validType = earliest.type !== 'traffic';
                    if (validType && earliest.time && earliest.time < current.time) {
                        return earliest;
                    }
                    return current;
                }, this.getMessages()[0]);

                numMessages = -50;
                time = lastMessage ?
                    new Date(lastMessage.time) :
                    new Date();
            } else if (direction === 'forward') {
                let firstMessage = this.getMessages().reduce((latest, current) => {
                    let validType = latest.type !== 'traffic';
                    if (validType && latest.time && latest.time > current.time) {
                        return latest;
                    }
                    return current;
                }, this.getMessages()[0]);

                numMessages = 50;
                time = firstMessage ?
                    new Date(firstMessage.time) :
                    new Date();
            } else {
                throw new Error('Invalid direction for requestScrollback(): ' + _direction);
            }

            let irc = this.getNetwork().ircClient;
            let timeStr = strftime('%FT%T.%L%:z', time);
            irc.raw(`CHATHISTORY ${this.name} timestamp=${timeStr} message_count=${numMessages}`);
            irc.once('batch end chathistory', (event) => {
                if (event.commands.length === 0) {
                    this.flags.chathistory_available = false;
                } else {
                    this.flags.chathistory_available = true;
                }
            });
        },
    });
    Object.defineProperty(buffer, 'markAsRead', {
        value: function markAsRead(delayed) {
            if (buffer.active_timeout) {
                clearTimeout(buffer.active_timeout);
                buffer.active_timeout = null;
            }
            if (delayed) {
                buffer.active_timeout = setTimeout(
                    buffer.markAsRead,
                    10000,
                    false
                );
            } else {
                buffer.last_read = Date.now();
                buffer.flag('highlight', false);

                // If running under a bouncer, set it on the server-side too
                let network = buffer.getNetwork();
                let allowedUpdate = buffer.isChannel() || buffer.isQuery();
                if (allowedUpdate && network.connection.bncname) {
                    let lastMessage = buffer.getMessages().reduce((latest, current) => {
                        if (latest.time && latest.time > current.time) {
                            return latest;
                        }
                        return current;
                    }, buffer.getMessages()[0]);

                    if (!lastMessage) {
                        return;
                    }

                    network.ircClient.bnc.bufferSeen(
                        network.connection.bncname,
                        buffer.name,
                        new Date(lastMessage.time),
                    );
                }
            }
        },
    });

    // incrementFlag batches up the changes to the flags object as some of them can be
    // very taxing on DOM updates
    Object.defineProperty(buffer, 'incrementFlag', {
        value: (function incrementFlagFn() {
            let batches = Object.create(null);
            let processBatches = _.debounce(() => {
                _.each(batches, (incrBy, flagName) => {
                    buffer.flags[flagName] = (buffer.flags[flagName] || 0) + incrBy;
                    batches[flagName] = 0;
                });
            }, 500);
            return function incrementFlag(flagName) {
                batches[flagName] = batches[flagName] || 0;
                batches[flagName]++;
                processBatches();
            };
        }()),
    });

    /**
     * Batch up floods of addUsers for a huge performance gain.
     * Generally happens whenr econnecting to a BNC
     */
    function addSingleUser(user) {
        state.$set(buffer.users, user.nick.toLowerCase(), user);
    }
    function addMultipleUsers(users) {
        let o = _.clone(buffer.users);
        users.forEach((user) => {
            o[user.nick.toLowerCase()] = user;
        });
        buffer.users = o;
    }
    Object.defineProperty(buffer, 'addUser', {
        value: batchedAdd(addSingleUser, addMultipleUsers),
    });
    Object.defineProperty(buffer, 'removeUser', {
        value: function removeUser(nick) {
            let userObj = state.getUser(buffer.networkid, nick);

            // A user could be queued to be added, so make sure it's not there as it
            // would just be added again. Eg. user joins/parts during a flood
            _.pull(buffer.addUser.queue(), userObj);

            state.$delete(buffer.users, nick.toLowerCase());

            if (userObj) {
                delete userObj.buffers[buffer.id];
            }
        },
    });
    Object.defineProperty(buffer, 'clearUsers', {
        value: function clearUsers() {
            // Users could be queued to be added, so make sure to clear them as they
            // would just be added again. Eg. user joins/parts during a flood
            buffer.addUser.queue().splice(0);

            _.each(buffer.users, (userObj, nick) => {
                delete userObj.buffers[buffer.id];
            });

            state.$set(buffer, 'users', {});
        },
    });

    /**
     * batch up floods of new messages for a huge performance gain
     */
    function addSingleMessage(newMessage) {
        messageObj.messages.push(newMessage);
        trimMessages();
        buffer.message_count++;
    }
    function addMultipleMessages(newMessages) {
        messageObj.messages = messageObj.messages.concat(newMessages);
        trimMessages();
        buffer.message_count++;
    }
    Object.defineProperty(buffer, 'addMessage', {
        value: batchedAdd(addSingleMessage, addMultipleMessages),
    });

    function trimMessages() {
        let scrollbackSize = buffer.setting('scrollback_size');
        let length = messageObj.messages.length;

        if (messageObj.messages.length > scrollbackSize) {
            messageObj.messages.splice(0, length - scrollbackSize);
        }
    }

    // Helper functions
    Object.defineProperty(buffer, 'say', {
        value: function say(message, opts = {}) {
            let network = buffer.getNetwork();
            let newMessage = {
                time: Date.now(),
                nick: network.nick,
                message: message,
                type: opts.type || 'privmsg',
            };

            state.addMessage(buffer, newMessage);

            let fnNames = {
                privmsg: 'say',
                action: 'action',
                notice: 'notice',
            };
            let fnName = fnNames[opts.type] || 'say';
            network.ircClient[fnName](buffer.name, message);
        },
    });
    Object.defineProperty(buffer, 'join', {
        value: function join() {
            if (!buffer.isChannel()) {
                return;
            }

            let network = buffer.getNetwork();
            network.ircClient.join(buffer.name, buffer.key || '');
        },
    });
    Object.defineProperty(buffer, 'part', {
        value: function part(reason) {
            if (!buffer.isChannel()) {
                return;
            }

            let network = buffer.getNetwork();
            network.ircClient.part(buffer.name, reason || '');
        },
    });

    let messageObj = {
        networkid: buffer.networkid,
        buffer: buffer.name,
        messages: [],
    };
    messages.push(messageObj);
}

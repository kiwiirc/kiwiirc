/**
 * Configuration templates
 *
 * All the default values for config options throughout kiwi are set here, under
 * the 'default' template object below.
 * If a 'default.template' value is set in the user config, this is used to
 * find the next template object below and is merged over the default config
 * template.
 * The user config (config.json by default) is then merged over the resulting
 * config object.
 *
 * The advanced settings dialog also displays these settings by iterating
 * through the keys. The values must not be null otherwise they will not be
 * shown.
 */

export const configTemplates = {

    default: {
        plugins: [],
        windowTitle: 'Kiwi IRC - The web IRC client',
        useMonospace: false,
        language: '',
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
            path: '',
            username: '',
            password: '',
        },
        warnOnExit: true,
        quitMessage: 'Page closed',
        // Default buffer settings
        buffers: {
            messageLayout: 'modern',
            alert_on: 'highlight',
            timestamp_format: '%H:%M:%S',
            // If timestamp_full_format is falsy, the browsers locale date format will be used
            timestamp_full_format: '',
            show_timestamps: true,
            scrollback_size: 250,
            show_hostnames: false,
            show_joinparts: true,
            show_topics: true,
            show_nick_changes: true,
            show_mode_changes: true,
            show_presence_changes: true,
            traffic_as_activity: false,
            coloured_nicklist: true,
            colour_nicknames_in_messages: true,
            block_pms: false,
            show_emoticons: true,
            extra_formatting: true,
            mute_sound: false,
            hide_message_counts: false,
            show_realnames: false,
            default_ban_mask: '*!%i@%h',
            default_kick_reason: 'Your behaviour is not conducive to the desired environment.',
            shared_input: false,
            show_message_info: true,
            who_loop: true,
            share_typing: true,
            // flash_title: message/highlight/off
            flash_title: 'message',
            nicklist_avatars: false,
            show_link_previews: true,
            inline_link_auto_previews: true,
            inline_link_auto_previews_query: true,
            inline_link_auto_preview_whitelist: '.*',
            show_buffer_groups: true,
            // prompt_leave: all/channels/queries/none
            prompt_leave: 'channels',
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
            remember_buffers: true,
            nick_format: '',
        },
        autoReconnect: false,
        disconnectOnSaslFail: true,
        allowRegisterProtocolHandler: false,
        noticeActiveBuffer: true,
        nicklistGroupAway: false,
        showChanlistModes: false,
        showAutocomplete: true,
        autocompleteTokens: ['/', '#', '@'],
        showEmojiPicker: true,
        showColorPicker: false,
        showSendButton: false,
        showAwayStatusIndicators: true,
        sidebarDefault: 'nicklist',
        showRaw: false,
        useBufferHistory: true,
        hideSettings: null,
        highlights: '',
        teamHighlights: false,
        aliases: `
# General aliases
/p /part $1+
/me /action $destination $1+
/j /join $1+
/q /query $1+
/w /whois $1+
/raw /quote $1+
/connect /server $1+
/disconnect /quit $1+
/cycle $channel? /lines /part $channel | /join $channel
/active /back $1+
/umode /mode $nick $1+

# Op related aliases
/op /quote mode $channel +o $1+
/deop /quote mode $channel -o $1+
/hop /quote mode $channel +h $1+
/dehop /quote mode $channel -h $1+
/voice /quote mode $channel +v $1+
/devoice /quote mode $channel -v $1+
/k /kick $channel $1+
/bans /mode $channel +b
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
            '-___-': '1f611.png',
            ':\'-)': '1f602.png',
            '\':-)': '1f605.png',
            '\':-D': '1f605.png',
            '>:-)': '1f606.png',
            '\':-(': '1f613.png',
            '>:-(': '1f620.png',
            ':\'-(': '1f622.png',
            'O:-)': '1f607.png',
            '0:-3': '1f607.png',
            '0:-)': '1f607.png',
            '0;^)': '1f607.png',
            'O;-)': '1f607.png',
            '0;-)': '1f607.png',
            'O:-3': '1f607.png',
            '-__-': '1f611.png',
            ':-Þ': '1f61b.png',
            '<3': '2764.png',
            '</3': '1f494.png',
            ':\')': '1f602.png',
            ':-D': '1f603.png',
            '\':)': '1f605.png',
            '\'=)': '1f605.png',
            '\':D': '1f605.png',
            '\'=D': '1f605.png',
            '>:)': '1f606.png',
            '>;)': '1f606.png',
            '>=)': '1f606.png',
            'XD': '1f606.png',
            ';-)': '1f609.png',
            '*-)': '1f609.png',
            ';-]': '1f609.png',
            ';^)': '1f609.png',
            '\':(': '1f613.png',
            '\'=(': '1f613.png',
            ':-*': '1f618.png',
            ':^*': '1f618.png',
            '>:P': '1f61c.png',
            'X-P': '1f61c.png',
            '>:[': '1f61e.png',
            ':-(': '1f61e.png',
            ':-[': '1f61e.png',
            '>:(': '1f620.png',
            ':\'(': '1f622.png',
            ';-(': '1f622.png',
            '>.<': '1f623.png',
            '#-)': '1f635.png',
            '%-)': '1f635.png',
            'X-)': '1f635.png',
            '\\0/': '1f646.png',
            '\\O/': '1f646.png',
            '0:3': '1f607.png',
            '0:)': '1f607.png',
            'O:)': '1f607.png',
            'O=)': '1f607.png',
            'O:3': '1f607.png',
            'B-)': '1f60e.png',
            '8-)': '1f60e.png',
            'B-D': '1f60e.png',
            '8-D': '1f60e.png',
            '-_-': '1f611.png',
            '>:\\': '1f615.png',
            '>:/': '1f615.png',
            ':-/': '1f615.png',
            ':-.': '1f615.png',
            ':-P': '1f61b.png',
            ':Þ': '1f61b.png',
            ':-b': '1f61b.png',
            ':-O': '1f62e.png',
            'O_O': '1f62e.png',
            '>:O': '1f62e.png',
            ':-X': '1f636.png',
            ':-#': '1f636.png',
            ':-)': '1f642.png',
            '(y)': '1f44d.png',
            ':D': '1f603.png',
            '=D': '1f603.png',
            ';)': '1f609.png',
            '*)': '1f609.png',
            ';]': '1f609.png',
            ';D': '1f609.png',
            ':*': '1f618.png',
            '=*': '1f618.png',
            ':(': '1f61e.png',
            ':[': '1f61e.png',
            '=(': '1f61e.png',
            ':@': '1f620.png',
            ';(': '1f622.png',
            'D:': '1f628.png',
            ':$': '1f633.png',
            '=$': '1f633.png',
            '#)': '1f635.png',
            '%)': '1f635.png',
            'X)': '1f635.png',
            'B)': '1f60e.png',
            '8)': '1f60e.png',
            ':/': '1f615.png',
            ':\\': '1f615.png',
            '=/': '1f615.png',
            '=\\': '1f615.png',
            ':L': '1f615.png',
            '=L': '1f615.png',
            ':P': '1f61b.png',
            ':p': '1f61b.png',
            '=P': '1f61b.png',
            ':b': '1f61b.png',
            ':O': '1f62e.png',
            ':X': '1f636.png',
            ':#': '1f636.png',
            '=X': '1f636.png',
            '=#': '1f636.png',
            ':)': '1f642.png',
            '=]': '1f642.png',
            '=)': '1f642.png',
            ':]': '1f642.png',
        },
        emojiLocation: 'https://kiwiirc.com/shared/emoji/',
        textFormats: {
            user: '%nick',
            user_full: '%nick (%username@%host)',
            channel_join: '→ %text',
            channel_part: '← %text (%reason)',
            channel_quit: '← %text (%reason)',
            channel_kicked: '← %text (%reason)',
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
            network_disconnected: '%text',
            network_connected: '%text',
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
            notice: '[NOTICE] %text',
            action: '* %nick %text',
            whois_ident: '%nick [%nick!%ident@%host] * %text',
            whois_error: '[%nick] %text',
            whois: '%text',
            whowas_ident: 'was [%nick!%ident@%host] * %name',
            whowas_server: 'using %server (%info)',
            whowas_error: '[%nick] %text',
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
        presetNetworks: [],
    },

    // Config template for those hardcore irc veterans
    irc: {
        showEmojiPicker: false,
        sidebarDefault: 'nicklist',
        buffers: {
            messageLayout: 'inline',
            show_hostnames: true,
            coloured_nicklist: false,
            colour_nicknames_in_messages: false,
            show_emoticons: false,
            show_message_info: false,
            share_typing: false,
            inline_link_auto_previews: false,
        },
    },

    // Config template for working as part of a team
    team: {
        teamHighlights: true,
        buffers: {
            messageLayout: 'modern',
            show_joinparts: false,
            show_nick_changes: true,
            show_mode_changes: true,
            show_realnames: true,
        },
    },

};

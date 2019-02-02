export const configTemplates = {

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
        },
    },

    // Config template for working as part of a team
    team: {
        teamHighlights: true,
        buffers: {
            messageLayout: 'modern',
            show_joinparts: false,
            show_nick_changes: false,
            show_mode_changes: false,
            show_realnames: true,
        },
    },

};

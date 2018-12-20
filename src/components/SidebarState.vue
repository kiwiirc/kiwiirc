<script>
'kiwi public';

import Vue from 'vue';

export default Vue.extend({
    data() {
        return {
            activeComponent: null,
            // sidebarSection may be either '', 'user', 'settings', 'nicklist', 'about'
            channelState: {
                allowedSections: ['user', 'settings', 'nicklist', 'about'],
                sidebarOpen: false,
                sidebarUser: null,
                sidebarSection: '',
            },
            queryState: {
                allowedSections: ['user'],
                sidebarOpen: null,
                sidebarUser: null,
                sidebarSection: 'user',
            },
        };
    },
    computed: {
        isDrawn() {
            return this.sidebarOpen && this.$state.ui.app_width <= 769;
        },
        isClosed() {
            return !this.sidebarOpen;
        },
        isOpen() {
            return this.sidebarOpen && this.$state.ui.app_width > 769;
        },
        sidebarState() {
            let buffer = this.$state.getActiveBuffer();
            return buffer.isChannel() ? this.channelState : this.queryState;
        },
        sidebarOpen: {
            get() {
                let state = this.sidebarState;
                return state.sidebarOpen;
            },
            set(val) {
                let state = this.sidebarState;
                state.sidebarOpen = val;
            },
        },
        sidebarUser: {
            get() {
                let state = this.sidebarState;
                return state.sidebarUser;
            },
            set(val) {
                let state = this.sidebarState;
                state.sidebarUser = val;
            },
        },
        sidebarSection: {
            get() {
                let state = this.sidebarState;
                if (!state.sidebarOpen) {
                    return '';
                }
                return state.sidebarSection;
            },
            set(val) {
                let state = this.sidebarState;
                state.sidebarSection = val;
            },
        },
    },
    created() {
        this.listen(this.$state, 'sidebar.component', (component) => {
            this.activeComponent = component;
        });

        // Allow forcing the sidebar open at startup
        this.$nextTick(() => {
            // nextTick is needed because app_width is 0 on created()
            let sidebarDefault = this.$state.setting('sidebarDefault');
            if (sidebarDefault && this.$state.ui.app_width > 769) {
                this.channelState.sidebarSection = sidebarDefault;
                this.channelState.sidebarOpen = true;
                this.queryState.sidebarOpen = true;
            }
        });
    },
    methods: {
        section() {
            if (this.sidebarOpen === null) {
                // Query has not been opened yet so copy the channel state (open/closed)
                this.sidebarOpen = this.channelState.sidebarOpen;
            }
            if (this.isClosed) {
                return '';
            }

            let buffer = this.$state.getActiveBuffer();
            if (buffer.isChannel()) {
                if (
                    this.sidebarOpen &&
                    this.sidebarSection === 'user' &&
                    !buffer.hasNick(this.sidebarUser.nick)
                ) {
                    // if the channel does not have the user show the nicklist
                    this.showSidebar('nicklist');
                }
                return this.sidebarSection;
            } else if (buffer.isQuery()) {
                if (
                    this.sidebarOpen &&
                    (!this.sidebarUser || this.sidebarUser.nick !== buffer.name)
                ) {
                    let user = this.$state.getUser(buffer.getNetwork().id, buffer.name);
                    // if the query sidebar is open and not the current user, switch users
                    this.showSidebar('user', { user: user });
                }
                return this.sidebarSection;
            }

            return '';
        },
        close() {
            this.sidebarOpen = false;
            this.sidebarUser = null;
        },
        showSidebar(section, opts) {
            this.activeComponent = null;

            // Only set sidebar section if its in the allowed list
            if (!this.sidebarState.allowedSections.includes(section)) {
                return;
            }

            if (section === 'user') {
                let user = this.getUserFromOpts(opts);
                if (user) {
                    this.sidebarUser = user;
                    this.sidebarSection = section;
                    this.sidebarOpen = true;
                }
                // Could be invalid user for which we do nothing
                return;
            }
            this.sidebarSection = section;
            this.sidebarOpen = true;
        },
        toggleSidebar(section, opts) {
            if (!section && this.sidebarOpen) {
                this.close();
                return;
            }
            if (section === 'user') {
                let user = this.getUserFromOpts(opts);
                this.sidebarSection === section && (!user || user === this.sidebarUser) ?
                    this.close() :
                    this.showSidebar(section, opts);
                return;
            }
            this.sidebarSection === section ?
                this.close() :
                this.showSidebar(section, opts);
        },
        showUser(user) {
            this.showSidebar('user', { user: user });
        },
        showNicklist() {
            this.showSidebar('nicklist');
        },
        showBufferSettings() {
            this.showSidebar('settings');
        },
        showAbout() {
            this.showSidebar('about');
        },
        toggleUser(nick) {
            let user = this.$state.getUser(this.$state.getActiveNetwork().id, nick);
            this.toggleSidebar('user', { user: user });
        },
        toggleNicklist() {
            this.toggleSidebar('nicklist');
        },
        toggleBufferSettings() {
            this.toggleSidebar('settings');
        },
        toggleAbout() {
            this.toggleSidebar('about');
        },
        getUserFromOpts(opts) {
            if (!opts) {
                return null;
            }

            // Opts can contain a nick or a user object
            let buffer = this.$state.getActiveBuffer();
            // Check the active buffer contains the user
            if (opts.user && buffer.hasNick(opts.user.nick)) {
                return opts.user;
            } else if (opts.nick) {
                // Get the user from nick and check if they are in the active buffer
                let user = this.$state.getUser(buffer.getNetwork().id, opts.nick);
                if (user && buffer.hasNick(user.nick)) {
                    return user;
                }
            }

            // No valid user/nick or the user is not a member of the current buffer
            return null;
        },
    },
});

</script>

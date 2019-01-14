<script>
'kiwi public';

import Vue from 'vue';

export default Vue.extend({
    data() {
        return {
            sidebarOpen: false,
            // sidebarSection may be either '', 'user', 'settings', 'nicklist', 'about'
            sidebarSection: '',
            sidebarUser: null,
            activeComponent: null,
        };
    },
    computed: {
        isDrawn() {
            return this.sidebarOpen && this.section() && this.$state.ui.app_width <= 769;
        },
        isClosed() {
            return !this.section();
        },
        isOpen() {
            return this.sidebarOpen && this.section() && this.$state.ui.app_width > 769;
        },
    },
    created() {
        this.listen(this.$state, 'sidebar.component', (component) => {
            this.activeComponent = component;
            this.sidebarOpen = !!component;
            this.sidebarSection = '';
        });

        // Allow forcing the sidebar open at startup
        this.$nextTick(() => {
            // nextTick is needed because app_width is 0 on created()
            let sidebarDefault = this.$state.setting('sidebarDefault');
            if (sidebarDefault && this.$state.ui.app_width > 769) {
                this.sidebarSection = sidebarDefault;
                this.sidebarOpen = true;
            }
        });
    },
    methods: {
        section() {
            if (!this.sidebarOpen) {
                return '';
            }

            let section = this.sidebarSection;
            let buffer = this.$state.getActiveBuffer();

            if (buffer.isQuery()) {
                let user = this.$state.getUser(buffer.getNetwork().id, buffer.name);
                if (user) {
                    this.sidebarUser = user;
                    return 'user';
                }
                return '';
            }

            // The following code is for channels only
            if (!buffer.isChannel()) {
                return '';
            }

            if (section === 'user' && this.sidebarUser) {
                if (buffer.hasNick(this.sidebarUser.nick)) {
                    return 'user';
                }
                // show the nicklist if the selected user is not present in the buffer
                return 'nicklist';
            } else if (section === 'nicklist') {
                return 'nicklist';
            } else if (section === 'settings') {
                return 'settings';
            } else if (section === 'about') {
                return 'about';
            }

            return '';
        },
        close() {
            this.activeComponent = null;
            this.sidebarOpen = false;
            this.sidebarSection = '';
            this.sidebarUser = null;
        },
        showUser(user) {
            this.activeComponent = null;
            this.sidebarUser = user;
            this.sidebarOpen = true;
            this.sidebarSection = 'user';
        },
        showNicklist() {
            this.activeComponent = null;
            this.sidebarOpen = true;
            this.sidebarSection = 'nicklist';
        },
        showBufferSettings() {
            this.activeComponent = null;
            this.sidebarOpen = true;
            this.sidebarSection = 'settings';
        },
        showAbout() {
            this.activeComponent = null;
            this.sidebarOpen = true;
            this.sidebarSection = 'about';
        },
        toggleUser(user) {
            this.section() === 'user' ?
                this.close() :
                this.showUser(user);
        },
        toggleNicklist() {
            this.section() === 'nicklist' ?
                this.close() :
                this.showNicklist();
        },
        toggleBufferSettings() {
            this.section() === 'settings' ?
                this.close() :
                this.showBufferSettings();
        },
        toggleAbout() {
            this.section() === 'about' ?
                this.close() :
                this.showAbout();
        },
    },
});

</script>

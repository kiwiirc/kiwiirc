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
            return this.sidebarOpen && this.$state.ui.app_width <= 769;
        },
        isClosed() {
            return !this.sidebarOpen;
        },
        isOpen() {
            return this.sidebarOpen && this.$state.ui.app_width > 769;
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
                this.sidebarSection = sidebarDefault;
                this.sidebarOpen = true;
            }
        });
    },
    methods: {
        section() {
            if (this.isClosed) {
                return '';
            }

            let section = this.sidebarSection;
            let isChannel = this.$state.getActiveBuffer().isChannel();

            if (section === 'settings' && isChannel) {
                return 'settings';
            } else if (section === 'user' && this.sidebarUser && isChannel) {
                return 'user';
            } else if (section === 'nicklist' && isChannel) {
                return 'nicklist';
            } else if (section === 'about') {
                return 'about';
            }

            return '';
        },
        close() {
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
        toggleNicklist() {
            this.sidebarSection === 'nicklist' ?
                this.close() :
                this.showNicklist();
        },
        toggleBufferSettings() {
            this.sidebarSection === 'settings' ?
                this.close() :
                this.showBufferSettings();
        },
        toggleAbout() {
            this.sidebarSection === 'about' ?
                this.close() :
                this.showAbout();
        },
    },
});

</script>

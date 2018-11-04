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
        isOpen() {
            return this.sidebarOpen;
        },
        isClosed() {
            return !this.isOpen;
        },
        canPin() {
            return this.isOpen && this.$state.ui.app_width > 769;
        },
    },
    created() {
        this.listen(this.$state, 'sidebar.component', (component) => {
            this.activeComponent = component;
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
            if (this.sidebarSection === 'user') {
                this.close();
                return;
            }
            this.activeComponent = null;
            this.sidebarUser = user;
            this.sidebarOpen = true;
            this.sidebarSection = 'user';
        },
        showNicklist() {
            if (this.sidebarSection === 'nicklist') {
                this.close();
                return;
            }
            this.activeComponent = null;
            this.sidebarOpen = true;
            this.sidebarSection = 'nicklist';
        },
        showBufferSettings() {
            if (this.sidebarSection === 'settings') {
                this.close();
                return;
            }
            this.activeComponent = null;
            this.sidebarOpen = true;
            this.sidebarSection = 'settings';
        },
        showAbout() {
            if (this.sidebarSection === 'about') {
                this.close();
                return;
            }
            this.activeComponent = null;
            this.sidebarOpen = true;
            this.sidebarSection = 'about';
        },
    },
});

</script>

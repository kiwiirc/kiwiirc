<script>
'kiwi public';

import Vue from 'vue';

export default Vue.extend({
    data() {
        return {
            sidebarOpen: false,
            // sidebarSection may be either '', 'user', 'settings', 'nicklist'
            sidebarSection: '',
            sidebarUser: null,
        };
    },
    computed: {
        isPinned() {
            // Pinned sidebar only works on full width windows otherwise its too small to see
            return this.sidebarPinned && this.canPin;
        },
        isOpen() {
            return !this.isPinned && this.sidebarOpen;
        },
        isClosed() {
            return !this.isOpen && !this.isPinned;
        },
        canPin() {
            return this.$state.ui.app_width > 769;
        },
        sidebarPinned() {
            return this.$state.setting('sidebarPinned');
        },
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
            }

            return '';
        },
        pin() {
            this.$state.setting('sidebarPinned', true);
            if (this.sidebarSection === '') {
                this.sidebarSection = 'nicklist';
            }
        },
        unpin() {
            this.$state.setting('sidebarPinned', false);
            this.close();
        },
        close() {
            this.sidebarOpen = false;
            this.sidebarSection = '';
            this.sidebarUser = null;
        },
        showUser(user) {
            this.sidebarUser = user;
            this.sidebarOpen = true;
            this.sidebarSection = 'user';
        },
        showNicklist() {
            this.sidebarOpen = true;
            this.sidebarSection = 'nicklist';
        },
        showBufferSettings() {
            this.sidebarOpen = true;
            this.sidebarSection = 'settings';
        },
    },
});

</script>

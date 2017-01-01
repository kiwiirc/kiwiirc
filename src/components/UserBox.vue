<template>
    <div class="kiwi-userbox">
        <h3><i class="fa fa-user kiwi-userbox-icon" aria-hidden="true"></i> {{user.nick}}</h3>
        <h4 class="kiwi-userbox-usermask">{{user.nick}}!{{user.username}}@{{user.host}}</h4>

        <div v-if="!whoisLoading" class="kiwi-userbox-whois">
            <span class="kiwi-userbox-whois-line">{{user.away ? 'Status: ' + user.away : 'Is available'}}</span>
            <span class="kiwi-userbox-whois-line" v-if="user.account">Account name: {{user.account}}</span>
            <span class="kiwi-userbox-whois-line">Real name: {{user.realname}}</span>
            <span class="kiwi-userbox-whois-line" v-if="user.bot">Is a bot</span>
            <span class="kiwi-userbox-whois-line" v-if="user.helpop">Is available for help</span>
            <span class="kiwi-userbox-whois-line" v-if="user.operator">Is an operator</span>
            <span class="kiwi-userbox-whois-line" v-if="user.server">Connected to {{user.server}} {{user.server_info ? `(${user.server_info})` : ''}}</span>
            <span class="kiwi-userbox-whois-line" v-if="user.secure">Securely connected via SSL/TLS</span>
            <span class="kiwi-userbox-whois-line" v-if="user.channels">Also in channels {{user.channels}}</span>
            <span class="kiwi-userbox-whois-line"></span>
        </div>
        <div v-else class="kiwi-userbox-whois kiwi-userbox-whois-loading">
            <i class="fa fa-spinner" aria-hidden="true"></i>
        </div>

        <div v-if="!whoisLoading" class="kiwi-userbox-options">
            <form class="u-form">
                <label>
                    <input type="checkbox" v-model="user.ignore" /> Ignore user
                </label>
                <label>
                    <a @click="openQuery" class="u-link">Send a message</a>
                </label>
            </form>
        </div>

        <a @click="closeBox" class="u-button u-button-primary">Close</a>
    </div>
</template>

<script>

import state from 'src/libs/state';

export default {
    data: function data() {
        return {
            whoisLoading: false,
        };
    },
    props: ['network', 'user'],
    methods: {
        closeBox: function closeViewer() {
            state.$emit('userbox.hide');
        },
        openQuery: function openQuery() {
            let buffer = state.addBuffer(this.network.id, this.user.nick);
            state.setActiveBuffer(this.network.id, buffer.name);
            this.closeBox();
        },
        updateWhoisData: function updateWhoisData() {
            this.whoisLoading = true;
            this.network.ircClient.whois(this.user.nick, () => {
                this.whoisLoading = false;
            });
        },
    },
    created: function created() {
        this.updateWhoisData();
    },
    updated: function updated() {
        let rect = this.$el.getBoundingClientRect();
        // $el may be in the middle of a transition still, making rect.top/rect.bottom
        // the current position of the transition and not where it will be after the
        // transition has ended. So read the top property directly from its style.
        let targetTop = parseInt((this.$el.style.top || '').replace('px', ''), 10);

        if (targetTop + rect.height > window.innerHeight) {
            this.$el.style.top = (window.innerHeight - rect.height) + 'px';
        }
    },
    watch: {
        user: function watchUser() {
            this.updateWhoisData();
        },
    },
};

</script>

<style>
.kiwi-userbox {
    box-sizing: border-box;
}
</style>

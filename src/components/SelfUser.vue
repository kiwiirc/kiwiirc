<template>
    <div class="kiwi-selfuser">
        <div class="close-icon" @click="hide">
            <i class="fa fa-times" aria-hidden="true"></i>
        </div>
        <div class="kiwi-selfuser-mask">
            <span class="kiwi-selfuser-nick">{{network.nick}}</span>
            <span class="kiwi-selfuser-host">{{netUser.username}}@{{netUser.host}}</span>
        </div>
        <div class="kiwi-selfuser-modes">{{modeString}}</div>
        <div class="kiwi-selfuser-actions">
            <input-prompt @submit="changeNick" :label="$t('change_nick')+':'"><a class="u-link">{{$t('change_nick')}}</a></input-prompt>
        </div>
    </div>
</template>

<script>

export default {
    data: function data() {
        return {
        };
    },
    props: ['network', 'parent'],
    computed: {
        modeString() {
            let str = '';
            this.network.ircClient.user.modes.forEach(mode => {
                str += mode;
            });

            // Only show the + if there are modes to show
            if (str) {
                str = '+' + str;
            }

            return 'User modes: ' + str;
        },
        netUser() {
            return this.network.ircClient.user;
        },
    },
    methods: {
        hide: function hide() {
            this.parent.selfuser_open = false;
        },
        changeNick(newNick) {
            let nick = newNick.trim();
            if (!nick.match(/(^[0-9])|(\s)/)) {
                this.network.ircClient.changeNick(newNick);
            }
        },
    },
};
</script>

<style>
.kiwi-selfuser {
    box-sizing: border-box;
    padding: 1em;
}

.kiwi-selfuser .close-icon {
    position: absolute;
    right: 0;
    top: 0;
    color: #fff;
    cursor: pointer;
    font-size: 0.8em;
    padding: 0.2em 0.4em;
    border-radius: 0 0 0 0.4em;
    transition: all 0.3s;
    background-color: #fc6262;
}

.kiwi-selfuser-nick {
    display: block;
    font-weight: bold;
    font-size: 1.1em;
}

.kiwi-selfuser-host {
    font-style: italic;
}

.kiwi-selfuser-actions {
    margin-top: 1em;
    padding-top: 1em;
}

.kiwi-selfuser-actions .u-input {
    margin-bottom: 10px;
}
</style>

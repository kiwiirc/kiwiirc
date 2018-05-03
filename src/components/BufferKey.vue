<template>
    <div class="kiwi-bufferkey">
        <form @submit.prevent="joinChannel">
            {{$t('bufferkey_input')}} <input type="password" v-model='buffer.key'></input>
            <div class="kiwi-bufferkey-buttons">
                <span @click="joinChannel" class="kiwi-bufferkey-button">
                    <i class="fa fa-arrow-circle-o-right" aria-hidden="true"></i>
                    {{$t('bufferkey_rejoin', {channel: buffer.name})}}
                </span>
            </div>
        </form>
    </div>
</template>

<script>

export default {
    data: function data() {
        return {
        };
    },
    props: ['buffer', 'network'],
    computed: {
    },
    methods: {
        joinChannel: function joinChannel() {
            this.buffer.flags.channel_badkey = false;
            this.buffer.join();
        },
    },
};
</script>

<style lang="less">
.kiwi-bufferkey {
    box-sizing: border-box;
    text-align: center;
    padding: 10% 0;
    margin: 10px 0 0 0;
    transition: background-color 0.3s;
}

.kiwi-bufferkey-buttons {
    width: 100%;
    text-align: center;
    font-size: 1.6em;
    padding-top: 1em;
}

.kiwi-bufferkey-button {
    width: auto;
    display: inline-block;
    padding: 0.8em 1em 0.8em 0.6em;
    font-size: 0.8em;
    border-radius: 0.4em;
    margin: 0 0.8em;
    cursor: pointer;
    transition: all 0.3s;

    &:hover {
        transition: all 0.2s;
    }

    i {
        float: left;
        font-size: 1.6em;
        line-height: 0.8em;
        margin-right: 0.4em;
    }
}

@media screen and (max-width: 1024px) {
    .kiwi-bufferkey-button {
        clear: both;
        margin: 0 5% 1em;
        font-size: 1em;
        display: block;
        padding: 0.6em 0.8em 0.6em 0.4em;
        width: 90%;
        box-sizing: border-box;
    }

    .kiwi-bufferkey-button i {
        display: none;
    }
}

@media screen and (max-width: 769px) {
    .kiwi-bufferkey {
        font-size: 0.8em;
    }

    .kiwi-bufferkey-button {
        font-size: 0.7em;
    }
}

</style>

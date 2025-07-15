<template>
    <div class="kiwi-bufferkey kiwi-warning-block">
        <form @submit.prevent="joinChannel">
            <label>{{ $t('bufferkey_input') }}</label>
            <input v-model="buffer.key" v-focus type="password">
            <div class="kiwi-bufferkey-buttons">
                <span class="kiwi-bufferkey-button" @click="joinChannel">
                    <i class="fa fa-arrow-circle-o-right" aria-hidden="true" />
                    {{ $t('bufferkey_rejoin', {channel: buffer.name}) }}
                </span>
            </div>
        </form>
    </div>
</template>

<script>
'kiwi public';

export default {
    props: ['buffer', 'network'],
    data: function data() {
        return {
        };
    },
    methods: {
        joinChannel() {
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

.kiwi-bufferkey label {
    width: 340px;
    display: block;
    margin: 0 auto 10px auto;
    font-size: 1.2em;
    text-align: left;
}

.kiwi-bufferkey input[type="password"] {
    height: 40px;
    padding: 0 10px;
    border-radius: 4px;
    color: #000;
    border: none;
    width: 320px;
    font-size: 1.2em;
    margin: 0 0 20px 0;
}

.kiwi-bufferkey-buttons {
    width: 100%;
    text-align: center;
    font-size: 1.6em;
}

.kiwi-bufferkey-buttons span:hover {
    text-decoration: underline;
}

.kiwi-bufferkey-button {
    width: auto;
    display: inline-block;
    font-size: 0.8em;
    cursor: pointer;
    transition: all 0.3s;
    border-radius: 4px;
    padding: 5px 20px;
    line-height: 40px;
    border: 1px solid;

    &:hover {
        transition: all 0.2s;
    }

    i {
        float: left;
        font-size: 1.6em;
        line-height: 40px;
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

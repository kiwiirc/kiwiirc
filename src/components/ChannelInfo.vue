<template>
    <div class="kiwi-channelinfo">
        <form :class="{ 'kiwi-channelinfo-disabled': !areWeAnOp() }"
              class="u-form kiwi-channelinfo-basicmodes" @submit.prevent="">

            <label class="kiwi-channelinfo-topic">
                <span>{{ $t('channel_topic') }}</span>
                <textarea v-model.lazy="topic" :disabled="!areWeAnOp()" rows="2"/>
            </label>

            <div v-if="buffer.topics.length > 1" class="kiwi-channelinfo-previoustopics">
                <a class="u-link" @click="showPrevTopics = !showPrevTopics">
                    Previous topics
                    <i :class="'fa fa-caret-' + (showPrevTopics ? 'up' : 'down')" />
                </a>
                <ul v-if="showPrevTopics">
                    <li v-for="(topic, idx) in buffer.topics" :key="idx">
                        <span>{{ topic }}</span>
                    </li>
                </ul>
            </div>

            <label class="u-checkbox-wrapper">
                <span>{{ $t('channel_moderated') }}</span>
                <input v-model="modeM" :disabled="!areWeAnOp()" type="checkbox">
            </label>
            <label class="u-checkbox-wrapper">
                <span>{{ $t('channel_invite') }}</span>
                <input v-model="modeI" :disabled="!areWeAnOp()" type="checkbox">
            </label>
            <label class="u-checkbox-wrapper">
                <span>{{ $t('channel_moderated_topic') }}</span>
                <input v-model="modeT" :disabled="!areWeAnOp()" type="checkbox">
            </label>
            <label class="u-checkbox-wrapper">
                <span>{{ $t('channel_external') }}</span>
                <input v-model="modeN" :disabled="!areWeAnOp()" type="checkbox">
            </label>
            <label>
                <span>{{ $t('password') }}</span>
                <input v-model.lazy="modeK" :disabled="!areWeAnOp()" type="text" class="u-input">
            </label>
        </form>
    </div>
</template>

<script>
'kiwi public';

// Helper to generate Vues computed methods for simple channel modes.
// Eg. +i, +n, etc
function generateComputedMode(mode) {
    return {
        get() {
            return this.modeVal(mode);
        },
        set(newVal) {
            return this.setMode((newVal ? '+' : '-') + mode);
        },
    };
}

// Helper to generate Vues computed methods for channel modes with a parameter
// Eg. "+k key"
function generateComputedModeWithParam(mode) {
    return {
        get() {
            let val = this.modeVal(mode);
            return val === false ?
                '' :
                val;
        },
        set(newVal) {
            if (newVal) {
                this.setMode('+' + mode, newVal);
            } else {
                this.setMode('-' + mode);
            }
        },
    };
}

export default {
    props: ['buffer'],
    data: function data() {
        return {
            showPrevTopics: false,
        };
    },
    computed: {
        modeM: generateComputedMode('m'),
        modeI: generateComputedMode('i'),
        modeT: generateComputedMode('t'),
        modeN: generateComputedMode('n'),
        modeK: generateComputedModeWithParam('k'),
        topic: {
            get() {
                return this.buffer.topic;
            },
            set(newVal) {
                let newTopic = newVal.replace('\n', ' ');
                this.buffer.getNetwork().ircClient.setTopic(this.buffer.name, newTopic);
            },
        },
    },
    methods: {
        updateBanList() {
            this.buffer.getNetwork().ircClient.raw('MODE', this.buffer.name, '+b');
        },
        setMode(mode, param) {
            this.buffer.getNetwork().ircClient.raw('MODE', this.buffer.name, mode, param);
        },
        modeVal(mode) {
            let val = false;

            if (typeof this.buffer.modes[mode] === 'undefined') {
                // Specifically undefined = mode not set
                val = false;
            } else if (!this.buffer.modes[mode]) {
                // Falsy value = mode set without value
                val = true;
            } else {
                // Anything else = mode set with a value
                val = this.buffer.modes[mode];
            }

            return val;
        },
        areWeAnOp() {
            return this.buffer.isUserAnOp(this.buffer.getNetwork().nick);
        },
    },
};
</script>

<style>
    .kiwi-channelinfo-disabled-alert {
        width: 100%;
        padding: 10px 5px;
        cursor: default;
        text-align: center;
        margin: 5px 0;
        display: inline-block;
        box-sizing: border-box;
        font-size: 1.2em;
        background-color: #d16c6c;
        color: #fff;
    }

.kiwi-channelinfo-previoustopics {
    margin: 0 10px 15px 10px;
}

.kiwi-channelinfo-previoustopics ul {
    margin-top: 0;
}

.kiwi-channelinfo-basicmodes {
    margin-bottom: 2.5em;
}

.kiwi-channelinfo-disabled {
    opacity: 0.5;
}

    .kiwi-channelinfo-disabled {
        position: relative;
        opacity: 0.7;
    }

</style>


<template>
    <div class="kiwi-channelinfo">
        <form class="u-form kiwi-channelinfo-basicmodes" @submit.prevent="">
            <label class="kiwi-channelinfo-topic">
                <span>{{ $t('channel_topic') }}</span>
                <textarea v-model.lazy="topic" rows="2" :readonly="!areWeAnOp" />
            </label>

            <div v-if="buffer.topics.length > 1" class="kiwi-channelinfo-previoustopics">
                <a class="u-link" @click="showPrevTopics = !showPrevTopics">
                    Previous topics
                    <i :class="`fa fa-caret-${showPrevTopics ? 'up' : 'down'}`" />
                </a>
                <ul v-if="showPrevTopics">
                    <li v-for="(topicText, idx) in prevTopics" :key="idx">
                        <span>{{ topicText }}</span>
                    </li>
                </ul>
            </div>

            <label class="u-checkbox-wrapper">
                <span>{{ $t('channel_moderated') }}</span>
                <input v-model="modeM" type="checkbox" :disabled="!areWeAnOp">
            </label>
            <label class="u-checkbox-wrapper">
                <span>{{ $t('channel_invite') }}</span>
                <input v-model="modeI" type="checkbox" :disabled="!areWeAnOp">
            </label>
            <label class="u-checkbox-wrapper">
                <span>{{ $t('channel_secret') }}</span>
                <input v-model="modeS" type="checkbox" :disabled="!areWeAnOp">
            </label>
            <label class="u-checkbox-wrapper">
                <span>{{ $t('channel_moderated_topic') }}</span>
                <input v-model="modeT" type="checkbox" :disabled="!areWeAnOp">
            </label>
            <label class="u-checkbox-wrapper">
                <span>{{ $t('channel_external') }}</span>
                <input v-model="modeN" type="checkbox" :disabled="!areWeAnOp">
            </label>
            <label class="kiwi-channelinfo-password">
                <span>{{ $t('password') }}</span>
                <input v-model.lazy="modeK" type="text" class="u-input" :readonly="!areWeAnOp">
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
                this.setMode('-' + mode, this.modeVal(mode));
            }
        },
    };
}

export default {
    props: ['buffer'],
    data() {
        return {
            showPrevTopics: false,
        };
    },
    computed: {
        modeM: generateComputedMode('m'),
        modeI: generateComputedMode('i'),
        modeS: generateComputedMode('s'),
        modeT: generateComputedMode('t'),
        modeN: generateComputedMode('n'),
        modeK: generateComputedModeWithParam('k'),
        topic: {
            get() {
                return this.buffer.topic;
            },
            set(newVal) {
                let newTopic = newVal.replace('\n', ' ');
                if (!newTopic.trim()) {
                    this.buffer.getNetwork().ircClient.raw(`TOPIC ${this.buffer.name} :`);
                } else {
                    this.buffer.getNetwork().ircClient.setTopic(this.buffer.name, newTopic);
                }
            },
        },
        prevTopics() {
            return this.buffer.topics.slice(1).filter((topic) => topic.trim());
        },
        areWeAnOp() {
            return this.buffer.isUserAnOp(this.buffer.getNetwork().nick);
        },
    },
    methods: {
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
    },
};
</script>

<style lang="less">
.kiwi-channelinfo {
    .kiwi-channelinfo-topic {
        margin-bottom: 10px;
    }

    .kiwi-channelinfo-password {
        margin-top: 10px;
    }
}

.kiwi-channelinfo-previoustopics {
    margin-bottom: 10px;
}

.kiwi-channelinfo-previoustopics ul {
    margin-top: 0;
    margin-left: 6px;
}
</style>

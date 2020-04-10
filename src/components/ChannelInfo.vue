<template>
    <div class="kiwi-channelinfo">
        <form class="u-form kiwi-channelinfo-basicmodes" @submit.prevent="">
            <label class="kiwi-channelinfo-topic">
                <span>{{ $t('channel_topic') }}</span>
                <textarea v-model.lazy="topic" rows="2"/>
            </label>

            <div v-if="buffer.topics.length > 1" class="kiwi-channelinfo-previoustopics">
                <a class="u-link" @click="showPrevTopics = !showPrevTopics">
                    Previous topics
                    <i :class="'fa fa-caret-' + (showPrevTopics ? 'up' : 'down')" />
                </a>
                <ul v-if="showPrevTopics">
                    <li v-for="(topicText, idx) in prevTopics" :key="idx">
                        <span>{{ topicText.trim() }}</span>
                    </li>
                </ul>
            </div>

            <label class="u-checkbox-wrapper">
                <span>{{ $t('channel_moderated') }}</span>
                <input v-model="modeM" type="checkbox" >
            </label>
            <label class="u-checkbox-wrapper">
                <span>{{ $t('channel_invite') }}</span>
                <input v-model="modeI" type="checkbox" >
            </label>
            <label class="u-checkbox-wrapper">
                <span>{{ $t('channel_moderated_topic') }}</span>
                <input v-model="modeT" type="checkbox" >
            </label>
            <label class="u-checkbox-wrapper">
                <span>{{ $t('channel_external') }}</span>
                <input v-model="modeN" type="checkbox" >
            </label>
            <label>
                <span>{{ $t('password') }}</span>
                <input v-model.lazy="modeK" type="text" class="u-input" >
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
        get: function computedModeGet() {
            return this.modeVal(mode);
        },
        set: function computedModeSet(newVal) {
            return this.setMode((newVal ? '+' : '-') + mode);
        },
    };
}

// Helper to generate Vues computed methods for channel modes with a parameter
// Eg. "+k key"
function generateComputedModeWithParam(mode) {
    return {
        get: function computedModeWithParamGet() {
            let val = this.modeVal(mode);
            return val === false ?
                '' :
                val;
        },
        set: function computedModeWithParamSet(newVal) {
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
            get: function computedTopicGet() {
                return this.buffer.topic;
            },
            set: function computedTopicSet(newVal) {
                let newTopic = newVal.replace('\n', ' ');
                // TODO: Update irc-framework to insert a trailing : if the last argument is an
                //       empty string. The trailing : makes a difference between things like
                //       requesting a topic and changing to an empty topic
                if (!newTopic.trim()) {
                    this.buffer.getNetwork().ircClient.raw(`TOPIC ${this.buffer.name} :`);
                } else {
                    this.buffer.getNetwork().ircClient.setTopic(this.buffer.name, newTopic);
                }
            },
        },
        prevTopics() {
            return this.buffer.topics.filter(topic => topic.trim());
        },
    },
    methods: {
        updateBanList: function updateBanList() {
            this.buffer.getNetwork().ircClient.raw('MODE', this.buffer.name, '+b');
        },
        setMode: function setMode(mode, param) {
            this.buffer.getNetwork().ircClient.raw('MODE', this.buffer.name, mode, param);
        },
        modeVal: function modeVal(mode) {
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
        areWeAnOp: function areWeAnOp() {
            return this.buffer.isUserAnOp(this.buffer.getNetwork().nick);
        },
    },
};
</script>

<style>

.kiwi-channelinfo-previoustopics {
    margin: 0 10px 15px 10px;
}

.kiwi-channelinfo-previoustopics ul {
    margin-top: 0;
}

</style>

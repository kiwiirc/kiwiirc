<template>
    <div class="kiwi-channelinfo">
        <form class="u-form kiwi-channelinfo-basicmodes" @submit.prevent="">
            <label class="kiwi-channelinfo-topic">
                <span>{{$t('channel_topic')}}</span>
                <textarea v-model.lazy="topic" rows="2"></textarea>
            </label>

            <label>
                <input type="checkbox" v-model="modeM" />
                <span>{{$t('channel_moderated')}}</span>
            </label>
            <label>
                <input type="checkbox" v-model="modeI" />
                <span>{{$t('channel_invite')}}</span>
            </label>
            <label>
                <input type="checkbox" v-model="modeT" />
                <span>{{$t('channel_moderated_topic')}}</span>
            </label>
            <label>
                <input type="checkbox" v-model="modeN" />
                <span>{{$t('channel_external')}}</span>
            </label>
            <label>
                <span>{{$t('password')}}</span>
                <input type="text" class="u-input" v-model.lazy="modeK" />
            </label>
        </form>
    </div>
</template>

<script>

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
                this.setMode('-' + mode);
            }
        },
    };
}

export default {
    data: function data() {
        return {
        };
    },
    props: ['buffer'],
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
                this.buffer.getNetwork().ircClient.setTopic(this.buffer.name, newTopic);
            },
        },
    },
    created: function created() {
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
};
</script>

<style lang="less">
</style>

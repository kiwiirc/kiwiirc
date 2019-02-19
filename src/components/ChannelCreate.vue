<template>
    <div v-if="displayCreateChannel"
         class="kiwi-messagelist-create-channel">
        <div class="kiwi-messagelist-create-channel-wrapper">
            <h1>You have created the <span>{{ buffer.name }}</span> channel</h1>
            <multiselect
                v-model="value"
                :multiple="true"
                :options="userList"
                placeholder="Invite users to channel"
            />
            <p class="kiwi-messagelist-create-channel-password-toggle">
                <span>Add a password to this channel?
                    <i class="fa fa-lock" aria-hidden="true"/>
                </span>
            </p>
            <p v-if="value.length != 0">
                <span class="u-button u-button-primary" href="">
                    Invite users to channel
                </span>
            </p>
            <p v-if="value.length === 0"
               class="kiwi-messagelist-create-channel-skip">
                No thanks, can I just
                <span class="u-button u-button-primary" @click="initFunction()">
                    continue to channel
                </span>
            </p>
        </div>
    </div>
</template>

<script>
'kiwi public';

import Multiselect from 'vue-multiselect';

export default {
    components: {
        Multiselect,
    },
    props: ['buffer'],
    data: function data() {
        return {
            displayCreateChannel: true,
            value: [],
            userList: Object.keys(this.buffer.getNetwork().users),
        };
    },
    computed: {

    },
    methods: {
        initFunction() {
            console.log(this.buffer);
        },
    },
};
</script>

<style lang="less">

    .kiwi-messagelist-create-channel {
        display: block;
        display: flex;
        align-items: center;
        justify-content: center;
        text-align: center;
        min-height: 100vh;
    }

    .kiwi-messagelist-create-channel-wrapper {
        max-width: 600px;
    }

    .kiwi-messagelist-create-channel-wrapper h1 {
        cursor: default;
        margin: 0 0 20px 0;
    }

    .kiwi-messagelist-create-channel-wrapper h1 span {
        color: #42b992;
    }

    .kiwi-messagelist-create-channel-password-toggle {
        opacity: 0.8;
    }

    .kiwi-messagelist-create-channel-wrapper .multiselect {
        margin: 0 0 20px 0;
    }

    .kiwi-messagelist-create-channel-skip {
        color: #5f5f5f;
        margin: 0;
    }

    .kiwi-messagelist-create-channel-skip .u-button {
        text-decoration: none;
        color: #fff;
        margin-left: 5px;
        line-height: 20px;
        opacity: 0.6;
        transition: opacity 0.2s;
    }

    .kiwi-messagelist-create-channel-skip .u-button:hover {
        opacity: 1;
    }

</style>

<style src="vue-multiselect/dist/vue-multiselect.min.css"></style>

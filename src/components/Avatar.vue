<template>
    <div
        :style="avatarStyle"
        :data-nick="message&&message.nick"
        class="kiwi-avatar"
    >
        <span>{{ !avatar&&firstNickLetter || '' }}</span>
    </div>
</template>

<script>

'kiwi public';

export default {
    props: ['message', 'user', 'small'],
    computed: {
        avatar() {
            return (this.message && this.message.avatar) || (this.user && this.user.avatar);
        },
        firstNickLetter() {
            return ((this.message && this.message.nick) || (this.user && this.user.nick))[0];
        },
        avatarStyle() {
            let style = '';
            let avatar = this.avatar;
            if (avatar) {
                let url = avatar;
                if (this.small) {
                    url = url.replace(/\.jpg$/, '_small.jpg');
                }
                style = `background-image: url("${url}")`;
            } else {
                style = `background-color: ${this.colour};`;
            }
            return style;
        },
        colour() {
            let user = (this.message && this.message.user) || this.user;
            return user.getColour();
        },
    },
};

</script>

<style>

.kiwi-avatar {
    text-transform: uppercase;
    cursor: pointer;
    width: 40px;
    height: 40px;
    border-radius: 50%;
    text-align: center;
    line-height: 40px;
    font-weight: 600;
    margin-top: 3px;
    border: 2px solid;
    background-size: cover;
    background-repeat: no-repeat;
    background-position: center;
}

</style>

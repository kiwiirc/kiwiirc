<template>
    <div
        :data-nick="message&&message.nick"
        :class="[hasAvatar ? 'kiwi-avatar--image' : '']"
        class="kiwi-avatar"
    >
        <span :style="avatarStyle">{{ hasAvatar ? '' : firstNickLetter }}</span>
    </div>
</template>

<script>

'kiwi public';

export default {
    props: ['message', 'user', 'size'],
    computed: {
        avatar() {
            return (this.message && this.message.avatar) || (this.user && this.user.avatar);
        },
        firstNickLetter() {
            return ((this.message && this.message.nick) || (this.user && this.user.nick) || '')[0];
        },
        hasAvatar() {
            return !!(this.avatar && (this.avatar.small || this.avatar.large));
        },
        avatarStyle() {
            let style = {};
            if (this.hasAvatar) {
                let url = (this.size === 'small' && this.avatar.small) ?
                    this.avatar.small :
                    this.avatar.large;
                style['background-image'] = `url("${url}")`;
            } else {
                style['background-color'] = `${this.colour}`;
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

.kiwi-avatar > span {
    text-transform: uppercase;
    cursor: pointer;
    width: 100%;
    height: 100%;
    border-radius: 50%;
    font-weight: 600;
    margin-top: 3px;
    border: 2px solid;
    background-size: cover;
    background-repeat: no-repeat;
    background-position: center;
    display: flex;
    align-items: center;
    justify-content: center;
    box-sizing: border-box;
}

.kiwi-avatar--image > span {
    border: none;

    /* box-shadow: 0 0 3px 1px rgba(0, 0, 0, 0.5); */
}

</style>

<template functional>
    <div
        :data-nick="props.message&&props.message.nick"
        :class="[$options.m.hasAvatar(props) ? 'kiwi-avatar--image' : '', data.staticClass]"
        class="kiwi-avatar"
    >
        <span :style="$options.m.avatarStyle(props)">
            {{ $options.m.hasAvatar(props) ? '' : $options.m.firstNickLetter(props) }}
        </span>
    </div>
</template>

<script>

'kiwi public';

const methods = {
    props: {},
    avatar(props) {
        // let props = this.props;
        return (props.message && props.message.avatar) || (props.user && props.user.avatar);
    },
    firstNickLetter(props) {
        // let props = this.props;
        return ((props.message && props.message.nick) || (props.user && props.user.nick) || '')[0];
    },
    hasAvatar(props) {
        // let props = this.props;
        return !!(props.user.avatar && (props.user.avatar.small || props.user.avatar.large));
    },
    avatarStyle(props) {
        // let props = this.props;
        let style = {};
        if (this.hasAvatar(props)) {
            let url = (props.size === 'small' && this.avatar(props).small) ?
                this.avatar(props).small :
                this.avatar(props).large;
            style['background-image'] = `url("${url}")`;
        } else {
            style['background-color'] = `${this.colour(props)}`;
        }

        return style;
    },
    colour(props) {
        // let props = this.props;
        let user = (props.message && props.message.user) || props.user;
        return user.getColour();
    },
};

export default {
    props: {
        message: Object,
        user: Object,
        size: String,
    },
    m: methods,
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

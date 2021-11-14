<template functional>
    <div
        :data-nick="$options.m.nick(props)"
        :class="[$options.m.hasAvatar(props) ? 'kiwi-avatar--image' : '', data.staticClass]"
        class="kiwi-avatar"
    >
        <span
            :style="$options.m.avatarStyle(props)"
            :class="{'kiwi-avatar--default': $options.m.isDefault(props)}"
            class="kiwi-avatar-inner"
        >
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
    nick(props) {
        return ((props.message && props.message.nick) || (props.user && props.user.nick) || '').toLowerCase();
    },
    firstNickLetter(props) {
        // let props = this.props;
        return this.nick(props)[0].toUpperCase();
    },
    hasAvatar(props) {
        // let props = this.props;
        return !!(props.user.avatar && (props.user.avatar.small || props.user.avatar.large));
    },
    isDefault(props) {
        return !this.colour(props) && !this.hasAvatar(props);
    },
    avatarStyle(props) {
        // let props = this.props;
        let style = {};
        if (this.hasAvatar(props)) {
            let url = (props.size === 'small' && this.avatar(props).small) ?
                this.avatar(props).small :
                // If large was requested but does not exist fallback to small
                this.avatar(props).large || this.avatar(props).small;
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

.kiwi-avatar {
    width: 100%;
    height: 100%;
}

.kiwi-avatar-inner {
    text-transform: uppercase;
    cursor: pointer;
    width: 100%;
    height: 100%;
    border: 2px solid;
    border-radius: 50%;
    font-weight: 600;
    background-size: cover;
    background-repeat: no-repeat;
    background-position: center;
    display: flex;
    align-items: center;
    justify-content: center;
    box-sizing: border-box;
    user-select: none;
}

.kiwi-avatar--image > .kiwi-avatar-inner {
    border: none;

    /* box-shadow: 0 0 3px 1px rgba(0, 0, 0, 0.5); */
}

</style>

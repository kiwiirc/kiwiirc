<template>
    <Avatar :user="user" :message="message" :small="small"/>
</template>

<script>

'kiwi public';

import Avatar from './Avatar';

export default {
    props: ['message', 'user', 'small'],
    components: {Avatar}
};

</script>

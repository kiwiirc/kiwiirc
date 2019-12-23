<template>
    <Avatar :user="user" :message="message" />
</template>

<script>

'kiwi public';

import Avatar from './Avatar';

export default {
    components: { Avatar },
    props: ['message', 'user', 'small'],
};

</script>

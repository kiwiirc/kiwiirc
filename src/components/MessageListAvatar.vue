<template>
    <Avatar :user="user" :message="message" size="small" />
</template>

<script>

'kiwi public';

import Avatar from './Avatar';

// This component simply wraps the Avatar component so that plugins may override this messagelist
// avatar separately than the nicklist avatar
export default {
    components: { Avatar },
    props: ['message', 'user'],
};

</script>

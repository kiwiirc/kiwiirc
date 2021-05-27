<template>
    <div class="kiwi-ignorelist-container">
        <h3>{{ $t('ignore_list') }}</h3>
        <table v-if="ignoredUsers.length > 0" class="kiwi-ignorelist-table">
            <tr v-for="user in ignoredUsers" :key="user.nick">
                <td>{{ user.nick }}</td>
                <td>
                    <a class="u-link" @click="user.ignore = false">Remove</a>
                </td>
            </tr>
        </table>
        <span v-else class="kiwi-ignorelist-empty">{{ $t('ignore_list_empty') }}</span>
    </div>
</template>

<script>
'kiwi public';

import _ from 'lodash';

export default {
    props: ['network'],
    computed: {
        ignoredUsers() {
            return _.filter(this.network.users, (u) => u.ignore);
        },
    },
};
</script>

<style>

.kiwi-ignorelist-container {
    max-width: 400px;
    width: auto;
    display: block;
    box-sizing: border-box;
    margin: 20px auto 20px auto;
}

.kiwi-ignorelist-container h3 {
    width: 100%;
    line-height: 45px;
    padding: 0 10px;
    box-sizing: border-box;
    text-align: center;
}

.kiwi-ignorelist-container table {
    width: 100%;
}

.kiwi-ignorelist-container table tr:last-of-type td {
    border-bottom: none;
}

.kiwi-ignorelist-table td:nth-child(1) {
    min-width: 250px;
    padding: 0 20px;
}

.kiwi-ignorelist-table td:nth-child(2) {
    text-align: center;
}

.kiwi-ignorelist-empty {
    padding-left: 20px;
}

</style>

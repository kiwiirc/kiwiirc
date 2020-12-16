// SPDX-FileCopyrightText: 2016- 2020, Darren Whitlen <darren@kiwiirc.com>
// SPDX-License-Identifier: Apache-2.0

import Vue from 'vue';
import StartupError from '@/components/StartupError';

Vue.mixin({
    computed: {
        $t() {
            return (key, options) => key;
        },
    },
});

describe('StartupError.vue', () => {
    it('should render correct contents', () => {
        const vm = new Vue({
            el: document.createElement('div'),
            render: (h) => h(StartupError, { props: { error: 'some error' } }),
        });
        expect(vm.$el.querySelector('div').textContent).toEqual('some error');
    });
});

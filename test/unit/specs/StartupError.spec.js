import Vue from 'vue';
import StartupError from '@/components/StartupError';

Vue.mixin({
    computed: {
        $t() {
            return (key, options) => {
                return key;
            };
        },
    },
});

describe('StartupError.vue', () => {
    it('should render correct contents', () => {
        const vm = new Vue({
            el: document.createElement('div'),
            render: (h) => h(StartupError),
        });
        expect(vm.$el.querySelector('h2').textContent).to.equal('error_starting');
        expect(vm.$el.querySelector('h3').textContent).to.equal('error_installed');
    });
});

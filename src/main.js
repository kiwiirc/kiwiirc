import Vue from 'vue';
import App from './App';

import state from 'src/libs/state';
window.state = state;


/* eslint-disable no-new */
new Vue({
    el: '#app',
    render: h => h(App),
});

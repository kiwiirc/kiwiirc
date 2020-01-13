<template>
    <div>
        <div
            v-if="recaptchaSiteId"
            id="kiwi-captcha"
        />
    </div>
</template>

<script>

'kiwi public';

export default {
    data() {
        return {
            recaptchaSiteId: '',
            recaptchaResponse: '',
        };
    },
    computed: {
        isReady() {
            return !this.recaptchaSiteId || this.recaptchaResponse;
        },
    },
    created() {
        let options = this.$state.settings.startupOptions;
        this.recaptchaSiteId = options.recaptchaSiteId || '';

        this.$state.$on('network.connecting', (event) => {
            event.network.ircClient.once('socket connected', () => {
                event.network.ircClient.raw('CAPTCHA', this.recaptchaResponse);
            });
        });
    },
    mounted() {
        if (!this.recaptchaSiteId) {
            this.$emit('ready', true);
            return;
        }
        window.recaptchaLoaded = () => {
            window.grecaptcha.render('kiwi-captcha', {
                sitekey: this.recaptchaSiteId,
                callback: this.recaptchaSuccess,
                'expired-callback': this.recaptchaExpired,
            });
        };

        let scr = document.createElement('script');
        scr.src = 'https://www.google.com/recaptcha/api.js?onload=recaptchaLoaded&render=explicit';
        scr.defer = true;
        this.$el.appendChild(scr);
    },
    methods: {
        recaptchaSuccess(response) {
            this.recaptchaResponse = response;
            this.$emit('ready', true);
        },
        recaptchaExpired() {
            this.recaptchaResponse = '';
            this.$emit('ready', false);
        },
    },
};
</script>

<template>
    <div v-if="recaptchaSiteId">
        <div ref="captchacontainer" />
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

        this.listen(this.$state, 'network.connecting', (event) => {
            event.network.ircClient.once('socket connected', () => {
                // There should always be a captcha response at this point but just in case
                // there isn't...
                if (this.recaptchaResponse) {
                    event.network.ircClient.raw('CAPTCHA', this.recaptchaResponse);
                }
            });
        });
    },
    mounted() {
        if (!this.recaptchaSiteId) {
            this.$emit('ready', true);
            return;
        }

        // Recaptcha calls this callback once it's loaded and ready to be used
        window.recaptchaLoaded = () => {
            window.grecaptcha.render(this.$refs.captchacontainer, {
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

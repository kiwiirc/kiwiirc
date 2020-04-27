<template>
    <div>
        <div v-if="showCaptcha" ref="captchacontainer" />
    </div>
</template>

<script>

'kiwi public';

export default {
    props: ['network'],
    data() {
        return {
            recaptchaSiteId: '',
            recaptchaResponse: '',
            showCaptcha: false,
        };
    },
    created() {
        let options = this.$state.settings.startupOptions;
        this.recaptchaSiteId = options.recaptchaSiteId || '';

        this.listen(this.$state, 'network.connecting', (event) => {
            event.network.ircClient.once('socket connected', () => {
                if (this.recaptchaResponse) {
                    event.network.ircClient.raw('CAPTCHA', this.recaptchaResponse);
                }
            });
        });

        this.listen(this.$state, 'irc.raw.CAPTCHA', (command, event, network) => {
            if (network !== this.network) {
                return;
            }

            if (event.params[0] === 'NEEDED') {
                this.loadRecaptcha();
            }
        });
    },
    methods: {
        loadRecaptcha() {
            this.showCaptcha = true;

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
        recaptchaSuccess(response) {
            this.recaptchaResponse = response;

            // If we have a network instance already, send the captcha response
            if (this.network && this.network.state === 'connecting') {
                this.network.ircClient.raw('CAPTCHA', response);
            }
            this.showCaptcha = false;
        },
        recaptchaExpired() {
            this.recaptchaResponse = '';
        },
    },
};
</script>

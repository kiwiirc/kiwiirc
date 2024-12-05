<template>
    <div>
        <div v-if="showCaptcha" ref="captchacontainer" />
    </div>
</template>

<script>

'kiwi public';

import Logger from '@/libs/Logger';

let log = Logger.namespace('Captcha');

export default {
    props: ['network'],
    data() {
        return {
            captchaUrl: '',
            captchaSiteId: '',
            captchaResponse: '',
            showCaptcha: false,
        };
    },
    created() {
        let options = this.$state.settings.startupOptions;
        this.captchaSiteId = options.captchaSiteId || options.recaptchaSiteId || '';
        try {
            this.captchaUrl = new URL(options.captchaUrl || options.recaptchaUrl || 'https://www.google.com/recaptcha/api.js');
            const params = this.captchaUrl.searchParams;
            params.set('onload', 'captchaLoaded');
            params.set('render', 'explicit');
        } catch (error) {
            log.error('failed to create captcha url', error);
        }

        this.listen(this.$state, 'network.connecting', (event) => {
            event.network.ircClient.once('socket connected', () => {
                if (this.captchaResponse) {
                    event.network.ircClient.raw('CAPTCHA', this.captchaResponse);
                }
            });
        });

        this.listen(this.$state, 'irc.raw.CAPTCHA', (command, event, network) => {
            if (network !== this.network) {
                return;
            }

            if (event.params[0] === 'NEEDED') {
                this.loadCaptcha();
            }
        });
    },
    methods: {
        getCaptcha() {
            return window.grecaptcha ?? window.turnstile ?? window.hcaptcha;
        },
        loadCaptcha() {
            if (this.getCaptcha()) {
                this.captchaShow();
                return;
            }

            // captcha calls this callback once it's loaded and ready to be used
            window.captchaLoaded = () => {
                this.captchaShow();
            };

            let scr = document.createElement('script');
            scr.src = this.captchaUrl.toString();
            scr.defer = true;
            document.head.appendChild(scr);
        },
        captchaShow() {
            this.showCaptcha = true;
            this.$nextTick(() => {
                this.getCaptcha().render(this.$refs.captchacontainer, {
                    'sitekey': this.captchaSiteId,
                    'callback': this.captchaSuccess,
                    'expired-callback': this.captchaExpired,
                });
            });
        },
        captchaSuccess(response) {
            this.captchaResponse = response;

            // If we have a network instance already, send the captcha response
            if (this.network && this.network.state === 'connecting') {
                this.network.ircClient.raw('CAPTCHA', response);
            }
            this.showCaptcha = false;
        },
        captchaExpired() {
            this.captchaResponse = '';
        },
    },
};
</script>

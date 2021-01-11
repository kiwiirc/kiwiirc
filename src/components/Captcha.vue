<template>
    <div class="kiwi-captcha-outer" :class="{'kiwi-captcha-show': visible}">
        <div ref="container" class="kiwi-captcha-container" />
    </div>
</template>

<script>

'kiwi public';

export default {
    data() {
        return {
            url: '',
            siteId: '',
            response: '',
            visible: false,
            loaded: false,
            networks: [],
        };
    },
    created() {
        let options = this.$state.settings.startupOptions;
        this.siteId = options.captchaSiteId || options.recaptchaSiteId || '';
        this.url = options.captchaUrl || options.recaptchaUrl;
        this.url = this.url || 'https://www.google.com/recaptcha/api.js';

        this.listen(this.$state, 'irc.raw.CAPTCHA', (command, event, network) => {
            if (event.params[0] !== 'NEEDED') {
                return;
            }

            if (this.response) {
                // We already have a valid response
                this.sendResponse(network);
                return;
            }

            this.addNetwork(network);
            this.showCaptcha();
        });
    },
    methods: {
        showCaptcha() {
            this.visible = true;

            if (this.loaded) {
                return;
            }
            this.loaded = true;

            this.$nextTick(() => {
                // Recaptcha calls this callback once it's loaded and ready to be used
                window.recaptchaLoaded = () => {
                    window.grecaptcha.render(this.$refs.container, {
                        sitekey: this.siteId,
                        callback: this.captchaSuccess,
                        'expired-callback': this.captchaExpired,
                    });
                };

                let scr = document.createElement('script');
                scr.src = this.url + '?onload=recaptchaLoaded&render=explicit';
                scr.defer = true;
                this.$el.appendChild(scr);
            });
        },
        captchaSuccess(response) {
            this.response = response;

            this.networks.forEach((network) => {
                if (network.state === 'connecting') {
                    this.sendResponse(network);
                }
            });
            this.networks.length = 0;
            this.visible = false;
        },
        captchaExpired() {
            this.response = '';
        },
        addNetwork(network) {
            if (this.networks.includes(network)) {
                return;
            }
            this.networks.push(network);
        },
        sendResponse(network) {
            network.ircClient.raw('CAPTCHA', this.response);
        },
    },
};
</script>

<style scoped>
    .kiwi-captcha-outer {
        display: none;
        position: fixed;
        top: 0;
        right: 0;
        bottom: 0;
        left: 0;
        z-index: 101;
        align-items: center;
        justify-content: center;
    }

    .kiwi-captcha-container {
        display: block;
        padding: 2em;
        border-radius: 0.8em;
    }

    .kiwi-captcha-show {
        display: flex;
    }
</style>

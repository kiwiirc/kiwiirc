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
            responseTimeout: 0,
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
            if (this.responseTimeout) {
                clearTimeout(this.responseTimeout);
                this.responseTimeout = 0;
            }

            // Control our own timeout
            this.setTimeout(this.captchaExpired, 60000);

            const network = this.networks.pop();

            const remainingNetworks = () => {
                // First network connected response will be cached,
                // send response to remaining networks
                network.ircClient.off('close', remainingNetworks);
                network.ircClient.off('registered', remainingNetworks);
                this.networks.forEach((net) => {
                    if (net.state === 'connecting') {
                        this.sendResponse(net);
                    }
                });
                this.networks.length = 0;
            };

            network.ircClient.once('close', remainingNetworks);
            network.ircClient.once('registered', remainingNetworks);

            this.sendResponse(network);
            this.visible = false;
        },
        captchaExpired() {
            this.response = '';
            if (this.responseTimeout) {
                clearTimeout(this.responseTimeout);
                this.responseTimeout = 0;
            }
            window.grecaptcha.reset();
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

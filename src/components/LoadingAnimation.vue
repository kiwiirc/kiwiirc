<template>
    <div>
        <img src="../res/kiwiLoadingLogo.png" class="kiwi-loading-logo">
        <canvas class="kiwi-loading-animation" />
    </div>
</template>

<script>

'kiwi public';

export default {
    data() {
        return {
            logo: '',
            c: '',
            x: '',
            Y: [],
            t: 0,
            fontSize: 72,
            font: 'bold ' + 72 + 'px verdana',
            text: 'Lorem ipsum dolor sit amet, consectetur adipiscing elit. Fusce eu arcu ipsum. ',
            animationFrame: null,
            destroying: false,
        };
    },
    mounted() {
        this.logo = this.$el.querySelector('.kiwi-loading-logo');
        this.c = this.$el.querySelector('.kiwi-loading-animation');
        this.x = this.c.getContext('2d');
        let tmpText = '';
        for (let i = 0; i < 9; i += 1) tmpText += this.text;
        this.text = String(tmpText).match(/.{1,43}/g);
        this.c.width = 1256;
        this.c.height = 1080;
        for (let i = 0; i < this.text.length; i += 1) {
            this.Y.push(i * this.fontSize - 1600);
        }
        this.logo.onload = () => {
            if (this.destroying) {
                // the component has already been destroyed, we nolonger need the animation
                return;
            }
            this.draw();
        };
    },
    beforeDestroy() {
        this.destroying = true;
        cancelAnimationFrame(this.animationFrame);
    },
    methods: {
        draw() {
            this.x.clearRect(0, 0, this.c.width, this.c.height);
            this.x.globalCompositeOperation = 'source-over';
            this.x.drawImage(this.logo, 0, 0, this.c.width, this.c.height);
            this.x.globalCompositeOperation = 'xor';
            this.x.fillStyle = '#000';
            this.x.font = this.font;
            for (let i = 0; i < this.text.length; i += 1) {
                if (this.t % 4.5 < 2) {
                    this.Y[i] += (250 + ((10 + i) / this.text.length) * 4000) / 120;
                    if (this.Y[i] > i * this.fontSize) {
                        this.Y[i] = i * this.fontSize;
                    }
                } else {
                    if (this.text.length - (this.t % 4.5 - 2) / 2.5 * this.text.length * 1.75 < i) {
                        this.Y[i] += 10 + this.Y[i] / 20;
                    }
                    if (this.Y[i] > 1080 || this.Y[i] < 0) {
                        this.Y[i] = -1500 + i * this.fontSize;
                    }
                }
                if (this.Y[i] > -100) {
                    this.x.fillText(this.text[i], 0, this.fontSize + this.Y[i]);
                }
            }
            this.x.globalCompositeOperation = 'source-out';
            this.x.drawImage(this.logo, 0, 0, this.c.width, this.c.height);
            this.x.globalCompositeOperation = 'source-over';
            this.x.globalAlpha = 0.1;
            this.x.drawImage(this.logo, 0, 0, this.c.width, this.c.height);
            this.x.globalAlpha = 1;
            this.animationFrame = requestAnimationFrame(this.draw);
            this.t += 1 / 40;
        },
    },
};
</script>

<style>
.kiwi-loading-logo {
    display: none;
}

.kiwi-loading-animation {
    height: 100%;
    width: 100%;
}
</style>

<template>
    <div>
        <img src="../res/kiwiLoadingLogo.png" class="kiwiLoadingLogo" ref="kiwiLoadingLogo">
        <div class="canvasDiv" :class="{'closeAnimation': startClosing}">
            <canvas class="kiwi-loadingAnimation-canvaswrap"></canvas>
        </div>
    </div>
</template>

<script>

export default {
    data () {
        return {
            logo: '',
            c: '',
            x: '',
            Y: [],
            t: 0,
            fontSize: 72,
            font: "bold " + 72 + "px verdana",
            text: `Lorem ipsum dolor sit amet, consectetur adipiscing elit. Fusce eu arcu ipsum. `,
            startClosing: false,
        };
    },
    methods: {
      Draw () {
          this.x.clearRect(0, 0, this.c.width, this.c.height);
          this.x.globalCompositeOperation = "source-over";
          this.x.drawImage(this.logo,0,0,this.logo.width,this.logo.height);
          this.x.globalCompositeOperation = "xor";
          this.x.fillStyle="#000";
          this.x.font=this.font;
          for (let i = 0; i < this.text.length; i += 1){
              if(this.t%4.5 < 2){
                  this.Y[i] += (250 + ((10 + i) / this.text.length) * 4000) / 120;
                  if (this.Y[i] > i * this.fontSize){
                      this.Y[i] = i * this.fontSize;
                  }
              }else{
                  if (this.text.length - (this.t%4.5 - 2) / 2.5 * this.text.length * 1.75 < i) {
                       this.Y[i] += 10 + this.Y[i] / 20;
                  }
                  if (this.Y[i] > 1080 || this.Y[i] < 0){
                      this.Y[i] = -1500 + i * this.fontSize;
                  }
              }
              if(this.Y[i] > -100){
                  this.x.fillText(this.text[i], 0, this.fontSize + this.Y[i]);
              }
          }
          this.x.globalCompositeOperation = "source-out";
          this.x.drawImage(this.logo, 0, 0, this.logo.width, this.logo.height);
          this.x.globalCompositeOperation = "source-over";
          this.x.globalAlpha = .1;
          this.x.drawImage(this.logo, 0, 0, this.logo.width, this.logo.height);
          this.x.globalAlpha = 1;
          requestAnimationFrame(this.Draw);
          this.t+=1/40;
      },
    },
    mounted () {
        this.logo = document.getElementsByClassName('kiwiLoadingLogo')[0];
        this.c = document.getElementsByClassName('kiwi-loadingAnimation-canvaswrap')[0];
        this.x = this.c.getContext("2d");
        let tmpText = '';
        for (let i = 0; i < 9; i += 1) tmpText += this.text;
        this.text = String(tmpText).match(/.{1,43}/g);
        this.c.width=1920;
        this.c.height=1080;
        for(let i=0; i < this.text.length; i += 1){
            this.Y.push(i * this.fontSize - 1600)
        }
        this.logo.onload = () => {
            this.Draw();
        }
        this.c.style.height = this.height * 0.75;
        let self = this;
        setTimeout(function () {
            self.startClosing = true;
        }, 4000);
    }
};
</script>

<style scoped>
.kiwiLoadingLogo {
    display: none;
}

.kiwi-loadingAnimation-canvaswrap {
    position: relative;
    top: 50%;
    transform: translateY(-50%);
    height: 150%;
    width: 150%;
}

.canvasDiv {
    height: 75px;
    -webkit-transition: opacity 2s; /* For Safari 3.1 to 6.0 */
    transition: opacity 2s;
}

.closeAnimation {
    opacity: 0;
}
</style>

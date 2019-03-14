export class SoundBleep {
    constructor(src = null) {
        this.audio = document.createElement('audio');
        let source = document.createElement('source');
        if (src) {
            source.src = src;
        } else if (this.audio.canPlayType('audio/mpeg;')) {
            source.type = 'audio/mpeg';
            source.src = 'static/highlight.mp3';
        } else {
            source.type = 'audio/ogg';
            source.src = 'static/highlight.ogg';
        }

        this.audio.appendChild(source);
    }
    destroy() {
        this.audio = null;
    }
    setSource(src) {
        this.audio.src = src;
    }
    play() {
        this.audio.play();
    }
}

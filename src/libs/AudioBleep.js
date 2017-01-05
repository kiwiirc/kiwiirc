export class AudioBleep {
    constructor() {
        this.lastPlayed = 0;

        this.audio = document.createElement('audio');
        let source = document.createElement('source');

        if (this.audio.canPlayType('audio/mpeg;')) {
            source.type = 'audio/mpeg';
            source.src = 'static/highlight.mp3';
        } else {
            source.type = 'audio/ogg';
            source.src = 'static/highlight.ogg';
        }

        this.audio.appendChild(source);
    }

    play() {
        // Only play the bleep once every 2 seconds
        if (!this.lastPlayed || Date.now() - this.lastPlayed > 2000) {
            this.audio.play();
            this.lastPlayed = Date.now();
        }
    }
}

export function listenForHighlights(state) {
    let bleep = new AudioBleep();

    state.$on('message.new', (message, buffer) => {
        if (buffer.setting('mute_sound')) {
            return;
        }

        let network = buffer.getNetwork();
        let isHighlight = message.message.indexOf(network.nick) > -1;

        if (isHighlight) {
            bleep.play();
        }
    });
}

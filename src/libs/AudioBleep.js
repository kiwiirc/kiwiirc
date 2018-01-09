import * as Misc from '@/helpers/Misc';

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

        if (message.type === 'connection') {
            return;
        }

        let network = buffer.getNetwork();
        let isHighlight = Misc.mentionsNick(message.message, network.nick);
        let isActiveBuffer = state.getActiveBuffer() === buffer;
        let inFocus = isActiveBuffer && state.ui.app_has_focus;

        if (isHighlight || (buffer.isQuery() && !inFocus)) {
            bleep.play();
        }
    });
}

'kiwi public';

/** @module */

/**
 * Plays alert sounds
 */
export class AudioManager {
    constructor(audio) {
        this.lastPlayed = 0;
        this.audio = audio;
    }

    /** Play the alert sound */
    play() {
        // Only play the bleep once every 2 seconds
        if (!this.lastPlayed || Date.now() - this.lastPlayed > 2000) {
            this.audio.play();
            this.lastPlayed = Date.now();
        }
    }

    listen(state) {
        state.$on('audio.bleep', () => {
            this.play();
        });
    }

    /** Watch the Kiwi state for any message highlights and play an alert */
    watchForMessages(state) {
        state.$on('message.new', (event) => {
            let { message, buffer } = event;
            if (buffer.setting('mute_sound')) {
                return;
            }

            let ignoreTypes = [
                'connection',
                'traffic',
                'mode',
                'nick',
            ];
            if (ignoreTypes.indexOf(message.type) > -1) {
                return;
            }

            if (message.ignore || buffer.isSpecial()) {
                return;
            }

            let shouldBleep = buffer.getNetwork().nick !== message.nick && ((message.isHighlight && buffer.setting('alert_on') === 'highlight') || buffer.setting('alert_on') === 'message');
            let isActiveBuffer = state.getActiveBuffer() === buffer;
            let inFocus = isActiveBuffer && state.ui.app_has_focus;

            if (shouldBleep || (buffer.isQuery() && !inFocus)) {
                this.play();
            }
        });
    }
}

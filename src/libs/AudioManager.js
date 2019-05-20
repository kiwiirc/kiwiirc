'kiwi public';

import * as Storage from './storage/Local';
import { SoundBleep } from './SoundBleep';

/** @module */

/**
 * Plays alert sounds
 */
export class AudioManager {
    constructor(audio) {
        this.lastPlayed = 0;
        this.sounds = {
            default: audio,
        };
        this.loadAudio();
    }
    async loadAudio() {
        let keys = await Storage.keys();
        keys.forEach(async(key) => {
            if (key.indexOf('audio.') === 0) {
                let [, type] = key.split('.');
                let src = await Storage.get(key);
                if (this.sounds[type] && src) {
                    this.sounds[type].setSource(src);
                } else {
                    this.sounds[type] = new SoundBleep(src);
                }
            }
        });
    }
    /** Play the alert sound */
    play(type = 'default') {
        // Only play the bleep once every 2 seconds
        if (!this.lastPlayed || Date.now() - this.lastPlayed > 2000) {
            if (this.sounds[type]) {
                this.sounds[type].play();
            } else {
                this.sounds.default.play();
            }
            this.lastPlayed = Date.now();
        }
    }

    listen(state) {
        state.$on('audio.bleep', (data = {}) => {
            let type = data.type || 'default';
            if (this.sounds[type]) {
                this.sounds[type].play();
            } else {
                this.sounds.default.play();
            }
        });
        state.$on('audio.set-source', (data = {}) => {
            let type = data.type || 'default';
            if (this.sounds[type] && data.src) {
                this.sounds[type].setSource(data.src);
            } else {
                this.sounds[type] = new SoundBleep(data.src);
            }
            Storage.remove('audio.' + type);
        });
    }

    /** Watch the Kiwi state for any message highlights and play an alert */
    watchForMessages(state) {
        state.$on('message.new', (message, buffer) => {
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

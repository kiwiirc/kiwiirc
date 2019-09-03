'kiwi public';

import _ from 'lodash';

export default class StatePersistence {
    constructor(storageKey, state, storage, logger) {
        this.storageKey = storageKey;
        this.state = state;
        this.storage = storage;
        this.logger = logger;
        this.isPersisting = false;
        this.includeBuffers = true;

        this.state.persistence = this;
    }

    async loadStateIfExists() {
        if (!this.storageKey) {
            return;
        }

        // If we have networks from a previous state, launch directly into it
        let storedState = await this.storage.get(this.storageKey);
        if (storedState) {
            if (this.logger) {
                this.logger('Importing state', storedState);
            }

            this.state.importState(storedState);
        }
    }

    watchStateForChanges() {
        if (!this.storageKey) {
            return;
        }

        // Throttle saving the state into storage so we don't thrash the disk
        let debouncedSaveState = _.debounce(() => {
            if (this.logger) {
                this.logger('State updated, setting localStorage');
            }

            this.storage.set(this.storageKey, this.state.exportState(this.includeBuffers));
        }, 1000);

        this.state.$watch('networks', debouncedSaveState, { deep: true });
        this.state.$watch('user_settings', debouncedSaveState, { deep: true });

        let bufferWatchers = [];
        let watchBuffers = () => {
            // Clear any previous watchers
            bufferWatchers.forEach(w => w());
            bufferWatchers = [];

            // For each buffer in a network, select all the properties we want to watch for
            // changes so that vue can compare it to the previous check. If any of them has changed
            // then the $watch()er will call debouncedSaveState().
            this.state.networks.forEach((network) => {
                let bufferNames = network.buffers.map(b => b.name).join(',');

                network.buffers.forEach((buffer) => {
                    let unwatch = this.state.$watch(() => {
                        let val = JSON.stringify([
                            bufferNames,
                            buffer.name,
                            buffer.settings,
                            buffer.joined,
                            buffer.enabled,
                            buffer.last_read,
                        ]);

                        return val;
                    }, debouncedSaveState);

                    bufferWatchers.push(unwatch);
                });
            });

            setTimeout(watchBuffers, 2000);
        };

        setTimeout(watchBuffers, 2000);

        this.isPersisting = true;
    }

    async forgetState() {
        this.state.resetState();
        await this.storage.set(this.storageKey, null);
    }
}

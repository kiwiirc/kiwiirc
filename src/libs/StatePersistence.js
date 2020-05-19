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
        this.watcher = null;

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

    stopWatchingState() {
        if (this.watcher) {
            this.watcher();
            this.watcher = null;
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

        // We need to touch each property of each buffer for that we want to save our state on.
        // If any of the properties change then the $watch()er will call debouncedSaveState()
        this.watcher = this.state.$watch(() => {
            let watchVals = [];

            this.state.networks.forEach((network) => {
                let buffersVals = [];
                buffersVals.push(network.buffers.map((b) => b.name).join(','));

                network.buffers.forEach((buffer) => {
                    buffersVals.push([
                        buffer.name,
                        buffer.settings,
                        buffer.joined,
                        buffer.enabled,
                        buffer.last_read,
                    ]);
                });

                watchVals.push(buffersVals);
            });

            return JSON.stringify(watchVals);
        }, debouncedSaveState);

        this.isPersisting = true;
    }

    async forgetState() {
        this.state.resetState();
        await this.storage.set(this.storageKey, null);
    }
}

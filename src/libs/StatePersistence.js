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

        this.isPersisting = true;
    }


    forgetState() {
        this.state.resetState();
        this.storage.set(this.storageKey, null);
    }
}

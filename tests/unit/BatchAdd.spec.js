import batchedAdd from '@/libs/batchedAdd';

describe('batchedAdd.vue', () => {
    const outOfTickItems = (batchFn, itemCount, endFn) => {
        // Chain out of tick items so not to interfere
        // with the timeout within batchedAdd.js
        let count = 0;
        const nextTimeout = () => {
            count++;
            if (count > itemCount) {
                if (endFn) {
                    endFn();
                }
                return;
            }
            setTimeout(() => {
                batchFn('item' + count);
                nextTimeout();
            }, 10);
        };
        nextTimeout();
    };

    it('should return a batching function', () => {
        let batch = batchedAdd();
        expect(batch).toBeInstanceOf(Function);
    });

    it('should expose its queue', () => {
        let batch = batchedAdd();
        expect(batch.queue).toBeInstanceOf(Function);
        expect(batch.queue()).toEqual([]);
    });

    it('should process three items without a batch', (done) => {
        let itemCount = 0;
        let singleItem = () => {
            itemCount++;
            if (itemCount === 3) {
                done();
            }
        };
        let batchItems = () => {
            done(new Error('batch item caught'));
        };

        let batch = batchedAdd(singleItem, batchItems);
        batch('item1');
        batch('item2');
        batch('item3');
    });

    it('should process 100 items on the same js tick without a batch', (done) => {
        let itemCount = 0;
        let singleItem = () => {
            itemCount++;
            if (itemCount === 100) {
                done();
            }
        };
        let batchItems = () => {
            done(new Error('batch item caught'));
        };

        let batch = batchedAdd(singleItem, batchItems);
        for (let i = 0; i < 100; i++) {
            batch('item' + i);
        }
    });

    it('should process 102 single items, then a batch of 3', (done) => {
        let singleCount = 0;
        let singleItem = () => {
            singleCount++;
        };
        let batchItems = (items) => {
            if (singleCount !== 102) {
                return done(new Error('Expected 102 single items, found ' + singleCount));
            }

            if (items.length === 1) {
                return done(new Error('Expected 3 batched items, found ' + items.length));
            }

            return done();
        };

        let batch = batchedAdd(singleItem, batchItems);
        for (let i = 0; i < 100; i++) {
            batch('item' + i);
        }
        outOfTickItems(batch, 5);
    });

    it('should process a batched item after three single items on different js ticks', (done) => {
        let singleCount = 0;
        let singleItem = () => {
            singleCount++;
            if (singleCount > 3) {
                done(new Error('Expected 3 single items before a batch, found ' + singleCount));
            }
        };
        let batchItems = () => {
            if (singleCount !== 3) {
                done(new Error('Expected 3 single items before a batch, found ' + singleCount));
            } else {
                done();
            }
        };

        let batch = batchedAdd(singleItem, batchItems);
        outOfTickItems(batch, 4);
    });

    it('should process 3 items in a batch', (done) => {
        let singleItem = (item) => {};
        let batchItems = (items) => {
            if (items.length !== 3) {
                done(new Error(`Expected 3 items in a batch, found ${items.length}`));
            } else {
                done();
            }
        };

        let batch = batchedAdd(singleItem, batchItems);
        outOfTickItems(batch, 6);
    });

    it('should process a single item after a batch has finished', (done) => {
        let singleCount = 0;
        let batchCount = 0;
        let singleItem = () => {
            if (singleCount === 3 && batchCount === 1) {
                done();
            }
            singleCount++;
        };
        let batchItems = (items) => {
            if (batchCount > 0) {
                done(new Error('Processing a batch more than once'));
            }
            batchCount++;
        };

        let batch = batchedAdd(singleItem, batchItems);
        outOfTickItems(batch, 6, () => {
            setTimeout(() => {
                // Should revert back to being a single item
                batch('item7');
            }, 1200);
        });
    });

    it('should process 4 single items', (done) => {
        let singleCount = 0;
        let singleItem = () => {
            singleCount++;
            if (singleCount === 4) {
                done();
            }
        };
        let batchItems = (items) => {
            done(new Error('Items should not be batched'));
        };

        let batch = batchedAdd(singleItem, batchItems);
        outOfTickItems(batch, 3, () => {
            setTimeout(() => {
                // Should revert back to being a single item
                batch('item4');
            }, 1200);
        });
    }, 3000);
});

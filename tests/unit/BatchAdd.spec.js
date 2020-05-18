import batchedAdd from '@/libs/batchedAdd';

describe('batchedAdd.vue', () => {
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

    it('should process a batched item after three single items', (done) => {
        let singleCount = 0;
        let singleItem = () => {
            singleCount++;
        };
        let batchItems = () => {
            if (singleCount !== 3) {
                done(new Error('Expected 3 single items before a batch, found ' + singleCount));
            } else {
                done();
            }
        };

        let batch = batchedAdd(singleItem, batchItems);
        batch('item1');
        batch('item2');
        batch('item3');
        batch('item4');
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
        batch('item1');
        batch('item2');
        batch('item3');
        batch('item4');
        batch('item5');
        batch('item6');
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
        batch('item1');
        batch('item2');
        batch('item3');
        // Batch kicks in here
        batch('item4');
        batch('item5');
        batch('item6');
        setTimeout(() => {
            // Should revert back to being a single item
            batch('item7');
        }, 1200);
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
        batch('item1');
        batch('item2');
        batch('item3');
        setTimeout(() => {
            batch('item4');
        }, 1200);
    }, 3000);
});

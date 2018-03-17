import batchedAdd from '@/libs/batchedAdd';

describe('batchedAdd.vue', function() {
    it('should return a batching function', function() {
        let batch = batchedAdd();
        expect(batch).to.be.a('function');
    });

    it('should expose its queue', function() {
        let batch = batchedAdd();
        expect(batch.queue).to.be.a('function');
        expect(batch.queue()).to.eql([]);
    });

    it('should process three items without a batch', function(done) {
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
        batch('item');
        batch('item');
        batch('item');
    });

    it('should process a batched item after three single items', function(done) {
        let singleCount = 0;
        let singleItem = () => {
            singleCount++;
        };
        let batchItems = () => {
            if (singleCount !== 3) {
                done(new Error('Expected 3 single items before a batch'));
            } else {
                done();
            }
        };

        let batch = batchedAdd(singleItem, batchItems);
        batch('item');
        batch('item');
        batch('item');
        batch('item');
    });

    it('should process 3 items in a batch', function(done) {
        let singleItem = () => {
        };
        let batchItems = (items) => {
            if (items.length !== 3) {
                done(new Error('Expected 3 items in a batch'));
            } else {
                done();
            }
        };

        let batch = batchedAdd(singleItem, batchItems);
        batch('item');
        batch('item');
        batch('item');
        batch('item');
        batch('item');
        batch('item');
    });

    it('should process a single item after a batch has finished', function(done) {
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
        batch('item');
        batch('item');
        batch('item');
        // Batch kicks in ehre
        batch('item');
        batch('item');
        batch('item');
        setTimeout(() => {
            // Should revert back to being a single item
            batch('item');
        }, 1200);
    });

    it('should process 4 single items', function(done) {
        this.timeout(3000);
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
        batch('item');
        batch('item');
        batch('item');
        setTimeout(() => {
            batch('item');
        }, 1200);
    });
});

'kiwi public';

/**
 * batchedAdd prevents a flood of new inserts into state. After X inserts/sec, batch
 * each second worth of new items at the same time.
 */
export default function batchedAdd(singleFn, batchedFn, numInsertsSec = 3) {
    let queue = [];
    let numInLastSec = 0;
    let isLooping = false;
    let loopInterval = 1000;

    function queueLoop() {
        numInLastSec = 0;
        if (queue.length) {
            // emptying queue before calling batchedFn in case that function triggers
            // code that needs to see that the queue has been processed.
            let q = queue;
            queue = [];
            batchedFn(q);
            numInLastSec = 0;
            setTimeout(queueLoop, loopInterval);
        } else {
            isLooping = false;
        }
    }

    function maybeStartLoop() {
        if (isLooping) {
            return;
        }

        isLooping = true;
        setTimeout(queueLoop, loopInterval);
    }

    function resetAddCounter(doResetNum) {
        if (doResetNum) {
            numInLastSec = 0;
        }
        if (!isLooping) {
            setTimeout(resetAddCounter, 1000, true);
        }
    }

    function batchFn(item) {
        numInLastSec++;

        // Under 1 second, queue them
        if (queue.length || numInLastSec > numInsertsSec) {
            queue.push(item);
            maybeStartLoop();
        } else {
            singleFn(item);
            resetAddCounter();
        }
    }
    batchFn.queue = function getQueue() {
        return queue;
    };

    return batchFn;
}

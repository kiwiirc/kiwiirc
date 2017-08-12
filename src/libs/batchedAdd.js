/**
 * batchedAdd prevents a flood of new inserts into state. After X inserts/sec, batch
 * each second worth of new items at the same time.
 */
export default function batchedAdd(singleFn, batchedFn) {
    let queue = [];
    let numInLastSec = 0;
    let isLooping = false;
    let loopInterval = 1000;

    function queueLoop() {
        numInLastSec = 0;
        if (queue.length) {
            batchedFn(queue);
            queue = [];
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
    function batchFn(item) {
        // Under 1 second, queue them
        if (queue.length || numInLastSec > 3) {
            queue.push(item);
            maybeStartLoop();
        } else {
            singleFn(item);
        }

        numInLastSec++;
    }
    batchFn.queue = function getQueue() {
        return queue;
    };

    return batchFn;
}

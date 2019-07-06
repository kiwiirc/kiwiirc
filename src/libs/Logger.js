'kiwi public';

const defaultLogger = makeLogger();
export default defaultLogger;

function makeLogger(label) {
    let LOG_INFO = false;
    let LOG_ERROR = true;

    function logger(...args) {
        logger.info(...args);
    }

    logger.info = function logInfo(...args) {
        if (LOG_INFO) {
            if (label) {
                args[0] = `[${label}] ${args[0]}`;
            }
            window.console.log(...args);
        }
    };

    logger.error = function logError(...args) {
        if (LOG_ERROR) {
            if (label) {
                args[0] = `[${label}] ${args[0]}`;
            }

            window.console.error(...args);
        }
    };

    logger.assert = function assert(condition, ...args) {
        if (condition) {
            return;
        }

        this.error('Assertion failed.', ...args);
    };

    logger.setLevel = function setLevel(newLevel) {
        if (newLevel === 0) {
            LOG_ERROR = false;
            LOG_INFO = false;
        } else if (newLevel === 1) {
            LOG_ERROR = true;
            LOG_INFO = false;
        } else if (newLevel === 2) {
            LOG_ERROR = true;
            LOG_INFO = true;
        }
    };

    logger.namespace = function namespace(newLabel) {
        let l = newLabel;
        if (label) {
            l = `[${label}][${l}]`;
        }

        return makeLogger(l);
    };

    return logger;
}

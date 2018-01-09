let LOG_INFO = false;
let LOG_ERROR = true;

export default function logger(...args) {
    logger.info(...args);
}

logger.info = function logInfo(...args) {
    if (LOG_INFO) {
        window.console.log(...args);
    }
};

logger.error = function logError(...args) {
    if (LOG_ERROR) {
        window.console.error(...args);
    }
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

logger.namespace = function namespace(label) {
    function namespacedLogger(...args) {
        namespacedLogger.info(...args);
    }

    namespacedLogger.info = function logInfo(...args) {
        let newArgs = args;
        newArgs[0] = `[${label}] ${newArgs[0]}`;
        logger.info(...newArgs);
    };

    namespacedLogger.error = function logError(...args) {
        let newArgs = args;
        newArgs[0] = `[${label}] ${newArgs[0]}`;
        logger.error(...newArgs);
    };

    return namespacedLogger;
};

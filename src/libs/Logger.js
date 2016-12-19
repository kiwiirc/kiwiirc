export default function logger(...args) {
    logger.info.apply(logger, args);
}

logger.info = function logInfo(...args) {
    window.console.log.apply(window.console, args);
};

logger.error = function logError(...args) {
    window.console.error.apply(window.console, args);
};

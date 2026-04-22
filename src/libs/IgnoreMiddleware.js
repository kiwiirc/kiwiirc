'kiwi public';

export default function ignoreMiddleware(network) {
    const FILTERED = new Set(['PRIVMSG', 'NOTICE', 'TAGMSG']);
    return function middleware(client, rawEvents /* , parsedEvents */) {
        rawEvents.use((command, message, rawLine, c, next) => {
            if (!message || !message.nick || !FILTERED.has(command)) {
                next();
                return;
            }
            const lower = message.nick.toLowerCase();
            const ignored = network.ignored_list.some((n) => n.toLowerCase() === lower);
            if (!ignored) {
                next();
            }
        });
    };
}

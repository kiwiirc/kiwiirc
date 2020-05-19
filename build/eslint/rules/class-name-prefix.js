module.exports = {
    meta: {
        docs: {
            description: 'html class names must start with `u-` or `kiwi-`',
            category: 'base',
            url: null,
        },
        fixable: null,
        schema: [],
    },
    create: function (context) {
        return context.parserServices.defineTemplateBodyVisitor({
            "VAttribute[key.name='class']"(node) {
                let classes = node.value.value.split(' ');
                classes.forEach((c) => {
                    // Ignore empty and fontawesome classes
                    if (!c || c === 'fa' || c.startsWith('fa-')) {
                        return;
                    }
                    if (!c.startsWith('kiwi-') &&
                        !c.startsWith('u-') &&
                        // Special exception for google recaptcha -  welcome screen.
                        !c.startsWith('g-') &&
                        !c.startsWith('irc-fg-') &&
                        !c.startsWith('irc-bg-')
                    ) {
                        context.report({
                            node: node,
                            message: 'Expected class name to start with `kiwi-` or `u-` ({{ class }})',
                            data: {
                                class: c,
                            },
                        });
                    }
                });
            },
        });
    },
};

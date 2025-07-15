// Built using https://github.com/vuejs/vue/blob/73bdf14ef5c9979dcba18ede3410515cecbe2f2f/src/platforms/web/runtime/components/transition-group.ts

export default {
    beforeMount() {
        /* eslint-disable no-underscore-dangle */
        const update = this._update;
        this._update = (vnode, hydrating) => {
            // force removing pass
            this.__patch__(
                this._vnode,
                this.kept,
                false, // hydrating
                true // removeOnly (!important, avoids unnecessary moves)
            );
            this._vnode = this.kept;
            update.call(this, vnode, hydrating);
        };
        /* eslint-enable no-underscore-dangle */
    },
    render(h) {
        const tag = this.tag || this.$vnode.data.tag || 'div';
        const map = Object.create(null);
        const prevChildren = (this.prevChildren = this.children);
        const rawChildren = this.$slots.default || [];
        const children = (this.children = []);

        for (let i = 0; i < rawChildren.length; i++) {
            const c = rawChildren[i];
            if (c.tag && c.key != null && String(c.key).indexOf('__vlist') !== 0) {
                children.push(c);
                map[c.key] = c;
            }
        }

        if (prevChildren) {
            const kept = [];
            const removed = [];
            for (let i = 0; i < prevChildren.length; i++) {
                const c = prevChildren[i];
                if (map[c.key]) {
                    kept.push(c);
                } else {
                    removed.push(c);
                }
            }
            this.kept = h(tag, null, kept);
        }
        return h(tag, null, children);
    },
};

'kiwi public';

import EventEmitter from 'eventemitter3';

class IpcBroadcastChannel extends EventEmitter {
    init() {
        try {
            // Privacy settings in firefox 104~ block broadcast channels in iframes
            this.bc = new BroadcastChannel('kiwi-ipc');
            this.bc.onmessage = this.onmessage.bind(this);
        } catch {
            // catch
        }
    }

    send(msg) {
        if (this.bc) {
            this.bc.postMessage(msg);
        }
    }

    onmessage(msg) {
        this.emit('message', msg);
    }
}

class IpcLocalStorage extends EventEmitter {
    init() {
        window.addEventListener('storage', this.onmessage.bind(this));
    }

    send(msg) {
        localStorage.setItem('kiwi-ipc', JSON.stringify(msg));
        localStorage.removeItem('kiwi-ipc');
    }

    onmessage(msg) {
        if (msg.key === 'kiwi-ipc' && msg.newValue) {
            try {
                let parsedMsg = {
                    data: JSON.parse(msg.newValue),
                };
                this.emit('message', parsedMsg);
            } catch (e) {
                this.emit('error');
            }
        }
    }
}

export default (window.BroadcastChannel ? new IpcBroadcastChannel() : new IpcLocalStorage());

import state from '@/libs/state';
import NetworkState from '@/libs/state/NetworkState';

describe('NetworkState', () => {
    it('should return a network state object', () => {
        let s = state.create();
        let network = s.addNetwork('TestNetwork', 'TestNick', {});
        expect(network).toBeInstanceOf(NetworkState);
        expect(network.name).toBe('TestNetwork');
        expect(network.connection.nick).toBe('TestNick');
        expect(network.appState).toBe(s);
    });

    it('should add a NetworkState to the global state', () => {
        let s = state.create();
        let network = s.addNetwork('TestNetwork', 'TestNick', {
            server: 'irc.irc.com',
        });
        expect(s.networks.length).toEqual(1);
        expect(s.networks[0]).toEqual(network);
    });

    it('should retrieve a NetworkState from the global state', () => {
        let s = state.create();
        let network = s.addNetwork('TestNetwork', 'TestNick', {
            server: 'irc.irc.com',
        });
        expect(s.getNetwork(network.id)).toEqual(network);
        expect(s.getNetworkFromAddress('irc.irc.com')).toEqual(network);
        expect(s.getNetworkFromAddress('definitely.not.irc.irc.com')).toEqual(undefined);
    });

    it('automatically has a server buffer', () => {
        let s = state.create();
        let network = s.addNetwork('TestNetwork', 'TestNick', {});
        expect(s.networks[0].buffers.length).toEqual(1);
        expect(s.networks[0].buffers[0]).toEqual(network.serverBuffer());
        expect(network.bufferByName('*')).toEqual(network.serverBuffer());
    });

    it('correctly adds buffers', () => {
        let s = state.create();
        let network = s.addNetwork('TestNetwork', 'TestNick', {});
        let buffer = s.addBuffer(network.id, '#channel');
        expect(s.networks[0].buffers.length).toEqual(2);
        expect(network.buffers.length).toEqual(2);
        expect(network.bufferByName('#channel')).toEqual(buffer);
    });

    it('correctly stores local network settings', () => {
        let s = state.create();
        let network = s.addNetwork('TestNetwork', 'TestNick', {});
        expect(network.setting('setting_key')).toEqual(undefined);

        network.setting('setting_key', 'some value');
        expect(network.setting('setting_key')).toEqual('some value');
    });
});

import startupWelcome from './Welcome';
import startupZncLogin from './ZncLogin';
import startupCustomServer from './CustomServer';
import startupKiwiBnc from './KiwiBnc';
import startupPersonal from './Personal';

export default {
    welcome: startupWelcome,
    znc: startupZncLogin,
    customServer: startupCustomServer,
    kiwiBnc: startupKiwiBnc,
    personal: startupPersonal,
};

// Do channels support half-op mode
export function supportsHalfOp(network) {
    let ircdType = network.ircd.toLowerCase();
    let notSupported = ['ircd-seven', 'charybdis'];

    for (let i = 0; i < notSupported.length; i++) {
        if (ircdType.indexOf(notSupported[i]) > -1) {
            return false;
        }
    }

    return true;
}

// Does channel mode +a = admin
export function isAChannelModeAdmin(network) {
    let ircdType = network.ircd.toLowerCase();
    let notAdmin = ['ircd-seven', 'charybdis'];

    for (let i = 0; i < notAdmin.length; i++) {
        if (ircdType.indexOf(notAdmin[i]) > -1) {
            return false;
        }
    }

    return true;
}

// Does channel mode +q = owner
export function isQChannelModeOwner(network) {
    let ircdType = network.ircd.toLowerCase();
    let notOwner = ['ircd-seven', 'charybdis'];

    for (let i = 0; i < notOwner.length; i++) {
        if (ircdType.indexOf(notOwner[i]) > -1) {
            return false;
        }
    }

    return true;
}

export function extbanAccount(network) {
    // Eg. InspIRCd-2.0
    // Eg. UnrealIRCd-4.0.17
    // Eg. ircd-seven-1.1.7
    // Eg. u2.10.12.10+snircd(1.3.4a)
    let ircdType = network.ircd.toLowerCase();

    // Eg. ~,qjncrRa
    // Eg. ,qjncrRa
    let extban = network.ircClient.network.supports('EXTBAN') || '';
    if (!extban) {
        return '';
    }

    let prefix = extban.split(',')[0];
    let type = 'a';

    // https://wiki.inspircd.org/2.0/Extbans
    if (ircdType.indexOf('inspircd') > -1) {
        type = 'R';
    }

    return prefix + type;
}

'kiwi public';

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

    // https://docs.inspircd.org/3/modules/services_account/#extended-bans
    if (ircdType.indexOf('inspircd') > -1) {
        type = 'R';
    }

    return prefix + type;
}

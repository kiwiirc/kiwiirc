# kiwiirc

> The next generation of the KiwiIRC web based IRC client

### Development dependencies
Before you can build or start to develop on KiwiIRC, make sure the have the
following installed on your system:
* [Nodejs](https://nodejs.org/)
* [yarn](https://yarnpkg.com/)

### Building

``` bash
# install dependencies
yarn install

# build for production with minification
npm run build
```

### Development environment

``` bash
# install dependencies
yarn install

# development web server with hot reload at http://localhost:8080/
npm run dev
```

Source files are linted automatically and will fail on any linting errors.

### Configuration

By default, the client will load the /static/config.json file on startup which
contains any runtime configuration. When in the development environment this can
be found in [static/config.json](static/config.json)

## Getting started

This repository only contains the client side. To connect to an IRC server you either need to be using a websocket capable IRC server (none yet support this) or need to be running to Kiwi IRC server which can be found here: https://github.com/kiwiirc/webircgateway

Once you have a Kiwi IRC server configured and running, enter the URL to your Kiwi IRC server in the clients config.json file. The client side files built from this repository may be hosted anywhere - Apacahe, Nginx, the Kiwi IRC server, your CDN.

***TODO: Provide a full example of the client and server running together with complete downloadable packages***

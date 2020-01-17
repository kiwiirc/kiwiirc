# Kiwi IRC

***A versatile web based messenger using IRC***


- 100% static files. Host with your favourite web server or a CDN
- For single networks, bouncer hosts, or a personal generic IRC client that remembers your networks
- Works out of the box with a default IRC network - or use your own
- Connect to websocket IRC servers or use the [webircgateway](https://github.com/kiwiirc/webircgateway) websocket proxy to connect to normal IRC servers
- Single or multiple IRC network connections
- Multiple layouts for small areas or full page layouts
- Light and dark modes
- Desktop notifications
- Extremely versatile via a [single JSON config file at runtime](https://github.com/kiwiirc/kiwiirc/wiki/Configuration)
- Themable and rich [plugin support](https://github.com/kiwiirc/kiwiirc/wiki/Plugins) such as [file uploading](https://github.com/kiwiirc/plugin-fileuploader/) and [video calling](https://github.com/kiwiirc/plugin-conference)
- Team mode for workplaces

## Installing Kiwi IRC
If you just want to embed an IRC client on your website, you can generate a custom client hosted by kiwiirc.com using the simple client builder, https://kiwiirc.com/clientbuilder/

To install Kiwi IRC on your own server, pre-built and ready to use installers can be found at the downloads page, https://kiwiirc.com/downloads/

## Building from source
#### Dependencies
Before you can build or start to develop on Kiwi IRC, make sure to have the following installed on your system:
* [Nodejs](https://nodejs.org/)
* [yarn](https://yarnpkg.com/)

#### Building for production

``` bash
# Install dependencies
$ yarn install

# Build Kiwi IRC into the dist/ folder
$ yarn run build
```

***Note:*** *Be sure to copy the files from the `dist/` folder to your webserver! This folder will be overwritten each time it is built.*

#### Development environment
Kiwi IRC is built using Vuejs, webpack and babel.

``` bash
# Install dependencies
yarn install

# Optionally link git pre-commit linting hooks
ln -s $PWD/scripts/pre-commit .git/hooks/

# A development web server with hot reloading at http://localhost:8080/
yarn run dev
```

***Note:*** *Do not use this development environment on your live website. It is slow, very large, and unsecure.*

#### Configuration

By default, the client will load the /static/config.json file on startup which
contains the runtime configuration. When running in the development environment this can be found at [static/config.json](static/config.json)


## Browser support

Kiwi IRC is tested on all modern browsers and IE11. Other browsers are not actively tested and may have trouble running Kiwi IRC.
* Chrome
* Chrome Mobile (Android)
* Firefox
* IE11
* Safari 9+


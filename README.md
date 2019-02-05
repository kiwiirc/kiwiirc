<div style="text-align:center;">
<h1 style="margin-top:0;">Kiwi<span style="color:#42b992;">IRC</span><img style="margin-left: 5px;margin-top: -10px" src="https://kiwiirc.com/img/logo.png" />
</h1>
Kiwi IRC is a handcrafted, lightening fast, open source, web based IRC client.
</div>

<br>
### Getting Started:
If you want to run Kiwi IRC ready to use packages/installers/archives can be found [here](https://kiwiirc.com/downloads/index.html).

This repository only contains the Kiwi IRC client.
------------


### Developing with Kiwi
Before you can build or start to develop on Kiwi IRC locally, please make sure to have the following installed on your system:  [Nodejs](https://nodejs.org/) and [yarn](https://yarnpkg.com/).

Once installed you can install and start Kiwi locally with:

``` bash
# install dependencies
yarn install

# development web server with hot reload at http://localhost:8080/
yarn run dev
```
<span style="display:inline-block;text-align:center;width:100%;">
All of our source files are linted automatically and will fail on any linting errors.
</span>

<span style="display:inline-block;text-align:center;width:100%;border:1px solid #42b992;line-height:40px;border-radius:4px;font-size:0.85em;"><b>Just looking to build a theme? </b> Try the online [theme builder](https://kiwiirc.com/nextclient-themebuilder)
</span>

------------

### Configuration
By default, the client will load the <b>/static/config.json</b> file on startup which
contains any runtime configuration. By default it will connect to IRC networks via kiwiirc.com servers while you are developing locally.

To use your own server you either need to be using a websocket capable IRC server (none yet support this) or need to be connecting to a Kiwi IRC server which can be found [here](https://github.com/kiwiirc/webircgateway).


Many core settings can be modified from within the config file.

<span style="display:inline-block;text-align:center;width:100%;border:1px solid #d16c6c;line-height:40px;border-radius:4px;font-size:0.8em;"><b> If contributing to Kiwi, please do not commit changes to the config file. </b>
</span>

------------



### Building for production
If you have finished modifying Kiwi and wish to deploy it to a live server, please ensure you run the build command.

``` bash
# build for production with minification
$ yarn run build
```
<span style="display:inline-block;text-align:center;width:100%;border:1px solid #42b992;line-height:18px;border-radius:4px;font-size:0.85em;padding:12px 10px;">The built files will be placed in <b>dist/ folder</b>.
These files can be hosted anywhere - Apache, Nginx, the Kiwi IRC server, your CDN.
</span>

------------

## Browser support

Kiwi IRC is tested on the below browsers. Other browsers are not checked and may have trouble running Kiwi IRC.
* Chrome
* Chrome Mobile (Android)
* Firefox
* IE11
* Safari 9+

## Thanks

Providing sponsorship to the Kiwi IRC project helps keep kiwiirc.com free to use and makes the ongoing development possible.

Without these [Sponsors](sponsors.md) development would be much slower so many thanks to these!

## License
~~~
   Copyright 2018 Kiwi IRC

   Licensed under the Apache License, Version 2.0 (the "License");
   you may not use this file except in compliance with the License.
   You may obtain a copy of the License at

       http://www.apache.org/licenses/LICENSE-2.0

   Unless required by applicable law or agreed to in writing, software
   distributed under the License is distributed on an "AS IS" BASIS,
   WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
   See the License for the specific language governing permissions and
   limitations under the License.
~~~

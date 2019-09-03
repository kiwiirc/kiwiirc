# webircgateway
**A simple http/websocket gateway to IRC networks for any web client**

*Pre-built binaries can be downloaded from https://kiwiirc.com/downloads/index.html*

### Features
**IRC**
* WEBIRC support
* Hexed IP / static value overrides for IRC username, realname and hostname fields
* Automatic encoding/decoding to UTF-8 from the IRCd
* Single or multiple IRC server upstreams
* Client message-tags for IRC servers that do not have message-tags support

**WEB**
* Automatic Let's Encrypt TLS certificates
* Optional HTTP static file serving (handy to serve your web client)
* Multiple websocket / transport engine support
    * Websockets (/webirc/websocket/)
    * SockJS (/webirc/sockjs/)
    * Kiwi IRC multi-servers (/webirc/kiwi/)
* Designed for wide web browser support
* HTTP Origin header whitelisting
* reCaptcha support


### Overview
webircgateway enables web browsers to connect to an IRC network. It does this by acting like a proxy. 1) A web browser connects to it, 2) It then connects to an IRC network, 3) The data between the two connections are then passed back and forth with any required encoding.

Most IRC networks currently do not support websocket connections or will only support native websockets. This causes problems:
* Not all browsers support websockets
* Many antivirus and firewall software interferes with websocket connections
* Many transparent proxies block websocket connections (corporate proxies, hotel wifi access points, etc)
* Almost half the internet access is now over mobile connections. These are not as stable as landline connections and will cause a increase in ping timeouts on networks (travelling under a tunnel?)

Further, existing IRC servers that do support native websockets complicate IRC encodings and requires the web client to handle decoding simple text streams, causing bloat and increased CPU usage in the users web browsers while ignoring older browser support.

webircgateway aims to solve these problems by supporting different transport engines to increase browser support and improve connectivity. Web IRC clients still talk the native IRC protocol to webircgateway no matter which transport engine they use.

The `kiwiirc` transport has been designed to work with kiwiirc to further increase the user facing experience and support multiple IRC connections over the same web connection if applicable. However, other clients may also make use of this transport engine in future.


### Introduced commands
Two IRC commands are available to connecting clients. These commands will be processed by webircgateway and not be sent upstream to the IRC server.

`ENCODING CP1252` will instruct webircgateway to convert all text to the `CP1252` encoding before sending to the IRC server. See below for more information on this.


`HOST irc.network.org:6667` signals webircgateway to connect to `irc.network.org` on port `6667` (`+` before the port signifies TLS). This will only succeed if `gateway = true` in the webircgateway config, otherwise it will be ignored and a connection will be made to the configured IRC server instead.


`CAPTCHA captcha-response-code` will attempt to verify the client with recaptcha. If 'captcha-response-code' passes recaptcha verification then the clients IRC connection will be started. Otherwise, no IRC connection will be possible.


### Encoding / multilingual support
Websockets are required to use UTF-8 encoded messages otherwise the browser will close the connection. To support this, webircgateway will ensure that any messages sent from the IRCd are encoded into UTF-8 before sending them to the browser.

If the IRC network uses an encoding other than UTF-8, the browser may send `ENCODING <encoding>` which will instruct webircgateway to automatically encode all messages to `<encoding>` before sending them to the IRC network, and decode messages back to UTF-8 before sending them to the browser.

However, it is highly recommended to use UTF-8 for your network to simplify things!


### Security considerations
Allowing anybody to connect to your IRC network via the web can open you up to abuse. It is extremely easy for somebody to place code on a popular website that floods your network and with fake users to spam or harass users.

Take special note of the `[allowed_origins]` section of the configuration file. If a client from example.com connects to your webircgateway server but example.com is not listed here, the client will be refused and will not be a threat to your network.

If you are running an IRC network irc.network.org and you host your own webchat, you may want to list `*.network.org` here to only allow clients from your website to connect.


### Building and development
webircgateway is built using golang - v1.11 or later is required for Go modules support to automatically acquire dependencies!

https://golang.org/dl/

To download the source:

```console
git clone https://github.com/kiwiirc/webircgateway.git && cd webircgateway
```

To update your existing source:

```console
git pull
```

Building from source:

```console
go build
```

### Running
Once compiled and you have a config file set, run `./webircgateway --config=config.conf` to start the gateway server. You may reload the configuration file without restarting the server (no downtime!) by sending SIGHUP to the process, `kill -1 <pid of webircgateway>`.

### Configuration location
By default the configuration file is looked for in the current directly, ./config.conf. Use the --config parameter to specify a different location.

You may also use a shell command to load your config by prefixing the config option with "$ " like so: --config="$ curl http://example.com/config.conf". Great if you want to remotely include a config file or load it from a service like etcd.

Note: All filenames within the configuration file are relative to the configuration file itself unless the filename starts with "/" which makes it an absolute path.


### Recommendations
To ensure web clients can connect to your network and to try keep some consistency between networks:

1. Run the webircgateway server over HTTPS. Without it, clients running on HTTPS pages may be blocked from connecting by their browser. You can use https://letsencrypt.org/ for a free signed certificate.
2. Stick to the default engine paths (eg. /webirc/websocket/) and standard web ports (80, 443 for HTTPS) so that clients will know where to connect to.
3. Configure WEBIRC for your IRC servers. This will show the users correct hostname on your network so that bans work.
4. Treat IRC connections made from webircgateway the same as any other IRC connection. Ban evasion and other difficulties arise when networks change web users hostnames / idents. If you must, try setting the users realname field instead.
5. If your network uses `irc.network.org`, use `ws.network.org` to point to your webircgateway.
6. Disable identd lookups for webircgateway clients. There are no benefits and will only slow the connection down.


### License
~~~
   Copyright 2017 Kiwi IRC

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

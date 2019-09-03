package webircgateway

import (
	"fmt"
	"net"
	"net/http"
	"strings"
	"sync"

	"golang.org/x/net/websocket"
)

type TransportWebsocket struct {
	gateway  *Gateway
	wsServer *websocket.Server
}

func (t *TransportWebsocket) Init(g *Gateway) {
	t.gateway = g
	t.wsServer = &websocket.Server{Handler: t.websocketHandler, Handshake: t.checkOrigin}
	t.gateway.HttpRouter.Handle("/webirc/websocket/", t.wsServer)
}

func (t *TransportWebsocket) checkOrigin(config *websocket.Config, req *http.Request) (err error) {
	config.Origin, err = websocket.Origin(config, req)

	var origin string
	if config.Origin != nil {
		origin = config.Origin.String()
	} else {
		origin = ""
	}

	if !t.gateway.isClientOriginAllowed(origin) {
		err = fmt.Errorf("Origin %#v not allowed", origin)
		t.gateway.Log(2, "%s. Closing connection", err)
		return err
	}

	return err
}

func (t *TransportWebsocket) websocketHandler(ws *websocket.Conn) {
	client := t.gateway.NewClient()

	client.RemoteAddr = t.gateway.GetRemoteAddressFromRequest(ws.Request()).String()

	clientHostnames, err := net.LookupAddr(client.RemoteAddr)
	if err != nil {
		client.RemoteHostname = client.RemoteAddr
	} else {
		// FQDNs include a . at the end. Strip it out
		potentialHostname := strings.Trim(clientHostnames[0], ".")

		// Must check that the resolved hostname also resolves back to the users IP
		addr, err := net.LookupIP(potentialHostname)
		if err == nil && len(addr) == 1 && addr[0].String() == client.RemoteAddr {
			client.RemoteHostname = potentialHostname
		} else {
			client.RemoteHostname = client.RemoteAddr
		}
	}

	if t.gateway.isRequestSecure(ws.Request()) {
		client.Tags["secure"] = ""
	}

	_, remoteAddrPort, _ := net.SplitHostPort(ws.Request().RemoteAddr)
	client.Tags["remote-port"] = remoteAddrPort

	client.Log(2, "New websocket client on %s from %s %s", ws.Request().Host, client.RemoteAddr, client.RemoteHostname)

	// We wait until the client send queue has been drained
	var sendDrained sync.WaitGroup
	sendDrained.Add(1)

	// Read from websocket
	go func() {
		for {
			r := make([]byte, 1024)
			len, err := ws.Read(r)
			if err == nil && len > 0 {
				message := string(r[:len])
				client.Log(1, "client->: %s", message)
				select {
				case client.Recv <- message:
				default:
					client.Log(3, "Recv queue full. Dropping data")
					// TODO: Should this really just drop the data or close the connection?
				}

			} else if err != nil {
				client.Log(1, "Websocket connection closed (%s)", err.Error())
				break

			} else if len == 0 {
				client.Log(1, "Got 0 bytes from websocket")
			}
		}

		close(client.Recv)
		client.StartShutdown("client_closed")
	}()

	// Process signals for the client
	for {
		signal, ok := <-client.Signals
		if !ok {
			sendDrained.Done()
			break
		}

		if signal[0] == "data" {
			line := strings.Trim(signal[1], "\r\n")
			client.Log(1, "->ws: %s", line)
			ws.Write([]byte(line))
		}
	}

	sendDrained.Wait()
	ws.Close()
}

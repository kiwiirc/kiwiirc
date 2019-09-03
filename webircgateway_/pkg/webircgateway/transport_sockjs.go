package webircgateway

import (
	"net"
	"strings"

	"github.com/igm/sockjs-go/sockjs"
)

type TransportSockjs struct {
	gateway *Gateway
}

func (t *TransportSockjs) Init(g *Gateway) {
	t.gateway = g
	sockjsHandler := sockjs.NewHandler("/webirc/sockjs", sockjs.DefaultOptions, t.sessionHandler)
	t.gateway.HttpRouter.Handle("/webirc/sockjs/", sockjsHandler)
}

func (t *TransportSockjs) sessionHandler(session sockjs.Session) {
	client := t.gateway.NewClient()

	originHeader := strings.ToLower(session.Request().Header.Get("Origin"))
	if !t.gateway.isClientOriginAllowed(originHeader) {
		client.Log(2, "Origin %s not allowed. Closing connection", originHeader)
		session.Close(0, "Origin not allowed")
		return
	}

	client.RemoteAddr = t.gateway.GetRemoteAddressFromRequest(session.Request()).String()

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

	if t.gateway.isRequestSecure(session.Request()) {
		client.Tags["secure"] = ""
	}

	// This doesn't make sense to have since the remote port may change between requests. Only
	// here for testing purposes for now.
	_, remoteAddrPort, _ := net.SplitHostPort(session.Request().RemoteAddr)
	client.Tags["remote-port"] = remoteAddrPort

	client.Log(2, "New sockjs client on %s from %s %s", session.Request().Host, client.RemoteAddr, client.RemoteHostname)

	// Read from sockjs
	go func() {
		for {
			msg, err := session.Recv()
			if err == nil && len(msg) > 0 {
				client.Log(1, "client->: %s", msg)
				select {
				case client.Recv <- msg:
				default:
					client.Log(3, "Recv queue full. Dropping data")
					// TODO: Should this really just drop the data or close the connection?
				}
			} else if err != nil {
				client.Log(1, "sockjs connection closed (%s)", err.Error())
				break
			} else if len(msg) == 0 {
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
			break
		}

		if signal[0] == "data" {
			line := strings.Trim(signal[1], "\r\n")
			client.Log(1, "->ws: %s", line)
			session.Send(line)
		}
	}
}

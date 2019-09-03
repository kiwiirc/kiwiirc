package webircgateway

import (
	"bufio"
	"net"
	"strings"
	"sync"
)

type TransportTcp struct {
	gateway *Gateway
}

func (t *TransportTcp) Init(g *Gateway) {
	t.gateway = g
}

func (t *TransportTcp) Start(lAddr string) {
	l, err := net.Listen("tcp", lAddr)
	if err != nil {
		t.gateway.Log(3, "TCP error listening: "+err.Error())
		return
	}
	// Close the listener when the application closes.
	defer l.Close()
	t.gateway.Log(2, "TCP listening on "+lAddr)
	for {
		// Listen for an incoming connection.
		conn, err := l.Accept()
		if err != nil {
			t.gateway.Log(3, "TCP error accepting: "+err.Error())
			break
		}
		// Handle connections in a new goroutine.
		go t.handleConn(conn)
	}
}

func (t *TransportTcp) handleConn(conn net.Conn) {
	client := t.gateway.NewClient()

	client.RemoteAddr = conn.RemoteAddr().String()

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

	_, remoteAddrPort, _ := net.SplitHostPort(conn.RemoteAddr().String())
	client.Tags["remote-port"] = remoteAddrPort

	client.Log(2, "New tcp client on %s from %s %s", conn.LocalAddr().String(), client.RemoteAddr, client.RemoteHostname)

	// We wait until the client send queue has been drained
	var sendDrained sync.WaitGroup
	sendDrained.Add(1)

	// Read from TCP
	go func() {
		reader := bufio.NewReader(conn)
		for {
			data, err := reader.ReadString('\n')
			if err == nil {
				message := strings.TrimRight(data, "\r\n")
				client.Log(1, "client->: %s", message)
				select {
				case client.Recv <- message:
				default:
					client.Log(3, "Recv queue full. Dropping data")
					// TODO: Should this really just drop the data or close the connection?
				}

			} else {
				client.Log(1, "TCP connection closed (%s)", err.Error())
				break

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
			//line := strings.Trim(signal[1], "\r\n")
			line := signal[1] + "\n"
			client.Log(1, "->tcp: %s", signal[1])
			conn.Write([]byte(line))
		}
	}

	sendDrained.Wait()
	conn.Close()
}

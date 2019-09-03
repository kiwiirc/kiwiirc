package webircgateway

import (
	"bufio"
	"crypto/tls"
	"errors"
	"fmt"
	"io"
	"net"
	"strconv"
	"strings"
	"sync/atomic"
	"syscall"
	"time"

	"sync"

	"github.com/kiwiirc/webircgateway/pkg/irc"
	"github.com/kiwiirc/webircgateway/pkg/proxy"
)

const (
	// ClientStateIdle - Client connected and just sat there
	ClientStateIdle = "idle"
	// ClientStateConnecting - Connecting upstream
	ClientStateConnecting = "connecting"
	// ClientStateRegistered - Registering to the IRC network
	ClientStateRegistering = "registering"
	// ClientStateConnected - Connected upstream
	ClientStateConnected = "connected"
	// ClientStateEnding - Client is ending its connection
	ClientStateEnding = "ending"
)

// The upstream connection object may be either a TCP client or a KiwiProxy
// instance. Create a common interface we can use that satisfies either
// case.
type ConnInterface interface {
	io.Reader
	io.Writer
	Close() error
}

type ClientSignal [3]string

// Client - Connecting client struct
type Client struct {
	Gateway          *Gateway
	Id               uint64
	State            string
	EndWG            sync.WaitGroup
	shuttingDownLock sync.Mutex
	shuttingDown     bool
	SeenQuit         bool
	Recv             chan string
	UpstreamSend     chan string
	UpstreamStarted  bool
	UpstreamConfig   *ConfigUpstream
	RemoteAddr       string
	RemoteHostname   string
	RemotePort       int
	DestHost         string
	DestPort         int
	DestTLS          bool
	IrcState         *irc.State
	Encoding         string
	// Tags get passed upstream via the WEBIRC command
	Tags map[string]string
	// Captchas may be needed to verify a client
	Verified bool
	SentPass bool
	// Signals for the transport to make use of (data, connection state, etc)
	Signals  chan ClientSignal
	Features struct {
		Messagetags bool
		Metadata    bool
		ExtJwt      bool
	}
	// The specific message-tags CAP that the client has requested if we are wrapping it
	RequestedMessageTagsCap string
}

var nextClientID uint64 = 1

// NewClient - Makes a new client
func NewClient(gateway *Gateway) *Client {
	thisID := atomic.AddUint64(&nextClientID, 1)

	c := &Client{
		Gateway:        gateway,
		Id:             thisID,
		State:          ClientStateIdle,
		Recv:           make(chan string, 50),
		UpstreamSend:   make(chan string, 50),
		Encoding:       "UTF-8",
		Signals:        make(chan ClientSignal, 50),
		Tags:           make(map[string]string),
		IrcState:       irc.NewState(),
		UpstreamConfig: &ConfigUpstream{},
	}

	// Auto enable some features by default. They may be disabled later on
	c.Features.ExtJwt = true

	// Auto verify the client if it's not needed
	if !gateway.Config.RequiresVerification {
		c.Verified = true
	}

	go c.clientLineWorker()

	// This Add(1) will be ended once the client starts shutting down in StartShutdown()
	c.EndWG.Add(1)

	// Add to the clients maps and wait until everything has been marked
	// as completed (several routines add themselves to EndWG so that we can catch
	// when they are all completed)
	gateway.Clients.Set(string(c.Id), c)
	go func() {
		c.EndWG.Wait()
		gateway.Clients.Remove(string(c.Id))

		hook := &HookClientState{
			Client:    c,
			Connected: false,
		}
		hook.Dispatch("client.state")
	}()

	hook := &HookClientState{
		Client:    c,
		Connected: true,
	}
	hook.Dispatch("client.state")

	return c
}

// Log - Log a line of text with context of this client
func (c *Client) Log(level int, format string, args ...interface{}) {
	prefix := fmt.Sprintf("client:%d ", c.Id)
	c.Gateway.Log(level, prefix+format, args...)
}

func (c *Client) IsShuttingDown() bool {
	c.shuttingDownLock.Lock()
	defer c.shuttingDownLock.Unlock()
	return c.shuttingDown
}

func (c *Client) StartShutdown(reason string) {
	c.shuttingDownLock.Lock()
	defer c.shuttingDownLock.Unlock()

	c.Log(1, "StartShutdown(%s) ShuttingDown=%t", reason, c.shuttingDown)
	if !c.shuttingDown {
		lastState := c.State
		c.shuttingDown = true
		c.State = ClientStateEnding

		switch reason {
		case "upstream_closed":
			c.Log(2, "Upstream closed the connection")
		case "err_connecting_upstream":
		case "err_no_upstream":
			// Error has been logged already
		case "client_closed":
			if !c.SeenQuit && c.Gateway.Config.SendQuitOnClientClose != "" && lastState == ClientStateConnected {
				c.UpstreamSend <- "QUIT :" + c.Gateway.Config.SendQuitOnClientClose
			}
			c.Log(2, "Client disconnected")
		default:
			c.Log(2, "Closed: %s", reason)
		}

		close(c.Signals)
		c.EndWG.Done()
	}
}

func (c *Client) SendClientSignal(signal string, args ...string) {
	c.shuttingDownLock.Lock()
	defer c.shuttingDownLock.Unlock()

	if !c.shuttingDown {
		switch len(args) {
		case 0:
			c.Signals <- ClientSignal{signal}
		case 1:
			c.Signals <- ClientSignal{signal, args[0]}
		case 2:
			c.Signals <- ClientSignal{signal, args[0], args[1]}
		}
	}
}

func (c *Client) SendIrcError(message string) {
	c.SendClientSignal("data", "ERROR :"+message)
}

func (c *Client) connectUpstream() {
	client := c

	c.UpstreamStarted = true

	var upstreamConfig ConfigUpstream

	if client.DestHost == "" {
		client.Log(2, "Using configured upstream")
		var err error
		upstreamConfig, err = c.Gateway.findUpstream()
		if err != nil {
			client.Log(3, "No upstreams available")
			client.SendIrcError("The server has not been configured")
			client.StartShutdown("err_no_upstream")
			return
		}
	} else {
		if !c.Gateway.isIrcAddressAllowed(client.DestHost) {
			client.Log(2, "Server %s is not allowed. Closing connection", client.DestHost)
			client.SendIrcError("Not allowed to connect to " + client.DestHost)
			client.SendClientSignal("state", "closed", "err_forbidden")
			client.StartShutdown("err_no_upstream")
			return
		}

		client.Log(2, "Using client given upstream")
		upstreamConfig = c.configureUpstream()
	}

	c.UpstreamConfig = &upstreamConfig

	hook := &HookIrcConnectionPre{
		Client:         client,
		UpstreamConfig: &upstreamConfig,
	}
	hook.Dispatch("irc.connection.pre")
	if hook.Halt {
		client.SendClientSignal("state", "closed", "err_forbidden")
		client.StartShutdown("err_connecting_upstream")
		return
	}

	client.State = ClientStateConnecting

	upstream, upstreamErr := client.makeUpstreamConnection()
	if upstreamErr != nil {
		// Error handling was already managed in makeUpstreamConnection()
		return
	}

	client.State = ClientStateRegistering

	client.writeWebircLines(upstream)
	client.maybeSendPass(upstream)
	client.SendClientSignal("state", "connected")
	client.proxyData(upstream)
}

func (c *Client) makeUpstreamConnection() (ConnInterface, error) {
	client := c
	upstreamConfig := c.UpstreamConfig

	var connection ConnInterface

	if upstreamConfig.Proxy == nil {
		// Connect directly to the IRCd
		dialer := net.Dialer{}
		dialer.Timeout = time.Second * time.Duration(upstreamConfig.Timeout)

		var conn net.Conn
		var connErr error
		if upstreamConfig.Network == "unix" {
			conn, connErr = dialer.Dial("unix", upstreamConfig.Hostname)
		} else {
			upstreamStr := fmt.Sprintf("%s:%d", upstreamConfig.Hostname, upstreamConfig.Port)
			conn, connErr = dialer.Dial("tcp", upstreamStr)
		}

		if connErr != nil {
			client.Log(3, "Error connecting to the upstream IRCd. %s", connErr.Error())
			errString := ""
			if errString = typeOfErr(connErr); errString != "" {
				errString = "err_" + errString
			}
			client.SendClientSignal("state", "closed", errString)
			client.StartShutdown("err_connecting_upstream")
			return nil, errors.New("error connecting upstream")
		}

		// Add the ports into the identd before possible TLS handshaking. If we do it after then
		// there's a good chance the identd lookup will occur before the handshake has finished
		if c.Gateway.Config.Identd {
			// Keep track of the upstreams local and remote port numbers
			_, lPortStr, _ := net.SplitHostPort(conn.LocalAddr().String())
			client.IrcState.LocalPort, _ = strconv.Atoi(lPortStr)
			_, rPortStr, _ := net.SplitHostPort(conn.RemoteAddr().String())
			client.IrcState.RemotePort, _ = strconv.Atoi(rPortStr)

			c.Gateway.identdServ.AddIdent(client.IrcState.LocalPort, client.IrcState.RemotePort, client.IrcState.Username, "")
		}

		if upstreamConfig.TLS {
			tlsConfig := &tls.Config{InsecureSkipVerify: true}
			tlsConn := tls.Client(conn, tlsConfig)
			err := tlsConn.Handshake()
			if err != nil {
				client.Log(3, "Error connecting to the upstream IRCd. %s", err.Error())
				client.SendClientSignal("state", "closed", "err_tls")
				client.StartShutdown("err_connecting_upstream")
				return nil, errors.New("error connecting upstream")
			}

			conn = net.Conn(tlsConn)
		}

		connection = ConnInterface(conn)
	}

	if upstreamConfig.Proxy != nil {
		// Connect to the IRCd via a proxy
		conn := proxy.MakeKiwiProxyConnection()
		conn.DestHost = upstreamConfig.Hostname
		conn.DestPort = upstreamConfig.Port
		conn.DestTLS = upstreamConfig.TLS
		conn.Username = upstreamConfig.Proxy.Username
		conn.ProxyInterface = upstreamConfig.Proxy.Interface

		dialErr := conn.Dial(fmt.Sprintf(
			"%s:%d",
			upstreamConfig.Proxy.Hostname,
			upstreamConfig.Proxy.Port,
		))

		if dialErr != nil {
			errString := ""
			if errString = typeOfErr(dialErr); errString != "" {
				errString = "err_" + errString
			} else {
				errString = "err_proxy"
			}
			client.Log(3,
				"Error connecting to the kiwi proxy, %s:%d. %s",
				upstreamConfig.Proxy.Hostname,
				upstreamConfig.Proxy.Port,
				dialErr.Error(),
			)

			client.SendClientSignal("state", "closed", errString)
			client.StartShutdown("err_connecting_upstream")
			return nil, errors.New("error connecting upstream")
		}

		connection = ConnInterface(conn)
	}

	return connection, nil
}

func (c *Client) writeWebircLines(upstream ConnInterface) {
	// Send any WEBIRC lines
	if c.UpstreamConfig.WebircPassword == "" {
		c.Log(1, "No webirc to send")
		return
	}

	gatewayName := "webircgateway"
	if c.Gateway.Config.GatewayName != "" {
		gatewayName = c.Gateway.Config.GatewayName
	}
	if c.UpstreamConfig.GatewayName != "" {
		gatewayName = c.UpstreamConfig.GatewayName
	}

	webircTags := c.buildWebircTags()
	if strings.Contains(webircTags, " ") {
		webircTags = ":" + webircTags
	}

	clientHostname := c.RemoteHostname
	if c.Gateway.Config.ClientHostname != "" {
		clientHostname = makeClientReplacements(c.Gateway.Config.ClientHostname, c)
	}

	remoteAddr := c.RemoteAddr
	// Prefix IPv6 addresses that start with a : so they can be sent as an individual IRC
	//  parameter. eg. ::1 would not parse correctly as a parameter, while 0::1 will
	if strings.HasPrefix(remoteAddr, ":") {
		remoteAddr = "0" + remoteAddr
	}

	webircLine := fmt.Sprintf(
		"WEBIRC %s %s %s %s %s\n",
		c.UpstreamConfig.WebircPassword,
		gatewayName,
		clientHostname,
		remoteAddr,
		webircTags,
	)
	c.Log(1, "->upstream: %s", webircLine)
	upstream.Write([]byte(webircLine))
}

func (c *Client) maybeSendPass(upstream ConnInterface) {
	if c.UpstreamConfig.ServerPassword == "" {
		return
	}
	c.SentPass = true
	passLine := fmt.Sprintf(
		"PASS %s\n",
		c.UpstreamConfig.ServerPassword,
	)
	c.Log(1, "->upstream: %s", passLine)
	upstream.Write([]byte(passLine))
}

func (c *Client) proxyData(upstream ConnInterface) {
	client := c
	upstreamConfig := c.UpstreamConfig

	// Data from client to upstream
	go func() {
		client.EndWG.Add(1)
		defer func() {
			client.EndWG.Done()
		}()

		var writeThrottle time.Duration
		if upstreamConfig.Throttle > 0 {
			writeThrottle = time.Duration(int64(time.Second) / int64(upstreamConfig.Throttle))
		} else {
			writeThrottle = 0
		}

		for {
			data, ok := <-client.UpstreamSend
			if !ok {
				client.Log(1, "connectUpstream() client.UpstreamSend closed")
				break
			}
			if strings.HasPrefix(data, "PASS ") && c.SentPass {
				// Hijack the PASS command if we already sent a pass command
				continue
			} else if strings.HasPrefix(data, "USER ") {
				// Hijack the USER command as we may have some overrides
				data = fmt.Sprintf(
					"USER %s 0 * :%s",
					client.IrcState.Username,
					client.IrcState.RealName,
				)
			} else if strings.HasPrefix(strings.ToUpper(data), "QUIT ") {
				client.SeenQuit = true
			}

			message, _ := irc.ParseLine(data)

			hook := &HookIrcLine{
				Client:         client,
				UpstreamConfig: upstreamConfig,
				Line:           data,
				Message:        message,
				ToServer:       true,
			}
			hook.Dispatch("irc.line")
			if hook.Halt {
				continue
			}

			// Plugins may have modified the data
			data = hook.Line

			client.Log(1, "->upstream: %s", data)
			data = utf8ToOther(data, client.Encoding)
			if data == "" {
				client.Log(1, "Failed to encode into '%s'. Dropping data", c.Encoding)
				continue
			}

			upstream.Write([]byte(data + "\r\n"))

			// Throttle writes if configured, but only after registration is complete. Typical IRCd
			// behavior is to not throttle registration commands.
			if writeThrottle > 0 && client.State != ClientStateRegistering {
				time.Sleep(writeThrottle)
			}
		}

		upstream.Close()
	}()

	// Data from upstream to client
	go func() {
		client.EndWG.Add(1)
		defer func() {
			client.EndWG.Done()
		}()

		reader := bufio.NewReader(upstream)
		for {
			data, err := reader.ReadString('\n')
			if err != nil {
				break
			}

			data = strings.Trim(data, "\n\r")
			message, _ := irc.ParseLine(data)

			hook := &HookIrcLine{
				Client:         client,
				UpstreamConfig: upstreamConfig,
				Line:           data,
				Message:        message,
				ToServer:       false,
			}
			hook.Dispatch("irc.line")
			if hook.Halt {
				continue
			}

			// Plugins may have modified the data
			data = hook.Line

			if data == "" {
				continue
			}

			client.Log(1, "upstream->: %s", data)

			data = ensureUtf8(data, client.Encoding)
			if data == "" {
				client.Log(1, "Failed to encode into 'UTF-8'. Dropping data")
				continue
			}

			data = client.ProcessLineFromUpstream(data)
			if data == "" {
				return
			}

			client.SendClientSignal("data", data)
		}

		client.SendClientSignal("state", "closed")
		client.StartShutdown("upstream_closed")
		upstream.Close()
		if client.IrcState.RemotePort > 0 {
			c.Gateway.identdServ.RemoveIdent(client.IrcState.LocalPort, client.IrcState.RemotePort, "")
		}
	}()
}

func typeOfErr(err error) string {
	if err == nil {
		return ""
	}

	if netError, ok := err.(net.Error); ok && netError.Timeout() {
		return "timeout"
	}

	switch t := err.(type) {
	case *proxy.ConnError:
		switch t.Type {
		case "conn_reset":
			return ""
		case "conn_refused":
			return "refused"
		case "not_found":
			return "unknown_host"
		case "conn_timeout":
			return "timeout"
		default:
			return ""
		}

	case *net.OpError:
		if t.Op == "dial" {
			return "unknown_host"
		} else if t.Op == "read" {
			return "refused"
		}

	case syscall.Errno:
		if t == syscall.ECONNREFUSED {
			return "refused"
		}
	}

	return ""
}

// Handle lines sent from the client
func (c *Client) clientLineWorker() {
	c.EndWG.Add(1)
	defer func() {
		c.EndWG.Done()
	}()

	for {
		data, ok := <-c.Recv
		if !ok {
			c.Log(1, "clientLineWorker() client.Recv closed")
			break
		}

		c.Log(1, "ws->: %s", data)

		// Some IRC lines such as USER commands may have some parameter replacements
		line, err := c.ProcessLineFromClient(data)
		if err == nil && line != "" {
			c.UpstreamSend <- line
		}
	}

	close(c.UpstreamSend)
}

// configureUpstream - Generate an upstream configuration from the information set on the client instance
func (c *Client) configureUpstream() ConfigUpstream {
	upstreamConfig := ConfigUpstream{}
	upstreamConfig.Hostname = c.DestHost
	upstreamConfig.Port = c.DestPort
	upstreamConfig.TLS = c.DestTLS
	upstreamConfig.Timeout = c.Gateway.Config.GatewayTimeout
	upstreamConfig.Throttle = c.Gateway.Config.GatewayThrottle
	upstreamConfig.WebircPassword = c.Gateway.findWebircPassword(c.DestHost)

	return upstreamConfig
}

func (c *Client) buildWebircTags() string {
	str := ""
	for key, val := range c.Tags {
		if str != "" {
			str += " "
		}

		if val == "" {
			str += key
		} else {
			str += key + "=" + val
		}
	}

	return str
}

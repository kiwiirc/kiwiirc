package webircgateway

import (
	"crypto/tls"
	"encoding/json"
	"fmt"
	"net"
	"net/http"
	"os"
	"strconv"
	"strings"
	"sync"

	"errors"

	"github.com/kiwiirc/webircgateway/pkg/identd"
	"github.com/kiwiirc/webircgateway/pkg/proxy"
	"github.com/orcaman/concurrent-map"
)

var (
	Version = "-"
)

type Gateway struct {
	Config      *Config
	HttpRouter  *http.ServeMux
	LogOutput   chan string
	messageTags *MessageTagManager
	identdServ  identd.Server
	Clients     cmap.ConcurrentMap
	Acme        *LEManager
	Function    string
	httpSrv     *http.Server
	closeWg     sync.WaitGroup
}

func NewGateway(function string) *Gateway {
	s := &Gateway{}
	s.Function = function
	s.Config = NewConfig(s)
	s.HttpRouter = http.NewServeMux()
	s.LogOutput = make(chan string, 5)
	s.identdServ = identd.NewIdentdServer()
	s.messageTags = NewMessageTagManager()
	// Clients hold a map lookup for all the connected clients
	s.Clients = cmap.New()
	s.Acme = NewLetsEncryptManager(s)

	return s
}

func (s *Gateway) Log(level int, format string, args ...interface{}) {
	if level < s.Config.LogLevel {
		return
	}

	levels := [...]string{"L_DEBUG", "L_INFO", "L_WARN"}
	line := fmt.Sprintf(levels[level-1]+" "+format, args...)

	select {
	case s.LogOutput <- line:
	}
}

func (s *Gateway) Start() {
	s.closeWg.Add(1)

	if s.Function == "gateway" {
		s.maybeStartStaticFileServer()
		s.initHttpRoutes()
		s.maybeStartIdentd()

		for _, serverConfig := range s.Config.Servers {
			go s.startServer(serverConfig)
		}
	}

	if s.Function == "proxy" {
		proxy.Start(fmt.Sprintf("%s:%d", s.Config.Proxy.LocalAddr, s.Config.Proxy.Port))
	}
}

func (s *Gateway) Close() {
	defer s.closeWg.Done()
	s.httpSrv.Close()
}

func (s *Gateway) WaitClose() {
	s.closeWg.Wait()
}

func (s *Gateway) maybeStartStaticFileServer() {
	if s.Config.Webroot != "" {
		webroot := s.Config.ResolvePath(s.Config.Webroot)
		s.Log(2, "Serving files from %s", webroot)
		s.HttpRouter.Handle("/", http.FileServer(http.Dir(webroot)))
	}
}

func (s *Gateway) initHttpRoutes() error {
	// Add all the transport routes
	engineConfigured := false
	for _, transport := range s.Config.ServerTransports {
		switch transport {
		case "kiwiirc":
			t := &TransportKiwiirc{}
			t.Init(s)
			engineConfigured = true
		case "websocket":
			t := &TransportWebsocket{}
			t.Init(s)
			engineConfigured = true
		case "sockjs":
			t := &TransportSockjs{}
			t.Init(s)
			engineConfigured = true
		default:
			s.Log(3, "Invalid server engine: '%s'", transport)
		}
	}

	if !engineConfigured {
		s.Log(3, "No server engines configured")
		return errors.New("No server engines configured")
	}

	// Add some general server info about this webircgateway instance
	s.HttpRouter.HandleFunc("/webirc/info", func(w http.ResponseWriter, r *http.Request) {
		out, _ := json.Marshal(map[string]interface{}{
			"name":    "webircgateway",
			"version": Version,
		})

		w.Write(out)
	})

	s.HttpRouter.HandleFunc("/webirc/_status", func(w http.ResponseWriter, r *http.Request) {
		if !isPrivateIP(s.GetRemoteAddressFromRequest(r)) {
			w.WriteHeader(403)
			return
		}

		out := ""
		for item := range s.Clients.Iter() {
			c := item.Val.(*Client)
			line := fmt.Sprintf(
				"%s:%d %s %s!%s %s %s",
				c.UpstreamConfig.Hostname,
				c.UpstreamConfig.Port,
				c.State,
				c.IrcState.Nick,
				c.IrcState.Username,
				c.RemoteAddr,
				c.RemoteHostname,
			)

			// Allow plugins to add their own status data
			hook := HookStatus{}
			hook.Client = c
			hook.Line = line
			hook.Dispatch("status.client")
			if !hook.Halt {
				out += hook.Line + "\n"
			}

		}

		w.Write([]byte(out))
	})

	return nil
}

func (s *Gateway) maybeStartIdentd() {
	if s.Config.Identd {
		err := s.identdServ.Run()
		if err != nil {
			s.Log(3, "Error starting identd server: %s", err.Error())
		} else {
			s.Log(2, "Identd server started")
		}
	}
}

func (s *Gateway) startServer(conf ConfigServer) {
	addr := fmt.Sprintf("%s:%d", conf.LocalAddr, conf.Port)

	if strings.HasPrefix(strings.ToLower(conf.LocalAddr), "tcp:") {
		t := &TransportTcp{}
		t.Init(s)
		t.Start(conf.LocalAddr[4:] + ":" + strconv.Itoa(conf.Port))
	} else if conf.TLS && conf.LetsEncryptCacheDir == "" {
		if conf.CertFile == "" || conf.KeyFile == "" {
			s.Log(3, "'cert' and 'key' options must be set for TLS servers")
			return
		}

		tlsCert := s.Config.ResolvePath(conf.CertFile)
		tlsKey := s.Config.ResolvePath(conf.KeyFile)

		s.Log(2, "Listening with TLS on %s", addr)
		keyPair, keyPairErr := tls.LoadX509KeyPair(tlsCert, tlsKey)
		if keyPairErr != nil {
			s.Log(3, "Failed to listen with TLS, certificate error: %s", keyPairErr.Error())
			return
		}
		s.httpSrv = &http.Server{
			Addr: addr,
			TLSConfig: &tls.Config{
				Certificates: []tls.Certificate{keyPair},
			},
			Handler: s.HttpRouter,
		}

		// Don't use HTTP2 since it doesn't support websockets
		s.httpSrv.TLSNextProto = make(map[string]func(*http.Server, *tls.Conn, http.Handler))

		err := s.httpSrv.ListenAndServeTLS("", "")
		if err != nil {
			s.Log(3, "Failed to listen with TLS: %s", err.Error())
		}
	} else if conf.TLS && conf.LetsEncryptCacheDir != "" {
		s.Log(2, "Listening with letsencrypt TLS on %s", addr)
		leManager := s.Acme.Get(conf.LetsEncryptCacheDir)
		s.httpSrv = &http.Server{
			Addr: addr,
			TLSConfig: &tls.Config{
				GetCertificate: leManager.GetCertificate,
			},
			Handler: s.HttpRouter,
		}

		// Don't use HTTP2 since it doesn't support websockets
		s.httpSrv.TLSNextProto = make(map[string]func(*http.Server, *tls.Conn, http.Handler))

		err := s.httpSrv.ListenAndServeTLS("", "")
		s.Log(3, "Listening with letsencrypt failed: %s", err.Error())
	} else if strings.HasPrefix(strings.ToLower(conf.LocalAddr), "unix:") {
		socketFile := conf.LocalAddr[5:]
		s.Log(2, "Listening on %s", socketFile)
		os.Remove(socketFile)
		server, serverErr := net.Listen("unix", socketFile)
		if serverErr != nil {
			s.Log(3, serverErr.Error())
			return
		}
		os.Chmod(socketFile, conf.BindMode)
		http.Serve(server, s.HttpRouter)
	} else {
		s.Log(2, "Listening on %s", addr)
		s.httpSrv = &http.Server{Addr: addr, Handler: s.HttpRouter}
		err := s.httpSrv.ListenAndServe()
		s.Log(3, err.Error())
	}
}

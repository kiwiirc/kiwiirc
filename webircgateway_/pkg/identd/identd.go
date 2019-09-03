package identd

import (
	"fmt"
	"net"
	"net/textproto"
	"sync"
)

// Server - An IdentD server
type Server struct {
	Entries     map[string]string
	EntriesLock sync.Mutex
}

// NewIdentdServer - Create a new IdentdServer instance
func NewIdentdServer() Server {
	return Server{
		Entries: make(map[string]string),
	}
}

// AddIdent - Add an ident to be looked up
func (i *Server) AddIdent(localPort, remotePort int, ident string, iface string) {
	i.EntriesLock.Lock()
	i.Entries[fmt.Sprintf("%d-%d", localPort, remotePort)] = ident
	i.EntriesLock.Unlock()
}

// RemoveIdent - Remove an ident from being looked up
func (i *Server) RemoveIdent(localPort, remotePort int, iface string) {
	i.EntriesLock.Lock()
	delete(i.Entries, fmt.Sprintf("%d-%d", localPort, remotePort))
	i.EntriesLock.Unlock()
}

// Run - Start listening for ident lookups
func (i *Server) Run() error {
	serv, err := net.Listen("tcp", ":113")
	if err != nil {
		return err
	}

	go i.ListenForRequests(&serv)
	return nil
}

// ListenForRequests - Listen on a net.Listener for ident lookups
func (i *Server) ListenForRequests(serverSocket *net.Listener) {
	for {
		serv := *serverSocket
		client, err := serv.Accept()
		if err != nil {
			break
		}

		go func(conn net.Conn) {
			tc := textproto.NewConn(conn)

			line, err := tc.ReadLine()
			if err != nil {
				conn.Close()
				return
			}

			var localPort, remotePort int
			fmt.Sscanf(line, "%d, %d", &localPort, &remotePort)
			if localPort > 0 && remotePort > 0 {
				i.EntriesLock.Lock()
				ident, ok := i.Entries[fmt.Sprintf("%d-%d", localPort, remotePort)]
				i.EntriesLock.Unlock()
				if !ok {
					fmt.Fprintf(conn, "%d, %d : ERROR : NO-USER\r\n", localPort, remotePort)
				} else {
					fmt.Fprintf(conn, "%d, %d : USERID : UNIX : %s\r\n", localPort, remotePort, ident)
				}
			}

			conn.Close()
		}(client)
	}
}

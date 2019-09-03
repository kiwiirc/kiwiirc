package proxy

import (
	"encoding/json"
	"errors"
	"io"
	"net"
)

type KiwiProxyState int

const KiwiProxyStateClosed KiwiProxyState = 0
const KiwiProxyStateConnecting KiwiProxyState = 1
const KiwiProxyStateHandshaking KiwiProxyState = 2
const KiwiProxyStateConnected KiwiProxyState = 3

type ConnError struct {
	Msg  string
	Type string
}

func (err *ConnError) Error() string {
	return err.Msg
}

type KiwiProxyConnection struct {
	Username       string
	ProxyInterface string
	DestHost       string
	DestPort       int
	DestTLS        bool
	State          KiwiProxyState
	Conn           *net.Conn
}

func MakeKiwiProxyConnection() *KiwiProxyConnection {
	return &KiwiProxyConnection{
		State: KiwiProxyStateClosed,
	}
}

func (c *KiwiProxyConnection) Close() error {
	if c.State == KiwiProxyStateClosed {
		return errors.New("Connection already closed")
	}

	return (*c.Conn).Close()
}

func (c *KiwiProxyConnection) Dial(proxyServerAddr string) error {
	if c.State != KiwiProxyStateClosed {
		return errors.New("Connection in closed state")
	}

	c.State = KiwiProxyStateConnecting

	conn, err := net.Dial("tcp", proxyServerAddr)
	if err != nil {
		return err
	}

	c.Conn = &conn
	c.State = KiwiProxyStateHandshaking

	meta, _ := json.Marshal(map[string]interface{}{
		"username":  c.Username,
		"interface": c.ProxyInterface,
		"host":      c.DestHost,
		"port":      c.DestPort,
		"ssl":       c.DestTLS,
	})

	(*c.Conn).Write(append(meta, byte('\n')))

	buf := make([]byte, 1024)
	bufLen, readErr := (*c.Conn).Read(buf)
	if readErr != nil {
		(*c.Conn).Close()
		c.State = KiwiProxyStateClosed
		return readErr
	}

	response := string(buf)
	if bufLen > 0 && response[0] == '1' {
		c.State = KiwiProxyStateConnected
	} else {
		(*c.Conn).Close()
		c.State = KiwiProxyStateClosed

		if bufLen == 0 {
			return errors.New("The proxy could not connect to the destination")
		}

		switch response[0] {
		case '0':
			return errors.New("The proxy could not connect to the destination")
		case '2':
			return &ConnError{Msg: "Connection reset", Type: "conn_reset"}
		case '3':
			return &ConnError{Msg: "Connection refused", Type: "conn_refused"}
		case '4':
			return &ConnError{Msg: "Host not found", Type: "not_found"}
		case '5':
			return &ConnError{Msg: "Connection timed out", Type: "conn_timeout"}
		}
	}

	return nil
}

func (c *KiwiProxyConnection) Read(b []byte) (n int, err error) {
	if c.State == KiwiProxyStateConnecting || c.State == KiwiProxyStateHandshaking {
		return 0, nil
	} else if c.State == KiwiProxyStateClosed {
		return 0, io.EOF
	} else {
		return (*c.Conn).Read(b)
	}
}

func (c *KiwiProxyConnection) Write(b []byte) (n int, err error) {
	if c.State == KiwiProxyStateConnecting || c.State == KiwiProxyStateHandshaking {
		return 0, nil
	} else if c.State == KiwiProxyStateClosed {
		return 0, io.EOF
	} else {
		return (*c.Conn).Write(b)
	}
}

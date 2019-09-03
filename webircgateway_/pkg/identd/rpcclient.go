package identd

import "net"
import "fmt"
import "time"

func MakeRpcClient(appName string) *RpcClient {
	return &RpcClient{AppName: appName}
}

type RpcClient struct {
	AppName string
	Conn    *net.Conn
}

func (rpc *RpcClient) ConnectAndReconnect(serverAddress string) {
	for {
		if rpc.Conn == nil {
			println("Connecting to identd RPC...")
			rpc.Connect(serverAddress)
		}

		time.Sleep(time.Second * 3)
	}
}

func (rpc *RpcClient) Connect(serverAddress string) error {
	conn, err := net.Dial("tcp", serverAddress)
	if err != nil {
		return err
	}

	rpc.Conn = &conn
	rpc.Write("id " + rpc.AppName)

	return nil
}

func (rpc *RpcClient) Write(line string) error {
	if rpc.Conn == nil {
		return fmt.Errorf("not connected")
	}

	conn := *rpc.Conn
	_, err := conn.Write([]byte(line + "\n"))
	if err != nil {
		rpc.Conn = nil
		conn.Close()
	}
	return err
}

func (rpc *RpcClient) AddIdent(lport int, rport int, username string, iface string) {
	rpc.Write(fmt.Sprintf("add %s %d %d %s", username, lport, rport, iface))
}

func (rpc *RpcClient) RemoveIdent(lport int, rport int, username string, iface string) {
	rpc.Write(fmt.Sprintf("del %d %d %s", lport, rport, iface))
}

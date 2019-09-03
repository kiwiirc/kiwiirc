package webircgateway

import (
	"errors"
	"math/rand"
	"net"
	"net/http"
	"strings"
)

func (s *Gateway) NewClient() *Client {
	return NewClient(s)
}
func (s *Gateway) isClientOriginAllowed(originHeader string) bool {
	// Empty list of origins = all origins allowed
	if len(s.Config.RemoteOrigins) == 0 {
		return true
	}

	// No origin header = running on the same page
	if originHeader == "" {
		return true
	}

	foundMatch := false

	for _, originMatch := range s.Config.RemoteOrigins {
		if originMatch.Match(originHeader) {
			foundMatch = true
			break
		}
	}

	return foundMatch
}

func (s *Gateway) isIrcAddressAllowed(addr string) bool {
	// Empty whitelist = all destinations allowed
	if len(s.Config.GatewayWhitelist) == 0 {
		return true
	}

	foundMatch := false

	for _, addrMatch := range s.Config.GatewayWhitelist {
		if addrMatch.Match(addr) {
			foundMatch = true
			break
		}
	}

	return foundMatch
}

func (s *Gateway) findUpstream() (ConfigUpstream, error) {
	var ret ConfigUpstream

	if len(s.Config.Upstreams) == 0 {
		return ret, errors.New("No upstreams available")
	}

	randIdx := rand.Intn(len(s.Config.Upstreams))
	ret = s.Config.Upstreams[randIdx]

	return ret, nil
}

func (s *Gateway) findWebircPassword(ircHost string) string {
	pass, exists := s.Config.GatewayWebircPassword[strings.ToLower(ircHost)]
	if !exists {
		pass = ""
	}

	return pass
}

func (s *Gateway) GetRemoteAddressFromRequest(req *http.Request) net.IP {
	remoteAddr, _, _ := net.SplitHostPort(req.RemoteAddr)

	// Some web listeners such as unix sockets don't get a RemoteAddr, so default to localhost
	if remoteAddr == "" {
		remoteAddr = "127.0.0.1"
	}

	remoteIP := net.ParseIP(remoteAddr)

	isInRange := false
	for _, cidrRange := range s.Config.ReverseProxies {
		if cidrRange.Contains(remoteIP) {
			isInRange = true
			break
		}
	}

	// If the remoteIP is not in a whitelisted reverse proxy range, don't trust
	// the headers and use the remoteIP as the users IP
	if !isInRange {
		return remoteIP
	}

	headerVal := req.Header.Get("x-forwarded-for")
	ips := strings.Split(headerVal, ",")
	ipStr := strings.Trim(ips[0], " ")
	if ipStr != "" {
		ip := net.ParseIP(ipStr)
		if ip != nil {
			remoteIP = ip
		}
	}

	return remoteIP

}

func (s *Gateway) isRequestSecure(req *http.Request) bool {
	remoteAddr, _, _ := net.SplitHostPort(req.RemoteAddr)
	remoteIP := net.ParseIP(remoteAddr)

	isInRange := false
	for _, cidrRange := range s.Config.ReverseProxies {
		if cidrRange.Contains(remoteIP) {
			isInRange = true
			break
		}
	}

	// If the remoteIP is not in a whitelisted reverse proxy range, don't trust
	// the headers and check the request directly
	if !isInRange && req.TLS == nil {
		return false
	} else if !isInRange {
		return true
	}

	headerVal := strings.ToLower(req.Header.Get("x-forwarded-proto"))
	if headerVal == "https" {
		return true
	}

	return false
}

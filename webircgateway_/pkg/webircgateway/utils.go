package webircgateway

import (
	"fmt"
	"net"
	"strings"
	"unicode/utf8"

	"golang.org/x/net/html/charset"
)

var privateIPBlocks []*net.IPNet

func init() {
	for _, cidr := range []string{
		"127.0.0.0/8",    // IPv4 loopback
		"10.0.0.0/8",     // RFC1918
		"172.16.0.0/12",  // RFC1918
		"192.168.0.0/16", // RFC1918
		"::1/128",        // IPv6 loopback
		"fe80::/10",      // IPv6 link-local
	} {
		_, block, _ := net.ParseCIDR(cidr)
		privateIPBlocks = append(privateIPBlocks, block)
	}
}

func isPrivateIP(ip net.IP) bool {
	for _, block := range privateIPBlocks {
		if block.Contains(ip) {
			return true
		}
	}
	return false
}

// Username / realname / webirc hostname can all have configurable replacements
func makeClientReplacements(format string, client *Client) string {
	ret := format
	ret = strings.Replace(ret, "%i", Ipv4ToHex(client.RemoteAddr), -1)
	ret = strings.Replace(ret, "%h", client.RemoteHostname, -1)
	ret = strings.Replace(ret, "%n", client.IrcState.Nick, -1)
	return ret
}

func Ipv4ToHex(ip string) string {
	var ipParts [4]int
	fmt.Sscanf(ip, "%d.%d.%d.%d", &ipParts[0], &ipParts[1], &ipParts[2], &ipParts[3])
	ipHex := fmt.Sprintf("%02x%02x%02x%02x", ipParts[0], ipParts[1], ipParts[2], ipParts[3])
	return ipHex
}

func ensureUtf8(s string, fromEncoding string) string {
	if utf8.ValidString(s) {
		return s
	}

	encoding, encErr := charset.Lookup(fromEncoding)
	if encoding == nil {
		println("encErr:", encErr)
		return ""
	}

	d := encoding.NewDecoder()
	s2, _ := d.String(s)
	return s2
}

func utf8ToOther(s string, toEncoding string) string {
	if toEncoding == "UTF-8" && utf8.ValidString(s) {
		return s
	}

	encoding, _ := charset.Lookup(toEncoding)
	if encoding == nil {
		return ""
	}

	e := encoding.NewEncoder()
	s2, _ := e.String(s)
	return s2
}

func containsOneOf(s string, substrs []string) bool {
	for _, substr := range substrs {
		if strings.Contains(s, substr) {
			return true
		}
	}

	return false
}

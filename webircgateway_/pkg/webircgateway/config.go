package webircgateway

import (
	"errors"
	"net"
	"os"
	"os/exec"
	"path/filepath"
	"strconv"
	"strings"

	"github.com/gobwas/glob"
	"gopkg.in/ini.v1"
)

// ConfigUpstream - An upstream config
type ConfigUpstream struct {
	// Plugins may assign an arbitary address to an upstream network
	NetworkCommonAddress string
	Network              string
	Hostname             string
	Port                 int
	TLS                  bool
	Timeout              int
	Throttle             int
	WebircPassword       string
	ServerPassword       string
	GatewayName          string
	Proxy                *ConfigProxy
}

// ConfigServer - A web server config
type ConfigServer struct {
	LocalAddr           string
	BindMode            os.FileMode
	Port                int
	TLS                 bool
	CertFile            string
	KeyFile             string
	LetsEncryptCacheDir string
}

type ConfigProxy struct {
	Type      string
	Hostname  string
	Port      int
	TLS       bool
	Username  string
	Interface string
}

// Config - Config options for the running app
type Config struct {
	gateway               *Gateway
	ConfigFile            string
	LogLevel              int
	Gateway               bool
	GatewayName           string
	GatewayWhitelist      []glob.Glob
	GatewayThrottle       int
	GatewayTimeout        int
	GatewayWebircPassword map[string]string
	Proxy                 ConfigServer
	Upstreams             []ConfigUpstream
	Servers               []ConfigServer
	ServerTransports      []string
	RemoteOrigins         []glob.Glob
	ReverseProxies        []net.IPNet
	Webroot               string
	ClientRealname        string
	ClientUsername        string
	ClientHostname        string
	Identd                bool
	RequiresVerification  bool
	SendQuitOnClientClose string
	ReCaptchaSecret       string
	ReCaptchaKey          string
	Secret                string
	Plugins               []string
}

func NewConfig(gateway *Gateway) *Config {
	return &Config{gateway: gateway}
}

// ConfigResolvePath - If relative, resolve a path to it's full absolute path relative to the config file
func (c *Config) ResolvePath(path string) string {
	// Absolute paths should stay as they are
	if path[0:1] == "/" {
		return path
	}

	resolved := filepath.Dir(c.ConfigFile)
	resolved = filepath.Clean(resolved + "/" + path)
	return resolved
}

func (c *Config) SetConfigFile(configFile string) {
	// Config paths starting with $ is executed rather than treated as a path
	if strings.HasPrefix(configFile, "$ ") {
		c.ConfigFile = configFile
	} else {
		c.ConfigFile, _ = filepath.Abs(configFile)
	}
}

// CurrentConfigFile - Return the full path or command for the config file in use
func (c *Config) CurrentConfigFile() string {
	return c.ConfigFile
}

func (c *Config) Load() error {
	var configSrc interface{}

	if strings.HasPrefix(c.ConfigFile, "$ ") {
		cmdRawOut, err := exec.Command("sh", "-c", c.ConfigFile[2:]).Output()
		if err != nil {
			return err
		}

		configSrc = cmdRawOut
	} else {
		configSrc = c.ConfigFile
	}

	cfg, err := ini.LoadSources(ini.LoadOptions{AllowBooleanKeys: true}, configSrc)
	if err != nil {
		return err
	}

	// Clear the existing config
	c.Gateway = false
	c.GatewayWebircPassword = make(map[string]string)
	c.Proxy = ConfigServer{}
	c.Upstreams = []ConfigUpstream{}
	c.Servers = []ConfigServer{}
	c.ServerTransports = []string{}
	c.RemoteOrigins = []glob.Glob{}
	c.GatewayWhitelist = []glob.Glob{}
	c.ReverseProxies = []net.IPNet{}
	c.Webroot = ""
	c.ReCaptchaSecret = ""
	c.ReCaptchaKey = ""
	c.RequiresVerification = false
	c.Secret = ""
	c.SendQuitOnClientClose = ""
	c.ClientRealname = ""
	c.ClientUsername = ""
	c.ClientHostname = ""

	for _, section := range cfg.Sections() {
		if strings.Index(section.Name(), "DEFAULT") == 0 {
			c.LogLevel = section.Key("logLevel").MustInt(3)
			if c.LogLevel < 1 || c.LogLevel > 3 {
				c.gateway.Log(3, "Config option logLevel must be between 1-3. Setting default value of 3.")
				c.LogLevel = 3
			}

			c.Identd = section.Key("identd").MustBool(false)

			c.GatewayName = section.Key("gateway_name").MustString("")
			if strings.Contains(c.GatewayName, " ") {
				c.gateway.Log(3, "Config option gateway_name must not contain spaces")
				c.GatewayName = ""
			}

			c.Secret = section.Key("secret").MustString("")
			c.SendQuitOnClientClose = section.Key("send_quit_on_client_close").MustString("")
		}

		if section.Name() == "verify" {
			captchaSecret := section.Key("recaptcha_secret").MustString("")
			captchaKey := section.Key("recaptcha_key").MustString("")
			if captchaSecret != "" && captchaKey != "" {
				c.RequiresVerification = true
				c.ReCaptchaSecret = captchaSecret
			}
		}

		if section.Name() == "gateway" {
			c.Gateway = section.Key("enabled").MustBool(false)
			c.GatewayTimeout = section.Key("timeout").MustInt(10)
			c.GatewayThrottle = section.Key("throttle").MustInt(2)
		}

		if section.Name() == "gateway.webirc" {
			for _, serverAddr := range section.KeyStrings() {
				c.GatewayWebircPassword[serverAddr] = section.Key(serverAddr).MustString("")
			}
		}

		if strings.Index(section.Name(), "clients") == 0 {
			c.ClientUsername = section.Key("username").MustString("")
			c.ClientRealname = section.Key("realname").MustString("")
			c.ClientHostname = section.Key("hostname").MustString("")
		}

		if strings.Index(section.Name(), "fileserving") == 0 {
			if section.Key("enabled").MustBool(false) {
				c.Webroot = section.Key("webroot").MustString("")
			}
		}

		if strings.Index(section.Name(), "server.") == 0 {
			server := ConfigServer{}
			server.LocalAddr = confKeyAsString(section.Key("bind"), "127.0.0.1")
			rawMode := confKeyAsString(section.Key("bind_mode"), "")
			mode, err := strconv.ParseInt(rawMode, 8, 32)
			if err != nil {
				mode = 0755
			}
			server.BindMode = os.FileMode(mode)
			server.Port = confKeyAsInt(section.Key("port"), 80)
			server.TLS = confKeyAsBool(section.Key("tls"), false)
			server.CertFile = confKeyAsString(section.Key("cert"), "")
			server.KeyFile = confKeyAsString(section.Key("key"), "")
			server.LetsEncryptCacheDir = confKeyAsString(section.Key("letsencrypt_cache"), "")

			if strings.HasSuffix(server.LetsEncryptCacheDir, ".cache") {
				return errors.New("Syntax has changed. Please update letsencrypt_cache to a directory path (eg ./cache)")
			}

			c.Servers = append(c.Servers, server)
		}

		if section.Name() == "proxy" {
			server := ConfigServer{}
			server.LocalAddr = confKeyAsString(section.Key("bind"), "0.0.0.0")
			server.Port = confKeyAsInt(section.Key("port"), 7999)
			c.Proxy = server
		}

		if strings.Index(section.Name(), "upstream.") == 0 {
			upstream := ConfigUpstream{}

			hostname := section.Key("hostname").MustString("127.0.0.1")
			if strings.HasPrefix(strings.ToLower(hostname), "unix:") {
				upstream.Network = "unix"
				upstream.Hostname = hostname[5:]
			} else {
				upstream.Network = "tcp"
				upstream.Hostname = hostname
				upstream.Port = section.Key("port").MustInt(6667)
				upstream.TLS = section.Key("tls").MustBool(false)
			}

			upstream.Timeout = section.Key("timeout").MustInt(10)
			upstream.Throttle = section.Key("throttle").MustInt(2)
			upstream.WebircPassword = section.Key("webirc").MustString("")
			upstream.ServerPassword = section.Key("serverpassword").MustString("")

			upstream.GatewayName = section.Key("gateway_name").MustString("")
			if strings.Contains(upstream.GatewayName, " ") {
				c.gateway.Log(3, "Config option gateway_name must not contain spaces")
				upstream.GatewayName = ""
			}

			upstream.NetworkCommonAddress = section.Key("network_common_address").MustString("")

			c.Upstreams = append(c.Upstreams, upstream)
		}

		// "engines" is now legacy naming
		if section.Name() == "engines" || section.Name() == "transports" {
			for _, transport := range section.KeyStrings() {
				c.ServerTransports = append(c.ServerTransports, strings.Trim(transport, "\n"))
			}
		}

		if strings.Index(section.Name(), "plugins") == 0 {
			for _, plugin := range section.KeyStrings() {
				c.Plugins = append(c.Plugins, strings.Trim(plugin, "\n"))
			}
		}

		if strings.Index(section.Name(), "allowed_origins") == 0 {
			for _, origin := range section.KeyStrings() {
				match, err := glob.Compile(origin)
				if err != nil {
					c.gateway.Log(3, "Config section allowed_origins has invalid match, "+origin)
					continue
				}
				c.RemoteOrigins = append(c.RemoteOrigins, match)
			}
		}

		if strings.Index(section.Name(), "gateway.whitelist") == 0 {
			for _, origin := range section.KeyStrings() {
				match, err := glob.Compile(origin)
				if err != nil {
					c.gateway.Log(3, "Config section gateway.whitelist has invalid match, "+origin)
					continue
				}
				c.GatewayWhitelist = append(c.GatewayWhitelist, match)
			}
		}

		if strings.Index(section.Name(), "reverse_proxies") == 0 {
			for _, cidrRange := range section.KeyStrings() {
				_, validRange, cidrErr := net.ParseCIDR(cidrRange)
				if cidrErr != nil {
					c.gateway.Log(3, "Config section reverse_proxies has invalid entry, "+cidrRange)
					continue
				}
				c.ReverseProxies = append(c.ReverseProxies, *validRange)
			}
		}
	}

	return nil
}

func confKeyAsString(key *ini.Key, def string) string {
	val := def

	str := key.String()
	if len(str) > 1 && str[:1] == "$" {
		val = os.Getenv(str[1:])
	} else {
		val = key.MustString(def)
	}

	return val
}

func confKeyAsInt(key *ini.Key, def int) int {
	val := def

	str := key.String()
	if len(str) > 1 && str[:1] == "$" {
		envVal := os.Getenv(str[1:])
		envValInt, err := strconv.Atoi(envVal)
		if err == nil {
			val = envValInt
		}
	} else {
		val = key.MustInt(def)
	}

	return val
}

func confKeyAsBool(key *ini.Key, def bool) bool {
	val := def

	str := key.String()
	if len(str) > 1 && str[:1] == "$" {
		envVal := os.Getenv(str[1:])
		if envVal == "0" || envVal == "false" || envVal == "no" {
			val = false
		} else {
			val = true
		}
	} else {
		val = key.MustBool(def)
	}

	return val
}

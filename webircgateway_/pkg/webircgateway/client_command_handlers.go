package webircgateway

import (
	"errors"
	"strconv"
	"strings"
	"time"

	jwt "github.com/dgrijalva/jwt-go"
	"github.com/kiwiirc/webircgateway/pkg/irc"
	"github.com/kiwiirc/webircgateway/pkg/recaptcha"
	"golang.org/x/net/html/charset"
)

/*
 * ProcessLineFromUpstream
 * Processes and makes any changes to a line of data sent from an upstream
 */
func (c *Client) ProcessLineFromUpstream(data string) string {
	client := c

	m, parseErr := irc.ParseLine(data)
	if parseErr != nil {
		return data
	}

	pLen := len(m.Params)

	if pLen > 0 && m.Command == "NICK" && m.Prefix.Nick == c.IrcState.Nick {
		client.IrcState.Nick = m.Params[0]
	}
	if pLen > 0 && m.Command == "001" {
		client.IrcState.Nick = m.Params[0]
		client.State = ClientStateConnected
	}
	if pLen > 0 && m.Command == "005" {
		// If EXTJWT is supported by the IRC server, disable it here
		foundExtJwt := false
		for _, param := range m.Params {
			if strings.HasPrefix(param, "EXTJWT") {
				c.Log(1, "Upstream already supports EXTJWT, disabling feature")
				foundExtJwt = true
			}
		}

		if foundExtJwt {
			c.Features.ExtJwt = false
		}
	}
	if pLen > 0 && m.Command == "JOIN" && m.Prefix.Nick == c.IrcState.Nick {
		channel := irc.NewStateChannel(m.GetParam(0, ""))
		c.IrcState.SetChannel(channel)
	}
	if pLen > 0 && m.Command == "PART" && m.Prefix.Nick == c.IrcState.Nick {
		c.IrcState.RemoveChannel(m.GetParam(0, ""))
	}
	if pLen > 0 && m.Command == "QUIT" && m.Prefix.Nick == c.IrcState.Nick {
		c.IrcState.ClearChannels()
	}
	// :server.com 900 m m!m@irc-3jg.1ab.j4ep8h.IP prawnsalad :You are now logged in as prawnsalad
	if pLen > 0 && m.Command == "900" {
		c.IrcState.Account = m.GetParam(2, "")
	}
	// :server.com 901 itsonlybinary itsonlybinary!itsonlybina@user/itsonlybinary :You are now logged out
	if m.Command == "901" {
		c.IrcState.Account = ""
	}
	// :prawnsalad!prawn@kiwiirc/prawnsalad MODE #kiwiirc-dev +oo notprawn kiwi-n75
	if pLen > 0 && m.Command == "MODE" {
		if strings.HasPrefix(m.GetParam(0, ""), "#") {
			channelName := m.GetParam(0, "")
			modes := m.GetParam(1, "")

			channel := c.IrcState.GetChannel(channelName)
			if channel != nil {
				channel = irc.NewStateChannel(channelName)
				c.IrcState.SetChannel(channel)
			}

			adding := false
			paramIdx := 1
			for i := 0; i < len(modes); i++ {
				mode := string(modes[i])

				if mode == "+" {
					adding = true
				} else if mode == "-" {
					adding = false
				} else {
					paramIdx++
					param := m.GetParam(paramIdx, "")
					if strings.ToLower(param) == strings.ToLower(c.IrcState.Nick) {
						if adding {
							channel.Modes[mode] = ""
						} else {
							delete(channel.Modes, mode)
						}
					}
				}
			}
		}
	}

	// If upstream reports that it supports message-tags natively, disable the wrapping of this feature for
	// this client
	if pLen >= 3 &&
		strings.ToUpper(m.Command) == "CAP" &&
		m.GetParamU(1, "") == "LS" {
		// The CAPs could be param 2 or 3 depending on if were using multiple lines to list them all.
		caps := ""
		if pLen >= 4 && m.Params[2] == "*" {
			caps = m.GetParamU(3, "")
		} else {
			caps = m.GetParamU(2, "")
		}

		if containsOneOf(caps, []string{"DRAFT/MESSAGE-TAGS-0.2", "MESSAGE-TAGS"}) {
			c.Log(1, "Upstream already supports Messagetags, disabling feature")
			c.Features.Messagetags = false
		}

		// Inject message-tags cap into the last line of IRCd capabilities
		if c.Features.Messagetags && m.Params[2] != "*" {
			m.Params[2] += " message-tags"
			data = m.ToLine()
		}
	}

	// If we requested message-tags, make sure to include it in the ACK when
	// the IRCd sends the ACK through
	if m != nil &&
		client.RequestedMessageTagsCap != "" &&
		strings.ToUpper(m.Command) == "CAP" &&
		m.GetParamU(1, "") == "ACK" &&
		!strings.Contains(m.GetParamU(2, ""), "MESSAGE-TAGS") {

		m.Params[2] += " " + client.RequestedMessageTagsCap
		data = m.ToLine()

		client.RequestedMessageTagsCap = ""
	}

	if m != nil && client.Features.Messagetags && c.Gateway.messageTags.CanMessageContainClientTags(m) {
		// If we have any message tags stored for this message from a previous PRIVMSG sent
		// by a client, add them back in
		mTags, mTagsExists := c.Gateway.messageTags.GetTagsFromMessage(client, m.Prefix.Nick, m)
		if mTagsExists {
			for k, v := range mTags.Tags {
				m.Tags[k] = v
			}

			data = m.ToLine()
		}
	}

	return data
}

/*
 * ProcessLineFromClient
 * Processes and makes any changes to a line of data sent from a client
 */
func (c *Client) ProcessLineFromClient(line string) (string, error) {
	message, err := irc.ParseLine(line)
	// Just pass any random data upstream
	if err != nil {
		return line, nil
	}

	maybeConnectUpstream := func() {
		if !c.UpstreamStarted && c.IrcState.Username != "" && c.Verified {
			go c.connectUpstream()
		}
	}

	if !c.Verified && strings.ToUpper(message.Command) == "CAPTCHA" {
		verified := false
		if len(message.Params) >= 1 {
			captcha := recaptcha.R{
				Secret: c.Gateway.Config.ReCaptchaSecret,
			}

			verified = captcha.VerifyResponse(message.Params[0])
		}

		if !verified {
			c.SendIrcError("Invalid captcha")
			c.StartShutdown("unverifed")
		} else {
			c.Verified = true
			maybeConnectUpstream()
		}

		return "", nil
	}

	// NICK <nickname>
	if strings.ToUpper(message.Command) == "NICK" && !c.UpstreamStarted {
		if len(message.Params) > 0 {
			c.IrcState.Nick = message.Params[0]
		}
	}

	// USER <username> <hostname> <servername> <realname>
	if strings.ToUpper(message.Command) == "USER" && !c.UpstreamStarted {
		if len(message.Params) < 4 {
			return line, errors.New("Invalid USER line")
		}

		if c.Gateway.Config.ClientUsername != "" {
			message.Params[0] = makeClientReplacements(c.Gateway.Config.ClientUsername, c)
		}
		if c.Gateway.Config.ClientRealname != "" {
			message.Params[3] = makeClientReplacements(c.Gateway.Config.ClientRealname, c)
		}

		line = message.ToLine()

		c.IrcState.Username = message.Params[0]
		c.IrcState.RealName = message.Params[3]

		maybeConnectUpstream()
	}

	if strings.ToUpper(message.Command) == "ENCODING" {
		if len(message.Params) > 0 {
			encoding, _ := charset.Lookup(message.Params[0])
			if encoding == nil {
				c.Log(1, "Requested unknown encoding, %s", message.Params[0])
			} else {
				c.Encoding = message.Params[0]
				c.Log(1, "Set encoding to %s", message.Params[0])
			}
		}

		// Don't send the ENCODING command upstream
		return "", nil
	}

	if strings.ToUpper(message.Command) == "HOST" && !c.UpstreamStarted {
		// HOST irc.network.net:6667
		// HOST irc.network.net:+6667

		if !c.Gateway.Config.Gateway {
			return "", nil
		}

		if len(message.Params) == 0 {
			return "", nil
		}

		addr := message.Params[0]
		if addr == "" {
			c.SendIrcError("Missing host")
			c.StartShutdown("missing_host")
			return "", nil
		}

		// Parse host:+port into the c.dest* vars
		portSep := strings.Index(addr, ":")
		if portSep == -1 {
			c.DestHost = addr
			c.DestPort = 6667
			c.DestTLS = false
		} else {
			c.DestHost = addr[0:portSep]
			portParam := addr[portSep+1:]
			if len(portParam) > 0 && portParam[0:1] == "+" {
				c.DestTLS = true
				c.DestPort, err = strconv.Atoi(portParam[1:])
				if err != nil {
					c.DestPort = 6697
				}
			} else {
				c.DestPort, err = strconv.Atoi(portParam[0:])
				if err != nil {
					c.DestPort = 6667
				}
			}
		}

		// Don't send the HOST command upstream
		return "", nil
	}

	// If the client supports CAP, assume the client also supports parsing MessageTags
	// When upstream replies with its CAP listing, we check if message-tags is supported by the IRCd already and if so,
	// we disable this feature flag again to use the IRCds native support.
	if strings.ToUpper(message.Command) == "CAP" && len(message.Params) > 0 && strings.ToUpper(message.Params[0]) == "LS" {
		c.Log(1, "Enabling client Messagetags feature")
		c.Features.Messagetags = true
	}

	// If we are wrapping the Messagetags feature, make sure the clients REQ message-tags doesn't
	// get sent upstream
	if c.Features.Messagetags && strings.ToUpper(message.Command) == "CAP" && message.GetParamU(0, "") == "REQ" {
		reqCaps := strings.ToLower(message.GetParam(1, ""))
		capsThatEnableMessageTags := []string{"message-tags", "account-tag", "server-time", "batch"}

		if strings.Contains(reqCaps, "message-tags") {
			// Rebuild the list of requested caps, without message-tags
			caps := strings.Split(reqCaps, " ")
			newCaps := []string{}
			for _, cap := range caps {
				if !strings.Contains(strings.ToLower(cap), "message-tags") {
					newCaps = append(newCaps, cap)
				} else {
					c.RequestedMessageTagsCap = cap
				}
			}

			message.Params[1] = strings.Join(newCaps, " ")
			line = message.ToLine()
		} else if !containsOneOf(reqCaps, capsThatEnableMessageTags) {
			// Didn't request anything that needs message-tags cap so disable it
			c.Features.Messagetags = false
		}
	}

	if c.Features.Messagetags && message.Command == "TAGMSG" {
		if len(message.Params) == 0 {
			return "", nil
		}

		// We can't be 100% sure what this users correct mask is, so just send the nick
		message.Prefix.Nick = c.IrcState.Nick
		message.Prefix.Hostname = ""
		message.Prefix.Username = ""

		thisHost := strings.ToLower(c.UpstreamConfig.Hostname)
		target := message.Params[0]
		for val := range c.Gateway.Clients.Iter() {
			curClient := val.Val.(*Client)
			sameHost := strings.ToLower(curClient.UpstreamConfig.Hostname) == thisHost
			if !sameHost {
				continue
			}

			// Only send the message on to either the target nick, or the clients in a set channel
			curNick := strings.ToLower(curClient.IrcState.Nick)
			if target != curNick && !curClient.IrcState.HasChannel(target) {
				continue
			}

			curClient.SendClientSignal("data", message.ToLine())
		}

		return "", nil
	}

	// Check for any client message tags so that we can store them for replaying to other clients
	if c.Features.Messagetags && c.Gateway.messageTags.CanMessageContainClientTags(message) {
		c.Gateway.messageTags.AddTagsFromMessage(c, c.IrcState.Nick, message)
		// Prevent any client tags heading upstream
		for k := range message.Tags {
			if len(k) > 0 && k[0] == '+' {
				delete(message.Tags, k)
			}
		}

		line = message.ToLine()
	}

	if c.Features.ExtJwt && strings.ToUpper(message.Command) == "EXTJWT" {
		tokenFor := message.GetParam(0, "")

		tokenM := irc.Message{}
		tokenM.Command = "EXTJWT"
		tokenData := jwt.MapClaims{
			"exp":         time.Now().UTC().Add(1 * time.Minute).Unix(),
			"iss":         c.UpstreamConfig.Hostname,
			"nick":        c.IrcState.Nick,
			"account":     c.IrcState.Account,
			"net_modes":   []string{},
			"channel":     "",
			"joined":      false,
			"time_joined": 0,
			"modes":       []string{},
		}

		// Use the NetworkCommonAddress if a plugin as assigned one.
		// This allows plugins to associate different upstream hosts to the same network
		if c.UpstreamConfig.NetworkCommonAddress != "" {
			tokenData["iss"] = c.UpstreamConfig.NetworkCommonAddress
		}

		if tokenFor == "" {
			tokenM.Params = append(tokenM.Params, "*")
		} else {
			tokenM.Params = append(tokenM.Params, tokenFor)

			tokenForChan := c.IrcState.GetChannel(tokenFor)
			if tokenForChan != nil {
				tokenData["time_joined"] = tokenForChan.Joined.Unix()
				tokenData["channel"] = tokenForChan.Name
				tokenData["joined"] = true

				modes := []string{}
				for mode := range tokenForChan.Modes {
					modes = append(modes, mode)
				}
				tokenData["modes"] = modes
			} else {
				tokenData["channel"] = tokenFor
			}
		}

		token := jwt.NewWithClaims(jwt.SigningMethodHS256, tokenData)
		tokenSigned, tokenSignedErr := token.SignedString([]byte(c.Gateway.Config.Secret))
		if tokenSignedErr != nil {
			c.Log(3, "Error creating JWT token. %s", tokenSignedErr.Error())
			println(tokenSignedErr.Error())
		}

		tokenM.Params = append(tokenM.Params, tokenSigned)

		c.SendClientSignal("data", tokenM.ToLine())

		return "", nil
	}

	return line, nil
}

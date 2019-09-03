package irc

import (
	"errors"
	"strings"
)

type Mask struct {
	Nick     string
	Username string
	Hostname string
	Mask     string
}
type Message struct {
	Raw     string
	Tags    map[string]string
	Prefix  *Mask
	Command string
	Params  []string
}

func NewMessage() *Message {
	return &Message{
		Tags:   make(map[string]string),
		Prefix: &Mask{},
	}
}

// GetParam - Get a param value, returning a default value if it doesn't exist
func (m *Message) GetParam(idx int, def string) string {
	if idx < 0 || idx > len(m.Params)-1 {
		return def
	}

	return m.Params[idx]
}

// GetParamU - Get a param value in uppercase, returning a default value if it doesn't exist
func (m *Message) GetParamU(idx int, def string) string {
	return strings.ToUpper(m.GetParam(idx, def))
}

// ToLine - Convert the Message struct to its raw IRC line
func (m *Message) ToLine() string {
	line := ""

	if len(m.Tags) > 0 {
		line += "@"

		for tagName, tagVal := range m.Tags {
			line += tagName
			if tagVal != "" {
				line += "=" + tagVal
			}
			line += ";"
		}
	}

	if m.Prefix != nil && (m.Prefix.Nick != "" || m.Prefix.Username != "" || m.Prefix.Hostname != "") {
		prefix := ""

		if m.Prefix.Nick != "" {
			prefix += m.Prefix.Nick
		}

		if m.Prefix.Username != "" && m.Prefix.Nick != "" {
			prefix += "!" + m.Prefix.Username
		} else if m.Prefix.Username != "" {
			prefix += m.Prefix.Username
		}

		if m.Prefix.Hostname != "" && prefix != "" {
			prefix += "@" + m.Prefix.Username
		} else if m.Prefix.Hostname != "" {
			prefix += m.Prefix.Hostname
		}

		if line != "" {
			line += " :" + prefix
		} else {
			line += ":" + prefix
		}
	}

	if line != "" {
		line += " " + m.Command
	} else {
		line += m.Command
	}

	paramLen := len(m.Params)
	for idx, param := range m.Params {
		if idx == paramLen-1 && (strings.Contains(param, " ") || strings.HasPrefix(param, ":")) {
			line += " :" + param
		} else {
			line += " " + param
		}
	}

	return line
}

func createMask(maskStr string) *Mask {
	mask := &Mask{
		Mask: maskStr,
	}

	usernameStart := strings.Index(maskStr, "!")
	hostStart := strings.Index(maskStr, "@")

	if usernameStart == -1 && hostStart == -1 {
		mask.Nick = maskStr
	} else if usernameStart > -1 && hostStart > -1 {
		mask.Nick = maskStr[0:usernameStart]
		mask.Username = maskStr[usernameStart+1 : hostStart]
		mask.Hostname = maskStr[hostStart+1:]
	} else if usernameStart > -1 && hostStart == -1 {
		mask.Nick = maskStr[0:usernameStart]
		mask.Username = maskStr[usernameStart+1:]
	} else if usernameStart == -1 && hostStart > -1 {
		mask.Username = maskStr[0:hostStart]
		mask.Hostname = maskStr[hostStart+1:]
	}

	return mask
}

// ParseLine - Turn a raw IRC line into a message
func ParseLine(input string) (*Message, error) {
	line := strings.Trim(input, "\r\n")

	message := NewMessage()
	message.Raw = line

	token := ""
	rest := ""

	token, rest = nextToken(line, false)
	if token == "" {
		return message, errors.New("Empty line")
	}

	// Tags. Starts with "@"
	if token[0] == 64 {
		tagsRaw := token[1:]
		tags := strings.Split(tagsRaw, ";")
		for _, tag := range tags {
			parts := strings.Split(tag, "=")
			if len(parts) > 0 && parts[0] == "" {
				continue
			}

			if len(parts) == 1 {
				message.Tags[parts[0]] = ""
			} else {
				message.Tags[parts[0]] = parts[1]
			}
		}

		token, rest = nextToken(rest, false)
	}

	// Prefix. Starts with ":"
	if token != "" && token[0] == 58 {
		message.Prefix = createMask(token[1:])
		token, rest = nextToken(rest, false)
	} else {
		message.Prefix = createMask("")
	}

	// Command
	if token == "" {
		return message, errors.New("Missing command")
	}

	message.Command = token

	// Params
	for {
		token, rest = nextToken(rest, true)
		if token == "" {
			break
		}

		message.Params = append(message.Params, token)
	}

	return message, nil
}

func nextToken(s string, allowTrailing bool) (string, string) {
	s = strings.TrimLeft(s, " ")

	if len(s) == 0 {
		return "", ""
	}

	// The last token (trailing) start with :
	if allowTrailing && s[0] == 58 {
		return s[1:], ""
	}

	token := ""
	spaceIdx := strings.Index(s, " ")
	if spaceIdx > -1 {
		token = s[:spaceIdx]
		s = s[spaceIdx+1:]
	} else {
		token = s
		s = ""
	}

	return token, s
}

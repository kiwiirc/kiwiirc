package webircgateway

import "github.com/kiwiirc/webircgateway/pkg/irc"

var hooksRegistered map[string][]interface{}

func init() {
	hooksRegistered = make(map[string][]interface{})
}

func HookRegister(hookName string, p interface{}) {
	_, exists := hooksRegistered[hookName]
	if !exists {
		hooksRegistered[hookName] = make([]interface{}, 0)
	}

	hooksRegistered[hookName] = append(hooksRegistered[hookName], p)
}

type Hook struct {
	ID   string
	Halt bool
}

func (h *Hook) getCallbacks(eventType string) []interface{} {
	var f []interface{}
	f = make([]interface{}, 0)

	callbacks, exists := hooksRegistered[eventType]
	if exists {
		f = callbacks
	}

	return f
}

/**
 * HookIrcConnectionPre
 * Dispatched just before an IRC connection is attempted
 * Types: irc.connection.pre
 */
type HookIrcConnectionPre struct {
	Hook
	Client         *Client
	UpstreamConfig *ConfigUpstream
}

func (h *HookIrcConnectionPre) Dispatch(eventType string) {
	for _, p := range h.getCallbacks(eventType) {
		if f, ok := p.(func(*HookIrcConnectionPre)); ok {
			f(h)
		}
	}
}

/**
 * HookIrcLine
 * Dispatched when either:
 *   * A line arrives from the IRCd, before sending to the client
 *   * A line arrives from the client, before sending to the IRCd
 * Types: irc.line
 */
type HookIrcLine struct {
	Hook
	Client         *Client
	UpstreamConfig *ConfigUpstream
	Line           string
	Message        *irc.Message
	ToServer       bool
}

func (h *HookIrcLine) Dispatch(eventType string) {
	for _, p := range h.getCallbacks(eventType) {
		if f, ok := p.(func(*HookIrcLine)); ok {
			f(h)
		}
	}
}

/**
 * HookClientState
 * Dispatched after a client connects or disconnects
 * Types: client.state
 */
type HookClientState struct {
	Hook
	Client    *Client
	Connected bool
}

func (h *HookClientState) Dispatch(eventType string) {
	for _, p := range h.getCallbacks(eventType) {
		if f, ok := p.(func(*HookClientState)); ok {
			f(h)
		}
	}
}

/**
 * HookStatus
 * Dispatched for each line output of the _status HTTP request
 * Types: status.client
 */
type HookStatus struct {
	Hook
	Client *Client
	Line   string
}

func (h *HookStatus) Dispatch(eventType string) {
	for _, p := range h.getCallbacks(eventType) {
		if f, ok := p.(func(*HookStatus)); ok {
			f(h)
		}
	}
}

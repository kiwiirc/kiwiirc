package irc

import (
	"strings"
	"sync"
	"time"
)

type State struct {
	LocalPort    int
	RemotePort   int
	Username     string
	Nick         string
	RealName     string
	Password     string
	Account      string
	channelMutex sync.Mutex
	Channels     map[string]*StateChannel
}

func NewState() *State {
	return &State{
		Channels: make(map[string]*StateChannel),
	}
}

func (m *State) HasChannel(name string) (ok bool) {
	m.channelMutex.Lock()
	_, ok = m.Channels[strings.ToLower(name)]
	m.channelMutex.Unlock()
	return
}

func (m *State) GetChannel(name string) (channel *StateChannel) {
	m.channelMutex.Lock()
	channel, _ = m.Channels[strings.ToLower(name)]
	m.channelMutex.Unlock()
	return
}

func (m *State) SetChannel(channel *StateChannel) {
	m.channelMutex.Lock()
	m.Channels[strings.ToLower(channel.Name)] = channel
	m.channelMutex.Unlock()
}

func (m *State) RemoveChannel(name string) {
	m.channelMutex.Lock()
	delete(m.Channels, strings.ToLower(name))
	m.channelMutex.Unlock()
}

func (m *State) ClearChannels() {
	m.channelMutex.Lock()
	for i := range m.Channels {
		delete(m.Channels, i)
	}
	m.channelMutex.Unlock()
}

type StateChannel struct {
	Name   string
	Modes  map[string]string
	Joined time.Time
}

func NewStateChannel(name string) *StateChannel {
	return &StateChannel{
		Name:   name,
		Modes:  make(map[string]string),
		Joined: time.Now(),
	}
}

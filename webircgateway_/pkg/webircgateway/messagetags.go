package webircgateway

import (
	"strings"
	"sync"
	"time"

	"github.com/OneOfOne/xxhash"
	"github.com/kiwiirc/webircgateway/pkg/irc"
)

type MessageTagManager struct {
	Mutex     sync.Mutex
	knownTags map[uint64]MessageTags
	gcTimes   map[uint64]time.Time
}
type MessageTags struct {
	Tags map[string]string
}

func NewMessageTagManager() *MessageTagManager {
	tm := &MessageTagManager{
		knownTags: make(map[uint64]MessageTags),
		gcTimes:   make(map[uint64]time.Time),
	}

	go tm.RunGarbageCollectionLoop()
	return tm
}

func (tags *MessageTagManager) CanMessageContainClientTags(msg *irc.Message) bool {
	return containsOneOf(msg.Command, []string{
		"PRIVMSG",
		"NOTICE",
		"TAGMSG",
	})
}

func (tags *MessageTagManager) RunGarbageCollectionLoop() {
	for {
		tags.Mutex.Lock()
		for messageHash, timeCreated := range tags.gcTimes {
			if timeCreated.Add(time.Second * 30).After(time.Now()) {
				delete(tags.knownTags, messageHash)
			}

		}
		tags.Mutex.Unlock()

		time.Sleep(time.Second * 30)
	}
}

func (tags *MessageTagManager) AddTagsFromMessage(client *Client, fromNick string, msg *irc.Message) {
	if !tags.CanMessageContainClientTags(msg) {
		return
	}

	clientTags := MessageTags{
		Tags: make(map[string]string),
	}
	for tagName, tagVal := range msg.Tags {
		if len(tagName) > 0 && tagName[0] == '+' {
			clientTags.Tags[tagName] = tagVal
		}
	}

	if len(clientTags.Tags) > 0 {
		tags.Mutex.Lock()
		msgHash := tags.messageHash(client, fromNick, msg)
		tags.knownTags[msgHash] = clientTags
		tags.gcTimes[msgHash] = time.Now()
		tags.Mutex.Unlock()
	}
}

func (tags *MessageTagManager) GetTagsFromMessage(client *Client, fromNick string, msg *irc.Message) (MessageTags, bool) {
	if !tags.CanMessageContainClientTags(msg) {
		return MessageTags{}, false
	}

	msgHash := tags.messageHash(client, fromNick, msg)

	tags.Mutex.Lock()
	defer tags.Mutex.Unlock()

	clientTags, tagsExist := tags.knownTags[msgHash]
	if !tagsExist {
		return clientTags, false
	}

	return clientTags, true
}

func (tags *MessageTagManager) messageHash(client *Client, fromNick string, msg *irc.Message) uint64 {
	h := xxhash.New64()
	h.WriteString(strings.ToLower(client.UpstreamConfig.Hostname))
	h.WriteString(strings.ToLower(fromNick))
	// make target case insensitive
	h.WriteString(strings.ToLower(msg.GetParam(0, "")))
	h.WriteString(msg.GetParam(1, ""))
	return h.Sum64()
}

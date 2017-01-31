<template>
    <div class="kiwi-settings-aliases">
        <form class="u-form">
            <a class="u-link kiwi-settings-aliases-showhelp" @click="show_help=!show_help">What are aliases?</a>
            <div v-if="show_help" class="kiwi-settings-aliases-help">
                <p>Aliases let you rename existing IRC commands or even build entirely new ones.</p>
                <p>They must be one per line and in the form of <em>/name /what it should do</em>.</p>

                <h4>Variables</h4>
                <p>
                    There are several variables that may be used to refer to the current environment, such
                    as the active channel or active nick.
                    <ul>
                        <li><em>$server</em> The current network name</li>
                        <li><em>$channel</em> The current channel / buffer name</li>
                        <li><em>$server</em> The current channel / buffer name</li>
                    </ul>
                </p>
                <p>
                    You can also use variables to read input from the typed command. <br />
                    <ul>
                        <li><em>$0</em> All of the typed input</li>
                        <li><em>$1</em> The first word from the typed input</li>
                        <li><em>$2</em> The second word from the typed input</li>
                        <li><em>$1+</em> From the first word to the end of the typed input</li>
                    </ul>
                    <b>Example 1:</b> <em>/greet /msg $1 Hello, $1!</em><br />
                    This creates an IRC command /greet that accepts one argument. Typing "/greet username"
                    will execute "/msg username Hello, username!". <br />
                    <b>Example 2:</b> <em>/ban /quote mode $channel +b $1+</em><br />
                    This creates an IRC command /ban that does a few things. Typing "/ban nick1 nick2"
                    will execute "/quote mode #activechannel +b nick1 nick2". $channel is replaced with the
                    active channel name, $1+ is replaced with all the typed input from the first word to the end.
                </p>

                <h4>Helper commands</h4>
                <p>
                    <ul>
                        <li><em>/echo</em><br />Sends a message to the active buffer without sending it to the IRC network. Eg, /echo Something happened</li>
                        <li>
                            <em>/lines</em><br />
                            Similar to Mirc script, this lets you execute multiples lines of commands separated by a pipe, "|".<br />
                            Example: "/lines /ban nick1 | /echo Banned user" would first execute the /ban command, and then the /echo command. This comes in handy with creating short aliases such as the common "/cycle" command that parts and re-joins the active channel: "/cycle /lines /part $channel | /join $channel".
                        </li>
                    </ul>

                </p>
            </div>
            <textarea class="kiwi-settings-aliases-input" v-model="aliasText"></textarea>
        </form>
    </div>
</template>

<script>

import _ from 'lodash';
import state from 'src/libs/state';

export default {
    data: function data() {
        return {
            aliases: state.user_settings.aliases,
            show_help: false,
        };
    },
    props: [],
    computed: {
        aliasText: {
            get: function getAliasText() {
                let text = '';
                _.each(this.aliases, (actions, command) => {
                    text += `${command} ${actions}\n`;
                });
                return text;
            },
            set: function setAliasText(newVal) {
                // Clear out the current aliases before adding new ones in
                _.each(this.aliases, (actions, command) => {
                    this.$delete(this.aliases, 'command');
                });

                newVal.split('\n').forEach(line => {
                    if (line[0] !== '/') {
                        return;
                    }

                    let spaceSep = line.indexOf(' ');
                    if (spaceSep === -1) {
                        return;
                    }

                    let command = line.substring(0, spaceSep);
                    let actions = line.substring(spaceSep + 1).trim();
                    if (!actions) {
                        return;
                    }

                    this.$set(this.aliases, command.toLowerCase(), actions);
                });
            },
        },
    },
};
</script>

<style>

.kiwi-settings-aliases-input {
    width: 80%;
    height: 200px;
    font-size: 0.8em;
    line-height: 1.4em;
    font-family: monospace;
    white-space: nowrap;
    border-color: #cccccc;
}
.kiwi-settings-aliases-showhelp {
    display: block;
}
.kiwi-settings-aliases-help {
    background: #f3f2f2;
    border: 1px dashed gray;
    padding: 1em;
    margin: 1em 0;
}
.kiwi-settings-aliases-help em {
    color: #ab1010;
    background: #fff6a5;
    padding: 1px 2px;
}

</style>

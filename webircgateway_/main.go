package main

import (
	"flag"
	"fmt"
	"log"
	"os"
	"os/signal"
	"plugin"
	"sync"
	"syscall"

	"github.com/kiwiirc/webircgateway/pkg/webircgateway"
)

var VERSION = "1.0.1"
var GITCOMMIT = "-"
var BUILTWITHGO = "-"

func init() {
	webircgateway.Version = VERSION
}

func main() {
	printVersion := flag.Bool("version", false, "Print the version")
	configFile := flag.String("config", "config.conf", "Config file location")
	startSection := flag.String("run", "gateway", "What type of server to run")
	flag.Parse()

	if *printVersion {
		fmt.Printf("Version: %s\n", webircgateway.Version)
		fmt.Printf("Git commit: %s\n", GITCOMMIT)
		fmt.Printf("Built with Go version: %s\n", BUILTWITHGO)
		os.Exit(0)
	}

	if *startSection != "gateway" && *startSection != "proxy" {
		fmt.Println("-run can either be 'gateway' or 'proxy'")
		os.Exit(1)
	}

	runGateway(*configFile, *startSection)
}

func runGateway(configFile string, function string) {
	gateway := webircgateway.NewGateway(function)

	log.SetFlags(log.Flags() | log.Lmicroseconds)

	// Print any webircgateway logout to STDOUT
	go printLogOutput(gateway)

	// Listen for process signals
	go watchForSignals(gateway)

	gateway.Config.SetConfigFile(configFile)
	log.Printf("Using config %s", gateway.Config.CurrentConfigFile())

	configErr := gateway.Config.Load()
	if configErr != nil {
		log.Printf("Config file error: %s", configErr.Error())
		os.Exit(1)
	}

	pluginsQuit := &sync.WaitGroup{}
	loadPlugins(gateway, pluginsQuit)

	gateway.Start()

	pluginsQuit.Wait()
	gateway.WaitClose()
}

func watchForSignals(gateway *webircgateway.Gateway) {
	c := make(chan os.Signal, 1)
	signal.Notify(c, syscall.SIGHUP, syscall.SIGINT)

	for {
		switch sig := <-c; sig {
		case syscall.SIGINT:
			fmt.Println("Received SIGINT, shutting down webircgateway")
			gateway.Close()
		case syscall.SIGHUP:
			fmt.Println("Recieved SIGHUP, reloading config file")
			gateway.Config.Load()
		}
	}
}

func printLogOutput(gateway *webircgateway.Gateway) {
	for {
		line, _ := <-gateway.LogOutput
		log.Println(line)
	}
}

func loadPlugins(gateway *webircgateway.Gateway, pluginsQuit *sync.WaitGroup) {
	for _, pluginPath := range gateway.Config.Plugins {
		pluginFullPath := gateway.Config.ResolvePath(pluginPath)

		gateway.Log(2, "Loading plugin "+pluginFullPath)
		p, err := plugin.Open(pluginFullPath)
		if err != nil {
			gateway.Log(3, "Error loading plugin: "+err.Error())
			continue
		}

		startSymbol, err := p.Lookup("Start")
		if err != nil {
			gateway.Log(3, "Plugin does not export a Start function! (%s)", pluginFullPath)
			continue
		}

		startFunc := startSymbol.(func(*webircgateway.Gateway, *sync.WaitGroup))
		pluginsQuit.Add(1)
		startFunc(gateway, pluginsQuit)
	}
}

GOCMD=go
PLUGINS=plugins/
OUTFILE=webircgateway
OUTFILE_UNIX=$(OUTFILE)_unix
OUTFILE_DARWIN=$(OUTFILE)_darwin
OUTFILE_WINDOWS=$(OUTFILE)_windows.exe
OUTFILE_ARM64=$(OUTFILE)_arm64

GO_VERSION=$(word 3, $(shell go version))
GIT_COMMIT=$(shell git rev-list -1 HEAD)

LDFLAGS=-ldflags "-X main.GITCOMMIT=$(GIT_COMMIT) -X main.BUILTWITHGO=$(GO_VERSION)"

build-all: build build-plugins

build:
	$(GOCMD) build ${LDFLAGS} -o $(OUTFILE) -v main.go

build-crosscompile:
	GOOS=linux GOARCH=amd64 $(GOCMD) build ${LDFLAGS} -o $(OUTFILE_UNIX) -v main.go
	GOOS=darwin GOARCH=amd64 $(GOCMD) build ${LDFLAGS} -o $(OUTFILE_DARWIN) -v main.go
	GOOS=windows GOARCH=amd64 $(GOCMD) build ${LDFLAGS} -o $(OUTFILE_WINDOWS) -v main.go
	GOOS=linux GOARCH=arm64 $(GOCMD) build ${LDFLAGS} -o $(OUTFILE_ARM64) -v main.go

build-plugins:
	@for plugin in $(wildcard plugins/*.go); do \
		echo Building $$plugin...; \
		$(GOCMD) build -buildmode=plugin -v -o $$plugin.so $$plugin; \
	done

run:
	$(GOCMD) run main.go

run-proxy:
	$(GOCMD) run main.go -run=proxy

{
  nixConfig.bash-prompt = "[nix-develop:]";

  description = "🥝 Next generation of the Kiwi IRC web client";

  inputs.nixpkgs.url = "github:NixOS/nixpkgs?ref=nixos-21.05";
  inputs.webircgateway = {
    url = "github:kiwiirc/webircgateway";
    flake = false;
  };
  inputs.kiwiirc-desktop = {
    url = "github:kiwiirc/kiwiirc-desktop";
    flake = false;
  };

  outputs = { self, nixpkgs, webircgateway, kiwiirc-desktop }:
    let
      # System types to support.
      supportedSystems =
        [ "x86_64-linux" "x86_64-darwin" "aarch64-linux" "aarch64-darwin" ];

      # Helper function to generate an attrset '{ x86_64-linux = f "x86_64-linux"; ... }'.
      forAllSystems = f:
        nixpkgs.lib.genAttrs supportedSystems (system: f system);

      # Nixpkgs instantiated for supported system types.
      nixpkgsFor = forAllSystems (system:
        import nixpkgs {
          inherit system;
          overlays = [ self.overlay ];
        });
    in {
      overlay = final: prev:
        with final; {
          kiwiirc = mkYarnPackage rec {
            src = ./.;
            pname = "kiwiirc";
            distPhase = "true";
            buildPhase = ''
              yarn --offline run build
            '';
            preInstall = ''
              mkdir -p $out/www/${pname}
              cp -r ./deps/${pname}/dist/* $out/www
              cp -r $src/LICENSE $out/www
            '';
            fixupPhase = ''
              rm -rf $out/tarballs $out/libexec $out/bin
              rm -rf $out/www/kiwiirc
            '';
          };
          kiwiirc-desktop = let executableName = "kiwiirc-desktop";
          in mkYarnPackage rec {
            name = "kiwiirc-desktop";
            src = kiwiirc-desktop;
            patches = ((writeText "remove-dev-mode.patch" ''
              diff --git a/src/index.js b/src/index.js
              index 1ac9c27..d5cbb79 100644
              --- a/src/index.js
              +++ b/src/index.js
              @@ -141,9 +141,4 @@ app.on('activate', async () => {
                           app.quit();
                       });
                   }
              -
              -    if (process.defaultApp) {
              -        // Running in dev mode
              -        mainWindow.webContents.openDevTools();
              -    }
               })();
            ''));
            nativeBuildInputs = [ makeWrapper ];
            installPhase = ''
              # resources
              mkdir -p "$out/share/kiwiirc"
              cp -r "./deps/kiwiirc-desktop" "$out/share/kiwiirc/electron"

              rm "$out/share/kiwiirc/electron/node_modules"
              cp -r "./node_modules" "$out/share/kiwiirc/electron"

              rm -r "$out/share/kiwiirc/electron/kiwiirc"
              mkdir -p  "$out/share/kiwiirc/electron/kiwiirc"
              ln -s "${final.kiwiirc}/www" "$out/share/kiwiirc/electron/kiwiirc/dist"

              # icons
              for res in 128x128 256x256 512x512; do
                mkdir -p "$out/share/icons/hicolor/$res/apps"
                cp "./deps/kiwiirc-desktop/static/icons/kiwiirclogo_$res.png" "$out/share/icons/hicolor/$res/apps/kiwiirc.png"
              done

              # desktop item
              mkdir -p "$out/share"
              ln -s "${desktopItem}/share/applications" "$out/share/applications"

              # executable wrapper
              makeWrapper "${electron}/bin/electron" "$out/bin/${executableName}" \
                --add-flags "$out/share/kiwiirc/electron"
            '';

            distPhase = ''
              true
            '';

            desktopItem = makeDesktopItem {
              name = "kiwiirc-desktop";
              exec = "${executableName} %u";
              icon = "kiwiirc";
              desktopName = "Kiwiirc";
              genericName = "Kiwiirc";
              categories = "Network;InstantMessaging;Chat;";
            };
          };
          webircgateway = final.buildGoModule rec {
            src = webircgateway;
            name = "webircgateway";
            pname = "webircgateway";
            vendorSha256 =
              "sha256-CzA99tijUdmi46x9hV8bKR9uVK1HivG/QpciXwpstlU=";
            subPackages = [ "." ];
            runVend = true;
          };
          kiwiirc_distributeStatic = final.webircgateway.overrideAttrs
            (oldAttrs: rec {
              dontCheck = true;
              dontTest = true;
              dontFixup = true;
              buildPhase = ''
                export CGO_ENABLED=0
                cp -r ${final.kiwiirc}/www www
                chmod -R u+w www
                GOOS=darwin GOARCH=amd64 go build -o "$TMP/kiwiirc_darwin_amd64"
                GOOS=darwin GOARCH=arm64 go build -o "$TMP/kiwiirc_darwin_arm64"
                GOOS=linux GOARCH=386 GO386=sse2 go build -o "$TMP/kiwiirc_linux_386"
                GOOS=linux GOARCH=amd64 go build -o "$TMP/kiwiirc_linux_amd64"
                GOOS=linux GOARCH=riscv64 go build -o "$TMP/kiwiirc_linux_riscv64"
                GOOS=linux GOARCH=arm GOARM=5 go build -o "$TMP/kiwiirc_linux_armel"
                GOOS=linux GOARCH=arm GOARM=6 go build -o "$TMP/kiwiirc_linux_armhf"
                GOOS=linux GOARCH=arm64 go build -o "$TMP/kiwiirc_linux_arm64"
                GOOS=windows GOARCH=386 go build -o "$TMP/kiwiirc_windows_386"
                GOOS=windows GOARCH=amd64 go build -o "$TMP/kiwiirc_windows_amd64"
              '';
              installPhase = ''
                mkdir -p $out
                for i in $TMP/kiwiirc*
                do
                  binaryName=$(echo $i | xargs -n 1 basename)
                  mkdir $binaryName
                  ln -s $i $binaryName/kiwiirc
                  ln -s $PWD/www $binaryName/www
                  ln -s $PWD/config.conf.example $binaryName/config.conf.example
                  ${final.zip}/bin/zip -r $out/${
                    final.lib.substring 0 8 webircgateway.rev
                  }-$binaryName.zip $binaryName
                done
              '';
            });
        };

      packages = forAllSystems (system: {
        inherit (nixpkgsFor.${system})
          kiwiirc kiwiirc-desktop webircgateway kiwiirc_distributeStatic;
      });

      defaultPackage = forAllSystems (system: self.packages.${system}.kiwiirc);

      nixosModules.kiwiirc = { pkgs, lib, config, ... }:
        with lib;
        let
          cfg = config.services.kiwiirc;
          ini = pkgs.formats.ini { };
          json = pkgs.formats.json { };
          webircgatewayConf =
            ini.generate "webircgateway.conf" cfg.webircgateway.settings;
          # finalPackage is a variable which takes the user defined package for
          # kiwiirc, such as 'services.kiwiirc.package = pkgs.myCustomPackage'
          # and applies the user defined kiwiirc config to it. This finalPackage
          # is then used as the default webroot for webircgateway. This means
          # that no matter what package the user provides, it will be processed
          # and contain the kiwiircConf (config file) in its output.
          finalPackage = pkgs.runCommandNoCC "kiwiirc-with-config" { } ''
            cp -rs ${cfg.package} $out
            chmod +w -R $out
            ln -sf ${kiwiircConf} $out/www/static/config.json
          '';
          kiwiircConf = 
            # kiwiircConf is a variable which writes and merges the default
            # config.json from the kiwiirc package with the user defined config
            # from the nixosModule. In the case of a collision, the user
            # defined configuration takes precedence, since it is passed as the
            # second argument in lib.recursiveUpdate.
            pkgs.writeText "kiwiirc.conf" (
              builtins.toJSON (
                lib.recursiveUpdate
                  (builtins.fromJSON
                    (builtins.readFile "${pkgs.kiwiirc}/www/static/config.json")
                  )
                  (builtins.fromJSON
                    (builtins.readFile (json.generate "kiwiirc.conf" cfg.settings))
                  )
              )
            );
        in {
          options.services.kiwiirc = {
            enable = mkEnableOption
              "Enable KiwiIRC, served via the Webserver built into webircgateway.";
            package = mkOption {
              default = pkgs.kiwiirc;
              defaultText = "pkgs.kiwiirc";
              type = types.package;
              description = "kiwiirc package to use.";
            };
            settings = mkOption {
              type = with types; submodule { freeformType = json.type; };
            };
            configFile = mkOption {
              type = types.path;
              default = kiwiircConf;
              description = ''
                Path to the kiwiirc configuration file.
                See <link
                xlink:href="https://github.com/kiwiirc/kiwiirc/blob/master/static/config.json"/>
                for a configuration example.
              '';
            };
            webircgateway = {
              package = mkOption {
                default = pkgs.webircgateway;
                defaultText = "pkgs.webircgateway";
                type = types.package;
                description = "webircgateway package to use.";
              };
              useRecommendedDefaultConfig = mkOption {
                default = true;
                defaultText = "true";
                type = types.bool;
                description = ''
                  Whether to use the recommended sane defaults
                                    for this webircgateway module.'';
              };
              settings = mkOption {
                type = with types;
                  submodule {
                    freeformType = ini.type;
                    options = {
                      fileserving = {
                        enabled = mkOption {
                          type = types.bool;
                          default = true;
                          example = true;
                          description =
                            "Whether to use webircgateway as a webserver.";
                        };
                        webroot = mkOption {
                          type = types.path;
                          default = "${finalPackage}/www";
                          example = "${pkgs.kiwiirc}/www";
                          description =
                            "Path to root of files to be served via webserver.";
                        };
                      };
                      reverse_proxies = mkOption {
                        # Since webircgateway uses strange ini parsing via the
                        # 'goini' library, we need to coerce (convert/cast) a
                        # list of strings, into a set of strings that are equal
                        # to boolean true, else the user of this module would
                        # have to type:
                        #
                        #  { "127.0.0.0/8" = true; }
                        #  Instead of:
                        #  [ "127.0.0.1/8" ]
                        #
                        # This is not ergonomic, so the handy function coercedTo
                        # is used to accomplish this. It takes 3 arguments,
                        # which can be seen below.
                        type = with types;
                          coercedTo (listOf str)
                          (x: genAttrs (map (s: ''"${s}"'') x) (name: true))
                          attrs;
                        default = [
                          "127.0.0.0/8"
                          "10.0.0.0/8"
                          "172.16.0.0/12"
                          "192.168.0.0/16"
                          "::1/128"
                          "fd00::/8"
                        ];
                        example = [ "127.0.0.1/8" "10.0.0.0/8" ];
                        description =
                          "List of IPs in CIDR format to whitelist. If using a reverse proxy, these IPs must be whitelisted for the client hostnames to be read correctly.";
                      };
                      transports = {
                        websocket = mkOption {
                          type = types.bool;
                          default = true;
                          example = false;
                          description =
                            "Whether to enable websocket as a transport";
                        };
                        kiwiirc = mkOption {
                          type = types.bool;
                          default = true;
                          example = false;
                          description =
                            "Whether to enable kiwiirc as a transport";
                        };
                        sockjs = mkOption {
                          type = types.bool;
                          default = true;
                          example = false;
                          description =
                            "Whether to enable sockjs as a transport";
                        };
                      };
                    };
                  };
                default = { };
                description = ''
                  Configuration for webircgateway. See
                  <link xlink:href="https://github.com/kiwiirc/webircgateway/blob/master/config.conf.example" />.
                  This option is mutually exclusive with <option>config</option>.
                '';
                example = literalExample ''
                  default = {
                    logLevel = 3;
                    identd = false;
                    gateway_name = "webircgateway";
                    secret = "foo";
                  };
                  "server.1" = {
                    bind "0.0.0.0";
                    port = 8000;
                  };
                  fileserving = {
                    enabled = true;
                    webroot = "\${pkgs.kiwiirc}";
                  };
                '';
              };
              configFile = mkOption {
                type = types.path;
                default = webircgatewayConf;
                description = ''
                  Path to the webircgateway configuration file.
                  See <link
                  xlink:href="https://github.com/kiwiirc/webircgateway/blob/master/config.conf.example"/>
                  for a configuration example.
                '';
              };
            };
          };
          config = {
            nixpkgs.overlays = [ self.overlay ];

            services.kiwiirc.webircgateway.settings =
              lib.mkIf cfg.webircgateway.useRecommendedDefaultConfig
              (mapAttrs (name: mapAttrs (name: mkDefault)) {
                default = {
                  logLevel = 3;
                  identd = false;
                  gateway_name = "webircgateway";
                };
                verify = {
                  recaptcha_url =
                    "https://www.google.com/recaptcha/api/siteverify";
                  required = false;
                };
                "server.1" = {
                  bind = "0.0.0.0";
                  port = 8000;
                };
                "dnsbl.servers" = { "dnsbl.dronebl.org" = true; };
                gateway = {
                  enabled = false;
                  timeout = 5;
                  throttle = 2;
                };
                "upstream.1" = {
                  hostname = "irc.libera.chat";
                  port = 6667;
                  tls = false;
                  timeout = 5;
                  throttle = 2;
                  webirc = "";
                  serverpassword = "";
                };
              });

            services.kiwiirc.settings = mapAttrs (name: mkDefault) {
              windowTitle = "Kiwi IRC - NixOS";
              kiwiServer =
                "http://${config.networking.hostName}:8000/webirc/kiwiirc";
            };

            systemd.services.kiwiirc = mkIf config.services.kiwiirc.enable {
              description = "The KiwiIRC Service";
              wantedBy = [ "multi-user.target" ];
              after = [ "networking.target" ];
              serviceConfig = {
                DynamicUser = true;
                ExecStart =
                  "${pkgs.webircgateway}/bin/webircgateway -config ${cfg.webircgateway.configFile}";
                PrivateTmp = true;
                Restart = "always";
              };
            };
          };
        };

      checks = forAllSystems (system:
        with nixpkgsFor.${system};
        lib.optionalAttrs stdenv.isLinux {
          # A VM test of the NixOS module.
          vmTest = with import (nixpkgs + "/nixos/lib/testing-python.nix") {
            inherit system;
          };

            let
              test = makeTest {
                nodes = {
                  client = { config, pkgs, ... }: {
                    environment.systemPackages = [ pkgs.curl ];
                  };
                  kiwiirc = { config, pkgs, ... }: {
                    imports = [ self.nixosModules.kiwiirc ];
                    services.kiwiirc.enable = true;
                    networking.firewall.allowedTCPPorts = [ 8000 ];
                  };
                };

                testScript = ''
                  start_all()
                  kiwiirc.wait_for_unit("kiwiirc.service")
                  kiwiirc.wait_for_open_port("8000")
                  client.wait_for_unit("multi-user.target")
                  client.succeed("curl -sSf http:/kiwiirc:8000/static/config.json")
                  kiwiirc.succeed("cat ${test.nodes.kiwiirc.config.services.kiwiirc.configFile} >&2")
                  kiwiirc.succeed("cat ${test.nodes.kiwiirc.config.services.kiwiirc.webircgateway.configFile} >&2")
                '';
              };
            in test;
        });

      hydraJobs.kiwiirc = self.defaultPackage;
    };
}

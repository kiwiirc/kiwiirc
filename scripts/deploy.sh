#!/bin/bash

set -e

npm run build
scp -r dist/* root@out.kiwiirc.com:/var/www/kiwiircweb/public/nextclient/

ssh root@out.kiwiirc.com <<'SSHSCRIPT'
cd /var/www/kiwiircweb/public/nextclient/

mv index.html built_index.html
cp index.php index.php.$(date +%F-%T)

php <<'EOF'
<?php
$file = file_get_contents("index.php");
$source = file_get_contents("built_index.html");

$file = preg_replace("/default\.css\?b=([0-9]+)/i", "default.css?b=".time(), $file);

preg_match("/app\.([0-9a-z]+)\.css/", $source, $m);
$appcss = $m[1];
$file = preg_replace("/app\.([0-9a-z]+)\.css/i", "app.$appcss.css", $file);

preg_match("/manifest\.([0-9a-z]+)\.js/", $source, $m);
$manifestjs = $m[1];
$file = preg_replace("/manifest\.([0-9a-z]+)\.js/i", "manifest.$manifestjs.js", $file);

preg_match("/vendor\.([0-9a-z]+)\.js/", $source, $m);
$vendorjs = $m[1];
$file = preg_replace("/vendor\.([0-9a-z]+)\.js/i", "vendor.$vendorjs.js", $file);

preg_match("/app\.([0-9a-z]+)\.js/", $source, $m);
$appjs = $m[1];
$file = preg_replace("/app\.([0-9a-z]+)\.js/i", "app.$appjs.js", $file);

file_put_contents("index.php", $file);
EOF

SSHSCRIPT

echo Complete! https://kiwiirc.com/nextclient/

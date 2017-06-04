var path = require('path');
var fs = require('fs');
var i18next_conv = require('i18next-conv');

var source_path = path.join(__dirname, '../locales/');
var dest_path = path.join(__dirname, '../static/locales/');

function save(target) {
    return function(result) {
        fs.writeFileSync(target, result);
    };
}

exports.createJsonFiles = function() {
    return new Promise(function(resolve, reject) {
        fs.readdir(source_path, function(err, files) {
            var complete = 0;
            var total = files.length;

            files.forEach(function(file, idx) {
                var match = file.match(/^app.([a-z_\-]+).po$/i);
                if (!match) {
                    complete++;
                    return;
                }

                var locale_file = source_path + file;
                var locale = match[1];

                i18next_conv.gettextToI18next(locale, fs.readFileSync(locale_file))
                    .then(save(dest_path + locale.toLowerCase() + '.json'))
                    .then(function() {
                        complete++;
                        if (complete === total) {
                            resolve();
                        }
                    });
            });
        });
    });
};

if (require.main === module) {
    exports.createJsonFiles();
}

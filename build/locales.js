var path = require('path');
var fs = require('fs');
var i18next_conv = require('i18next-conv');

var source_path = path.join(__dirname, '../src/res/locales/');
var dest_path = path.join(__dirname, '../static/locales/');

function save(target) {
    return function(result) {
        fs.writeFileSync(target, result);
    };
}

exports.createJsonFiles = function() {
    var availableLangs = [];

    var convertLocales = new Promise(function(resolve, reject) {
        fs.readdir(source_path, function(err, files) {
            var complete = 0;
            var total = files.length;

            files.forEach(function(file, idx) {
                var match = file.match(/^app.([a-z_\-]+).po$/i);
                if (!match) {
                    complete++;
                    return;
                }

                var locale = match[1];
                var data = new Buffer([]);

                files.forEach(function (file2,idx2) {
                    var regex = new RegExp("."+locale+".po$", "i");
                    var match2 = file2.match(regex);
                    if (!match2) {
                        return;
                    }
                    var locale_file = source_path + file2;
                    data = Buffer.concat([data, fs.readFileSync(locale_file)]);
                });

                i18next_conv.gettextToI18next(locale, data)
                    .then(save(dest_path + locale.toLowerCase() + '.json'))
                    .then(function() {
                        availableLangs.push(locale.toLowerCase());
                        complete++;
                        if (complete === total) {
                            resolve();
                        }
                    });
            });
        });
    });

    function writeAvailableFile() {
        var content = JSON.stringify({
            locales: availableLangs,
        });
        fs.writeFileSync(source_path + 'available.json', content);
    }

    return convertLocales.then(writeAvailableFile);
};

if (require.main === module) {
    exports.createJsonFiles();
}

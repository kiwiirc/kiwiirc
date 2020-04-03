var path = require('path');
var fs = require('fs');
var ora = require('ora')
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

            // Find any app.*.po files and use them to determine which locales we have available
            files.forEach(function(file, idx) {
                var match = file.match(/^app.([a-z_\-]+).po$/i);
                if (!match) {
                    complete++;
                    return;
                }

                var locale = match[1];
                var data = Buffer.alloc(0);

                // Find all the other locale files for this locale and join them together into a
                // single locale translation
                files.forEach(function (localeFilename) {
                    var regex = new RegExp(`.${locale}.po$`, 'i');
                    if (!localeFilename.match(regex)) {
                        return;
                    }

                    var fileContent = fs.readFileSync(source_path + localeFilename);
                    data = Buffer.concat([data, fileContent]);
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
    let spinner = ora('translating languages...')
    spinner.start()
    exports.createJsonFiles();
    spinner.succeed();
}

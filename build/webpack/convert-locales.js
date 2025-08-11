const fs = require('fs');
const path = require('path');

class ConvertLocalesPlugin {
    apply(compiler) {
        const pluginName = this.constructor.name;
        const fileDependencies = new Set();

        compiler.hooks.beforeRun.tapAsync(pluginName, (compilation, callback) => {
            // run in build mode
            convertLocales(fileDependencies, callback);
        });

        compiler.hooks.watchRun.tapAsync(pluginName, (compilation, callback) => {
            // run in dev mode
            convertLocales(fileDependencies, callback);
        });

        compiler.hooks.afterEmit.tapAsync(pluginName, (compilation, callback) => {
            // Add file dependencies
            fileDependencies.forEach((dependency) => {
                compilation.fileDependencies.add(dependency);
            });

            callback();
        });
    }
}

async function convertLocales(fileDependencies, callback) {
    const i18nextConv = await import('i18next-conv');

    fileDependencies.clear();
    const sourceDir = path.resolve('src/res/locales/');
    const outputDir = path.resolve('static/locales/');

    const awaitPromises = new Set();
    const availableLangs = new Set();

    const files = fs.readdirSync(sourceDir).filter((f) => path.extname(f) === '.po');
    files.forEach((file) => {
        const match = file.match(/^app.([a-z_-]+).po$/i);
        if (!match) {
            return;
        }

        const locale = match[1];
        const lcLocale = locale.toLowerCase();
        const outputPath = path.join(outputDir, lcLocale + '.json');
        const sourcePath = path.join(sourceDir, file);

        const concatLocale = () => new Promise((resolve) => {
            let data = Buffer.alloc(0);
            files.forEach((localeFile) => {
                if (!localeFile.endsWith(`.${locale}.po`)) {
                    return;
                }
                const content = fs.readFileSync(path.join(sourceDir, localeFile));
                data = Buffer.concat([data, content]);
            });
            resolve(data);
        });

        const promise = concatLocale()
            .then((data) => i18nextConv.gettextToI18next(locale, data))
            .then((json) => writeIfChanged(outputPath, json));

        awaitPromises.add(promise);
        availableLangs.add(lcLocale);
        fileDependencies.add(sourcePath);
    });

    // Write available.json
    const availablePath = path.join(sourceDir, 'available.json');
    const content = JSON.stringify({
        locales: Array.from(availableLangs),
    });
    writeIfChanged(availablePath, content);

    await Promise.all(awaitPromises);
    callback();
}

function writeIfChanged(file, _data) {
    const data = Buffer.from(_data);
    if (fs.existsSync(file) && data.equals(fs.readFileSync(file))) {
        return;
    }

    fs.writeFileSync(file, data);
}

module.exports = ConvertLocalesPlugin;

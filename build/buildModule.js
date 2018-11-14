'use strict'
require('./check-versions')()

process.env.NODE_ENV = 'module'

const ora = require('ora')
const rm = require('rimraf')
const path = require('path')
const chalk = require('chalk')
const webpack = require('webpack')
const locales = require('./locales')
const config = require('../config')
const webpackConfig = require('./webpack.module.conf')

let spinner = ora('translating languages...')
spinner.start()

locales.createJsonFiles().then(() => {
  spinner.succeed();

  spinner = ora('building as module...')
  spinner.start()
  return buildSource();
});


function buildSource() {
  rm(path.join(config.build.assetsRoot, config.build.assetsSubDirectory), err => {
    if (err) throw err
    webpack(webpackConfig, (err, stats) => {
      spinner.stop()
      if (err) throw err
      process.stdout.write(stats.toString({
        colors: true,
        modules: false,
        children: false, // If you are using ts-loader, setting this to true will make TypeScript errors show up during build.
        chunks: false,
        chunkModules: false
      }) + '\n\n')

      if (stats.hasErrors()) {
        console.log(chalk.red('  Build failed with errors.\n'))
        process.exit(1)
      }

      console.log(chalk.cyan('  Build complete.\n'))
      console.log(chalk.yellow(
        '  Tip: You may import the built module with: import KiwiIrc from \'kiwiirc/vue\'.\n'
      ))
    })
  })
}

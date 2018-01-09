var path = require('path')
var config = require('../config')
var utils = require('./utils')
var projectRoot = path.resolve(__dirname, '../src/')

var env = process.env.NODE_ENV === 'testing'
  ? require('../config/test.env')
  : config.build.env
var isProduction = env.NODE_ENV === '"production"';

module.exports = {
  entry: {
    app: './src/main.js'
  },
  output: {
    path: config.build.assetsRoot,
    publicPath: process.env.NODE_ENV === 'production' ? config.build.assetsPublicPath : config.dev.assetsPublicPath,
    filename: '[name].js'
  },
  resolve: {
    extensions: ['.js', '.vue', '.json'],
    alias: {
      'vue': 'vue/dist/vue',
      '@': path.resolve(__dirname, '../src'),
      'assets': path.resolve(__dirname, '../src/assets'),
      'components': path.resolve(__dirname, '../src/components')
    }
  },
  module: {
    rules: [
      {
        test: /\.vue$/,
        loader: 'eslint-loader',
        include: projectRoot,
        enforce: 'pre',
        options: {
          formatter: require('eslint-friendly-formatter'),
        }
      },
      {
        test: /\.js$/,
        loader: 'eslint-loader',
        include: projectRoot,
        enforce: 'pre',
        options: {
          formatter: require('eslint-friendly-formatter'),
        }
      },
      {
        test: /\.vue$/,
        loader: 'vue-loader',
        options: {
          loaders: utils.cssLoaders({
            sourceMap: isProduction,
            extract: isProduction
          }),
          cssSourceMap: isProduction,
          cacheBusting: config.dev.cacheBusting,
          transformToRequire: {
            video: ['src', 'poster'],
            source: 'src',
            img: 'src',
            image: 'xlink:href'
          },
          postcss: [
            require('autoprefixer')({
              browsers: ['last 2 versions']
            })
          ],
        },
      },
      {
        test: /\.js$/,
        loader: 'babel-loader',
        include: [ projectRoot ],
      },
      {
        test: /\.json$/,
        loader: 'json-loader'
      },
      {
        test: /\.(png|jpe?g|gif|svg)(\?.*)?$/,
        loader: 'url-loader',
        query: {
          limit: 10000,
          name: utils.assetsPath('img/[name].[hash:7].[ext]')
        }
      },
      {
        test: /\.html$/,
        loader: 'html-loader',
        options: {
          attrs: [':data-src']
        }
      },
      { test: /\.woff(2)?(\?v=[0-9]\.[0-9]\.[0-9])?$/, loader: "url-loader?limit=10000&minetype=application/font-woff" },
      { test: /\.(ttf|eot|svg)(\?v=[0-9]\.[0-9]\.[0-9])?$/, loader: "file-loader" }
    ]
  },
}

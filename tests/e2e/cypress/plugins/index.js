/* eslint-disable no-unused-vars */
// ***********************************************************
// This plugins/index.js can be used to load plugins. It is
// called when a project is opened or re-opened.
//
// https://on.cypress.io/plugins-guide
// ***********************************************************
// This function is called when a project is opened or re-opened

const selectTestsWithGrep = require("cypress-select-tests/grep")
const fs = require("fs-extra")
const path = require("path")

// `on` is used to hook into various events Cypress emits
// `config` is the resolved Cypress config
module.exports = async (on, config) => {
  on("file:preprocessor", selectTestsWithGrep(config))
  require("cypress-plugin-retries/lib/plugin")(on)

  return config
}

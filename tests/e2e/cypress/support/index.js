// ***********************************************************
// This file is processed automatically before your test files,
// so it's a great place to put global config and behavior that
// modifies Cypress.
//
// https://on.cypress.io/configuration
// ***********************************************************

import "./commands"

require("cypress-commands")
require("cypress-plugin-retries")
const addContext = require("mochawesome/addContext")

// Pass anything here you'd normally pass to cy.server()
Cypress.Server.defaults({
  //whitelist: (xhr) => true    // Mutes XHR requests
})

// These cookies will not be cleared before each test runs
Cypress.Cookies.defaults({
  whitelist: ["cookie-name"]
})

// In case you want to disable all screenshots (useful for API testing)
Cypress.Screenshot.defaults({
  screenshotOnRunFailure: true
})

Cypress.on("test:after:run", (test, runnable) => {
  if (test.state === "failed") {
    const screenshotFileName = `${runnable.parent.title} -- ${test.title} (failed).png`
    addContext({ test }, `assets/${Cypress.spec.name}/${screenshotFileName}`)
  }
})

// If you want to display additional info when a test fails, use below
Cypress.on("fail", error => {
  const cookies = ["cookie-name", "another-cookie"]
  let cookiesMsg = "Cookies:"
  for (const cookie of cookies) {
    cookiesMsg += ` ${cookie}="${getCookieValue(cookie)}"`
  }

  error.message = `${error.message}\n\t${cookiesMsg}`
  throw error // still fail the test
})

// If you want to set cookies for all tests (e.g. login), uncomment below
before(function setupCookiesForAllTests() {
  cy.setCookie("cookie-name", "cookie-value")
  cy.getCookie("cookie-name").should("have.property", "value", "cookie-value")
})

// Enable "Fail Fast" (https://github.com/cypress-io/cypress/issues/518#issuecomment-508731869)
switch (Cypress.env("abortStrategy")) {
  case "run":
    before(function abortRunIfFailedFast() {
      cy.getCookie("failfast_occurred").then(cookie => {
        if (cookie && cookie.value === "true") {
          Cypress.runner.stop()
        }
      })
    })
  /* fallthrough */
  case "spec":
    afterEach(function updateFailFastCookie() {
      if (this.currentTest.state === "failed" && this.currentTest.title.includes("#fail-fast")) {
        cy.setCookie("failfast_occurred", "true")
        Cypress.runner.stop()
      }
    })
    break
  default:
    break
}

// Utils

function getCookieValue(name) {
  const value = "; " + document.cookie
  const parts = value.split("; " + name + "=")
  if (parts.length === 2)
    return parts
      .pop()
      .split(";")
      .shift()
}

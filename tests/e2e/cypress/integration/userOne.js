// eslint-disable-line
import {pollForElement} from "../utils/DOMInterationUtils"

before(
    "will visit Kiwi IRC",
    () => {
        cy.visit("http://localhost:8081/")
    }
)

describe(
    "will fill out login page as user 1, 'automationUser1'",
    () => {
        it(
            "will clear input field labeled 'name' for user 1, and then add user name 'automationUser1'",
            () => {
                cy.get(".u-input-text div input")
                    .first()
                    .clear()
                    .type("automationUser1")
            }
        )

        it(
            "will select checkbox for password for user 1, 'automationUser1' and enter password for user",
            () => {
                cy.get(".kiwi-welcome-simple-have-password input")
                    .click()

                cy.get("input[type=password]")
                    .type("theothertest")
            }
        )

        it(
            "will clear input field with label 'channel', and then enter '#automation-message'",
            () => {
                cy.get(".u-input-text div input")
                    .last()
                    .clear()
                    .type("#automation-message")
            }
        )

        it(
            "will click 'start button",
            () => {
                cy.get("button[class=\"u-button u-button-primary u-submit kiwi-welcome-simple-start\"]")
                    .click()
            }
        )
    }
)

// Wont run until it sees message area 'span.kiwi-controlinput-user-nic'
describe(
    "will wait for login flow to complete and the application to load, for user 1",
    () => {
        it(
            "will wait for the main page to load, after logging in",
            () => {
                const TEN = 120
                const THREE_THOUSAND = 3000
                const SELECTOR = "span.kiwi-controlinput-user-nick"

                pollForElement(
                    TEN,
                    THREE_THOUSAND,
                    SELECTOR
                )
            }
        )
    }
)

// Wont run till it sees 'automationUser2'/'automationuser2'
describe(
    "will have user1 wait for message from user2 ",
    () => {
        it(
            "will wait for message from user2",
            () => {
                const TEN = 120
                const THREE_THOUSAND = 3000
                const SELECTOR = "[data-name=automationuser2]"

                pollForElement(
                    TEN,
                    THREE_THOUSAND,
                    SELECTOR
                )
            }
        )

        it(
            "will write return message to user2",
            () => {
                cy.get("div.kiwi-controlinput-input-wrap").type("/msg automationUser2 Hello back to you {enter}")
            }
        )
    }
)

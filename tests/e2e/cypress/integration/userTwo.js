// eslint-disable-line
import {pollForElement} from "../utils/DOMInterationUtils"

before(
    "will visit Kiwi IRC",
    () => {
        cy.visit("http://localhost:8081/")
    }
)

describe(
    "will fill out login as user 2, 'automationUser2'",
    () => {
        it(
            "will clear input field with label 'name' for user 2, and add user name 'automationUser2'",
            () => {
                cy.get(".u-input-text div input")
                    .first()
                    .clear()
                    .type("automationUser2")
            }
        )

        it(
            "will select checkbox for password for user 2, 'automationUser2' and enter password for user",
            () => {
                cy.get(".kiwi-welcome-simple-have-password input")
                    .click()

                cy.get("input[type=password]")
                    .type("thetest")
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
    "will wait for the login flow to complete and the application to load, for user2",
    () => {
        it(
            "will wait for main page to load appropriately",
            () => {
                const TEN = 60
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

// Types message to user1 and wont pass until user1 is verified as existing
describe(
    "will send a message to user 1",
    // eslint-disable-next-line max-lines-per-function
    () => {
        // Looks for 'automationUser1'
        it(
            "will wait for user1",
            () => {
                const FIVE = 100
                const THREE_THOUSAND = 3000
                const USER_SELECTOR = "[data-nick=automationuser1].kiwi-nicklist-user"

                pollForElement(
                    FIVE,
                    THREE_THOUSAND,
                    USER_SELECTOR
                )
            }
        )

        it(
            "will write message to user1",
            () => {
                cy.get("div.kiwi-controlinput-input-wrap")
                    .type("/msg automationUser1 Greetings{enter}")
            }
        )

        it(
            "will ensure that the message was received by user 1",
            () => {
                cy.get("[data-name=automationuser1]").click()

                const TEN = 5
                const THREE_THOUSAND = 3000
                const SELECTOR = ".kiwi-messagelist-item:last-child .kiwi-messagelist-message-error"
                const NoElementFailsPolling = false

                pollForElement(
                    TEN,
                    THREE_THOUSAND,
                    SELECTOR,
                    NoElementFailsPolling
                )
            }
        )

        it(
            "will check user name in the message is correct and visible, for the message sent to user 1",
            () => {
                cy.get(".kiwi-messagelist-item:nth-child(1) [data-nick]  .kiwi-messagelist-modern-right a")
                    .text()
                    .should(
                        "eq",
                        "automationUser2"
                    )

                cy.get(".kiwi-messagelist-item:nth-child(1) [data-nick]  .kiwi-messagelist-modern-right a")
                    .should("be.visible")
            }
        )

        it(
            "will check message text in message body is correct and visible, for the message sent to user 1",
            () => {
                cy.get(".kiwi-messagelist-item:nth-child(1)  .kiwi-messagelist-body")
                    .text()
                    .should(
                        "eq",
                        "Greetings"
                    )

                cy.get(".kiwi-messagelist-item:nth-child(1)  .kiwi-messagelist-body")
                    .should("be.visible")
            }
        )
    }
)

describe(
    "will check received message from user 1 'automationUser1', to user 2, 'automationUser2'",
    () => {
        it(
            "will wait for first message sent from user 1, to appear on the screen",
            () => {
                const FIVE = 60
                const THREE_THOUSAND = 3000
                const SELECTOR = ".kiwi-messagelist-item:nth-child(2) [data-nick]  .kiwi-messagelist-modern-right a"

                pollForElement(
                    FIVE,
                    THREE_THOUSAND,
                    SELECTOR
                )
            }
        )

        it(
            "will check the name in message is correct and visible for first message received from user 1",
            () => {
                cy.get(".kiwi-messagelist-item:nth-child(2) [data-nick]  .kiwi-messagelist-modern-right a")
                    .text()
                    .should(
                        "eq",
                        "automationUser1"
                    )

                cy.get(".kiwi-messagelist-item:nth-child(2) [data-nick]  .kiwi-messagelist-modern-right a")
                    .should("be.visible")
            }
        )

        it(
            "will check the message text in message body is correct and visible for first message received from user1",
            () => {
                cy.get(".kiwi-messagelist-item:nth-child(2) .kiwi-messagelist-body")
                    .text()
                    .should(
                        "eq",
                        "Hello back to you"
                    )

                cy.get(".kiwi-messagelist-item:nth-child(2) .kiwi-messagelist-body")
                    .should("be.visible")
            }
        )
    }
)

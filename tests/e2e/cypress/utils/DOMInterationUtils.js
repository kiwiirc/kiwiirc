// eslint-disable-line

export function pollForElement (maxRetries, secondsPerTry, selector, noElementFailsPolling = true) {
    let retry = 0

    function isElementVisible () {
        const ONE = 1

        // eslint-disable-next-line max-len
        const elementHasBeenFound = Cypress.$(selector).length === ONE

        if (noElementFailsPolling) {
            // Tried to find it but ran out of time finding it
            if (retry >= maxRetries) {
                cy.contains("Sorry, something went wrong").should("not.exist")
                throw new Error("Failed!")
            }
        } else if (elementHasBeenFound) {
            // Tried to *not* find it, yet found it
            cy.contains("Sorry, something went wrong").should("not.exist")
            throw new Error("Failed!")
        }

        // If we still have retries left, and element hasn't been found, then keep trying
        if (retry < maxRetries && !elementHasBeenFound) {
            // Increment retry
            retry++

            // Wait 30 seconds
            // eslint-disable-next-line cypress/no-unnecessary-waiting
            cy.wait(secondsPerTry)

            // Element is not yet visible, Call the recursive function again
            cy.then(isElementVisible)
        }
    }

    // Kick off polling
    cy.then(isElementVisible)
}

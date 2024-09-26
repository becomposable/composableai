import { describe, test, expect } from "vitest";
import { computeActivityOptions } from "./dsl-workflow.ts";

describe('Workflow DSL', () => {
    test('compute activity options without custom options', () => {
        expect(computeActivityOptions({}, {
            startToCloseTimeout: 1000,
            scheduleToCloseTimeout: 2000,
            scheduleToStartTimeout: 3000,
            retry: {
                initialInterval: 4000,
                maximumInterval: 5000,
                maximumAttempts: 6,
                backoffCoefficient: 7,
                nonRetryableErrorTypes: ['error']
            }
        })).toEqual({
            startToCloseTimeout: 1000,
            scheduleToCloseTimeout: 2000,
            scheduleToStartTimeout: 3000,
            retry: {
                initialInterval: 4000,
                maximumInterval: 5000,
                maximumAttempts: 6,
                backoffCoefficient: 7,
                nonRetryableErrorTypes: ['error']
            }
        })
    })

    test('compute activity options with some custom options', () => {
        expect(computeActivityOptions({
            startToCloseTimeout: 100,
        }, {
            startToCloseTimeout: 1000,
            scheduleToCloseTimeout: 2000,
            scheduleToStartTimeout: 3000,
            retry: {
                initialInterval: 4000,
                maximumInterval: 5000,
                maximumAttempts: 6,
                backoffCoefficient: 7,
                nonRetryableErrorTypes: ['error']
            }
        })).toEqual({
            startToCloseTimeout: `100ms`, // custom value
            scheduleToCloseTimeout: 2000,
            scheduleToStartTimeout: 3000,
            retry: {
                initialInterval: 4000,
                maximumInterval: 5000,
                maximumAttempts: 6,
                backoffCoefficient: 7,
                nonRetryableErrorTypes: ['error']
            }
        })
    })
});
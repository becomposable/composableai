import { ContentEventName, DSLActivityExecutionPayload, DSLWorkflowExecutionPayload, DSLWorkflowStep } from '@becomposable/common';
import { TestWorkflowEnvironment } from '@temporalio/testing';
import { Worker } from '@temporalio/worker';
import { afterAll, beforeAll, describe, expect, test } from 'vitest';
import { dslWorkflow } from './dsl-workflow.js';
import { setupActivity } from './setup/ActivityContext.js';

async function sayHelloFromParent(payload: DSLActivityExecutionPayload) {
    const { params } = await setupActivity(payload);
    return `Parent: Hello, ${params.name}!`;
}

async function sayHelloFromDSLChild(payload: DSLActivityExecutionPayload) {
    const { params } = await setupActivity(payload);
    return `DSL Child: Hello, ${params.name}!`;
}

async function prepareResult(payload: DSLActivityExecutionPayload) {
    const { params } = await setupActivity(payload);
    return [params.parent, params.child]
}

const steps1: DSLWorkflowStep[] = [
    {
        type: 'activity',
        name: 'sayHelloFromParent',
        output: 'parent',
        import: ["name"],
    },
    {
        type: 'workflow',
        name: 'testChildWorkflow',
        output: 'child',
    },
    {
        type: 'activity',
        name: 'prepareResult',
        import: ["parent", "child"],
        output: 'result',
    }
]

const childSteps: DSLWorkflowStep[] = [
    {
        type: 'activity',
        name: 'sayHelloFromDSLChild',
        output: 'result',
        import: ["name"],
    },
]

const steps2: DSLWorkflowStep[] = [
    {
        type: 'activity',
        name: 'sayHelloFromParent',
        output: 'parent',
        import: ["name"],
    },
    {
        type: 'workflow',
        name: 'dslWorkflow',
        output: 'child',
        spec: {
            name: 'testChildWorkflow',
            steps: childSteps,
            vars: {}
        }
    },
    {
        type: 'activity',
        name: 'prepareResult',
        import: ["parent", "child"],
        output: 'result',
    }
]


// ========== test env setup ==========


describe('DSL Workflow with chld workflows', () => {

    let testEnv: TestWorkflowEnvironment;

    beforeAll(async () => {
        testEnv = await TestWorkflowEnvironment.createLocal();
    });

    afterAll(async () => {
        await testEnv?.teardown();
    });

    test('execute child workflow', async () => {
        const { client, nativeConnection } = testEnv;
        const taskQueue = 'test';

        const name = 'Foo';

        const worker = await Worker.create({
            connection: nativeConnection,
            taskQueue,
            workflowsPath: new URL("./test/test-child-workflow.ts", import.meta.url).pathname,
            activities: { sayHelloFromParent, prepareResult },
        });

        const payload: DSLWorkflowExecutionPayload = {
            event: ContentEventName.create,
            objectIds: ['123'],
            vars: {},
            account_id: '123',
            project_id: '123',
            timestamp: Date.now(),
            wf_rule_name: 'test',
            auth_token: 'test',
            config: {
                studio_url: process.env.CP_STUDIO_URL || "http://localhost:8081",
                store_url: process.env.CP_STODRE_URL || "http://localhost:8082",
            },
            workflow: {
                steps: steps1,
                vars: {
                    name,
                },
                name: 'test',
            }
        }

        let result = await worker.runUntil(client.workflow.execute(dslWorkflow, {
            args: [payload],
            workflowId: 'test',
            taskQueue,
        }));

        expect(result).toEqual([`Parent: Hello, ${name}!`, `Child: Hello, ${name}!`]);

    });

    test('execute DSL child workflow', async () => {
        const { client, nativeConnection } = testEnv;
        const taskQueue = 'test';

        const name = 'Bar';

        const worker = await Worker.create({
            connection: nativeConnection,
            taskQueue,
            workflowsPath: new URL("./test/test-child-workflow.ts", import.meta.url).pathname,
            activities: { sayHelloFromParent, prepareResult, sayHelloFromDSLChild },
        });

        const payload: DSLWorkflowExecutionPayload = {
            event: ContentEventName.create,
            objectIds: ['123'],
            vars: {},
            account_id: '123',
            project_id: '123',
            timestamp: Date.now(),
            wf_rule_name: 'test',
            auth_token: 'test',
            config: {
                studio_url: process.env.CP_STUDIO_URL || "http://localhost:8081",
                store_url: process.env.CP_STODRE_URL || "http://localhost:8082",
            },
            workflow: {
                steps: steps2,
                vars: {
                    name,
                },
                name: 'test',
            }
        }

        let result = await worker.runUntil(client.workflow.execute(dslWorkflow, {
            args: [payload],
            workflowId: 'test',
            taskQueue,
        }));

        console.log("##########", result);

        expect(result).toEqual([`Parent: Hello, ${name}!`, `DSL Child: Hello, ${name}!`]);

    });
});

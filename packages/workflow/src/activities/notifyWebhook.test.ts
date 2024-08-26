import {
  MockActivityEnvironment,
  TestWorkflowEnvironment,
} from "@temporalio/testing";
import { beforeAll, describe, expect, test } from "vitest";
import { notifyWebhook, NotifyWebhook } from "./notifyWebhook.js";

let testEnv: TestWorkflowEnvironment;
let activityContext: MockActivityEnvironment;

beforeAll(async () => {
  testEnv = await TestWorkflowEnvironment.createLocal();
  activityContext = new MockActivityEnvironment();
});

describe("Webhook should be notified", () => {
  test("test POST", async () => {
    const activityConfig = {
      name: "notifyWebhook",
      params: {
        target_url: "https://en5zdcyvn4dc3.x.pipedream.net",
        method: "POST",
        payload: { message: "Hello World" },
      },
    } satisfies NotifyWebhook;

    const res = await activityContext.run(notifyWebhook, activityConfig);
    expect(res).toBeDefined();
  });
});

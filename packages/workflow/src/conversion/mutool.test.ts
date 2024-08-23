import { MockActivityEnvironment, TestWorkflowEnvironment } from '@temporalio/testing';
import fs from 'fs';
import path from 'path';
import { beforeAll, expect, test } from 'vitest';
import { mutoolPdfToText } from './mutool.js';


let testEnv: TestWorkflowEnvironment;
let activityContext: MockActivityEnvironment;

beforeAll(async () => {
  testEnv = await TestWorkflowEnvironment.createLocal();
  activityContext = new MockActivityEnvironment();
});


test('[mutool] should convert pdf to text', async () => {
  const pdf = fs.readFileSync(path.join(__dirname, '../../fixtures', 'test-pdf2.pdf'));
  const buf = Buffer.from(pdf);
  console.log("Running mutoolPdfToText")
  const result = await activityContext.run(mutoolPdfToText, buf);
  expect(result).toContain('its attentive Ambassadors');
 
});

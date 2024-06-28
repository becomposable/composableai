import { MockActivityEnvironment, TestWorkflowEnvironment } from '@temporalio/testing';
import fs from 'fs';
import path from 'path';
import { beforeAll, expect, test } from 'vitest';
import { trasformPdfToMarkdown } from '../conversion/pdf';


let testEnv: TestWorkflowEnvironment;
let activityContext: MockActivityEnvironment;

beforeAll(async () => {
  testEnv = await TestWorkflowEnvironment.createLocal();
  activityContext = new MockActivityEnvironment();
});


test('Converts a PDF to markdown', async () => {
  const pdfPath = path.resolve(__dirname, '../../fixtures', 'test-pdf1.pdf');
  const pdfBuffer = fs.readFileSync(pdfPath);
  const result = await activityContext.run(trasformPdfToMarkdown, pdfBuffer);

  expect(result).toContain('America');    


});

test('Converts another PDF to markdown', async () => {
    const pdfPath = path.resolve(__dirname, '../../fixtures', 'test-pdf2.pdf');
    const pdfBuffer = fs.readFileSync(pdfPath);
    const result = await activityContext.run(trasformPdfToMarkdown, pdfBuffer);
  
    expect(result).toContain('America');    

  }); 
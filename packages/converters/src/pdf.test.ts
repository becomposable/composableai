import fs from 'fs';
import path from 'path';
import { expect, test } from 'vitest';
import { trasformPdfToMarkdown } from './pdf';



test('Converts a PDF to markdown', async () => {
  const pdfPath = path.resolve(__dirname, '../fixtures', 'test-pdf1.pdf');
  const pdfBuffer = fs.readFileSync(pdfPath);
  const result = await trasformPdfToMarkdown(pdfBuffer);

  expect(result).toContain('America');


});

test('Converts another PDF to markdown', async () => {
  const pdfPath = path.resolve(__dirname, '../fixtures', 'test-pdf2.pdf');
  const pdfBuffer = fs.readFileSync(pdfPath);
  const result = await trasformPdfToMarkdown(pdfBuffer);

  expect(result).toContain('America');

});

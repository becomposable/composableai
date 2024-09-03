import fs from 'fs';
import path from 'path';
import { expect, test } from 'vitest';
import { mutoolPdfToText } from './mutool.js';


test('[mutool] should convert pdf to text', async () => {
  const pdf = fs.readFileSync(path.join(__dirname, '../fixtures', 'test-pdf2.pdf'));
  const buf = Buffer.from(pdf);
  console.log("Running mutoolPdfToText")
  const result = mutoolPdfToText(buf);
  expect(result).toContain('its attentive Ambassadors');

});

import fs from 'fs';
import path from 'path';
import { expect, test } from 'vitest';
import { manyToMarkdown } from './pandoc';
import { Readable } from 'stream';



// Add more test cases for other file types (ODT, DOCX) if needed
test('should convert docx to markdown', async () => {
  const docx: Buffer = fs.readFileSync(path.join(__dirname, '../fixtures', 'us-ciia.docx'));
  const result = await manyToMarkdown(Readable.from(docx), 'docx');
  expect(result).to.include('confidential');
});

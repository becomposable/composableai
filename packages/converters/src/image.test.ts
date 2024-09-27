import fs from 'fs';
import path from 'path';
import sharp from 'sharp';
import { expect, test } from 'vitest';
import { createImageTransformer, pdfToImage } from './image';


test('should resize an image to a maximum height or width', async () => {
  const max_hw = 1024;
  const format: keyof sharp.FormatEnum = 'jpeg';
  const imageFile = fs.readFileSync(path.join(__dirname, '../fixtures', 'cat-picture.jpg'));

  const sh = createImageTransformer(imageFile, { max_hw, format });

  const buffer = await sh.toBuffer();
  const metadata = await sharp(buffer).metadata();

  console.log(metadata);
  //await sh.toFile('./cat-picture.jpg');

  expect(metadata.width).to.be.lessThanOrEqual(max_hw);
  expect(metadata.height).to.be.lessThanOrEqual(max_hw);
  expect(metadata.format).to.equal(format);

});

test('should convert a pdf to image', async () => {
  const max_hw = 1024;
  const format: keyof sharp.FormatEnum = 'png';
  const pdfFile = fs.readFileSync(path.join(__dirname, '../fixtures', 'test-pdf1.pdf'));

  const images = await pdfToImage(pdfFile, { pages: [1], format, max_hw });
  const image = images[0];
  const sh = createImageTransformer(image!, { max_hw, format });
  const buffer = await sh.toBuffer();
  const metadata = await sharp(buffer).metadata();

  //write to file for manual inspection
  console.log(metadata);
  //await resized.toFile('/tmp/test-pdf1.jpg');

  console.log(metadata);
  expect(metadata.width).to.be.lessThanOrEqual(max_hw);
  expect(metadata.height).to.be.lessThanOrEqual(max_hw);
  expect(metadata.format).to.equal(format);


});
import fs from 'fs';
import path from 'path';
import sharp from 'sharp';
import { expect, test } from 'vitest';
import { imageResizer } from '../conversion/image';


test('should resize an image to a maximum height or width', async () => {
  const max_hw = 1024;
  const format: keyof sharp.FormatEnum = 'jpeg';
  const imageFile = fs.readFileSync(path.join(__dirname, '../../fixtures', 'cat-picture.jpg'));

  const resizer = imageResizer(max_hw, format);

  const resized = sharp(imageFile).pipe(resizer);
  const buffer = await resized.toBuffer();
  const metadata = await sharp(buffer).metadata();

  console.log(metadata);
  resized.toFile('/tmp/cat-picture.jpg');

  expect(metadata.width).to.be.lessThanOrEqual(max_hw);
  expect(metadata.height).to.be.lessThanOrEqual(max_hw);
  expect(metadata.format).to.equal(format);

});

// https://github.com/becomposable/studio/issues/432 Skip tests
// function `pdfToImage` does not exist anymore
//
// test('should convert a pdf to image', async () => {
//   const max_hw = 1024;
//   const format: keyof sharp.FormatEnum = 'png';
//   const pdfFile = fs.readFileSync(path.join(__dirname, '../../fixtures', 'test-pdf1.pdf'));

//   const images = await pdfToImage(pdfFile, { pages: [1], format, max_hw });
//   const image = images[0];
//   const resized = sharp(image).pipe(imageResizer(max_hw, format));
//   const metadata = await sharp(await resized.toBuffer()).metadata();

//   //write to file for manual inspection
//   console.log(metadata);
//   await resized.toFile('/tmp/test-pdf1.jpg');

//   console.log(metadata);
//   expect(metadata.width).to.be.lessThanOrEqual(max_hw);
//   expect(metadata.height).to.be.lessThanOrEqual(max_hw);
//   expect(metadata.format).to.equal(format);


// });
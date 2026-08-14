import test from 'node:test';
import assert from 'node:assert/strict';
import { canonicalizeMediaInput, extractDirectMediaUrl } from '../src/utils/mediaInput.ts';

const image = 'https://cdn.imgurl.ir/uploads/n378546_IMG_3316.webp';

test('accepts the ImgURL download link directly', () => {
  assert.equal(extractDirectMediaUrl(image, 'image'), image);
});

test('extracts src from HTML/JSX image markup', () => {
  assert.equal(extractDirectMediaUrl(`<img src="${image}" alt="توضیح عکس" />`, 'image'), image);
});

test('extracts the download image and ignores the ImgURL attribution link', () => {
  const pasted = `لینک دانلود\n${image}\nلینک به ما\nباتشکر از <a href="https://imgurl.ir">imgurl</a>`;
  assert.equal(extractDirectMediaUrl(pasted, 'image'), image);
});

test('does not treat an attribution homepage or executable scheme as an image', () => {
  assert.equal(extractDirectMediaUrl('باتشکر از <a href="https://imgurl.ir">imgurl</a>', 'image'), '');
  assert.equal(extractDirectMediaUrl('<img src="javascript:alert(1)">', 'image'), '');
});

test('canonicalizes image markup to its safe direct URL', () => {
  assert.equal(canonicalizeMediaInput(`<img src="${image}" />`, 'image'), image);
});

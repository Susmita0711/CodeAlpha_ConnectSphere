import test from 'node:test';
import assert from 'node:assert/strict';
import { isValidEmail, isValidRoomId, safeFileName } from '../src/utils/validation.js';

test('validates email and room identifiers', () => {
  assert.equal(isValidEmail('hello@example.com'), true);
  assert.equal(isValidEmail('not-an-email'), false);
  assert.equal(isValidRoomId('abc_123-DEF'), true);
  assert.equal(isValidRoomId('short'), false);
  assert.equal(isValidRoomId('../files'), false);
});

test('normalizes unsafe uploaded file names', () => {
  assert.equal(safeFileName('../../my report.pdf'), '.._.._my report.pdf');
  assert.equal(safeFileName(''), 'shared-file');
});

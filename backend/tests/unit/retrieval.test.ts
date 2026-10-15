// Workshop starter: faculty and student dashboard code is commented out. The admin dashboard stays active.
// import assert from 'node:assert/strict';
// import { describe, it } from 'node:test';
// import { chunkPages } from '../../src/services/chunk-text';
// import { cosineSimilarity, l2Normalize } from '../../src/services/vectors';
//
// describe('retrieval math', () => {
//   it('normalizes a truncated embedding to unit length', () => {
//     const normalized = l2Normalize([3, 4]);
//     assert.ok(Math.abs(normalized[0]! - 0.6) < 0.000001);
//     assert.ok(Math.abs(normalized[1]! - 0.8) < 0.000001);
//     assert.ok(Math.abs(cosineSimilarity(normalized, normalized) - 1) < 0.000001);
//   });
//
//   it('scores orthogonal vectors at zero', () => {
//     assert.equal(cosineSimilarity([1, 0], [0, 1]), 0);
//   });
//
//   it('splits a long page and keeps the page number', () => {
//     const chunks = chunkPages([{ pageNumber: 2, text: 'a'.repeat(25) }], 10, 2);
//     assert.ok(chunks.length > 1);
//     assert.ok(chunks.every((chunk) => chunk.pageNumber === 2 && chunk.content.length <= 10));
//     assert.equal(chunks[0]?.content, 'aaaaaaaaaa');
//   });
// });

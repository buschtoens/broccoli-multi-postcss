import { flattenArray } from './utils';

test('flattenArray', () => {
  expect(flattenArray([[1, 2, 3], [4, 5, 6]])).toEqual([1, 2, 3, 4, 5, 6]);
  expect(flattenArray([[[1, 2, 3]], [[4, 5, 6]]])).toEqual([
    [1, 2, 3],
    [4, 5, 6]
  ]);
  expect(flattenArray([])).toEqual([]);
  expect(flattenArray([[]])).toEqual([]);
  expect(flattenArray([[], []])).toEqual([]);
  expect(flattenArray([[[]]])).toEqual([[]]);
});

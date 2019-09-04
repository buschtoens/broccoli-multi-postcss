import { matchesFileFilter, matchesFileFilterList } from './file-filter';

test('matchesFileFilter', () => {
  expect(matchesFileFilter('foo')('foo')).toBe(true);
  expect(matchesFileFilter('foo')('bar')).toBe(false);

  expect(matchesFileFilter(/foo/)('foo')).toBe(true);
  expect(matchesFileFilter(/foo/)('bar')).toBe(false);

  expect(matchesFileFilter(fileName => fileName === 'foo')('foo')).toBe(true);
  expect(matchesFileFilter(fileName => fileName === 'foo')('bar')).toBe(false);

  // eslint-disable-next-line @typescript-eslint/ban-ts-ignore
  // @ts-ignore
  expect(() => matchesFileFilter(false)).toThrow(
    `'false' is not a valid 'FileFilter'.`
  );
});

test('matchesFileFilterList', () => {
  expect(matchesFileFilterList(['foo', 'bar'])('foo')).toBe(true);
  expect(matchesFileFilterList(['foo', 'bar'])('bar')).toBe(true);
  expect(matchesFileFilterList(['foo', 'bar'])('qux')).toBe(false);
});

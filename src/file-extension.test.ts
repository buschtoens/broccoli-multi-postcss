import { hasFileExtension, replaceFileExtension } from './file-extension';

test('hasFileExtension', () => {
  expect(hasFileExtension('txt', 'foo.css')).toBe(false);
  expect(hasFileExtension('css', 'foo.css')).toBe(true);
  expect(hasFileExtension('css', 'foo.css.bar')).toBe(false);
  expect(hasFileExtension('bar', 'foo.css.bar')).toBe(true);
  expect(hasFileExtension('foo', 'foo')).toBe(false);
});

test('replaceFileExtension', () => {
  expect(replaceFileExtension('css', 'foo.sass')).toBe('foo.css');
  expect(replaceFileExtension('txt', 'foo.css')).toBe('foo.txt');
  expect(replaceFileExtension('css', 'foo.bar.sass')).toBe('foo.bar.css');
  expect(() => replaceFileExtension('css', 'foo')).toThrowError(
    `'foo' is missing a file extension.`
  );
});

/**
 * Whether `filename` ends with the file extension `extension .
 */
export const hasFileExtension = (extension: string, fileName: string) =>
  fileName.endsWith(`.${extension}`);

/**
 * Replaces the final file extension in `fileName` with `newExtension`.
 * If `fileName` has no file extension, a `TypeError` is thrown.
 *
 * @example replaceFileExtension('css', 'foo.sass') => 'foo.css'
 * @example replaceFileExtension('css', 'foo.bar.sass') => 'foo.bar.css'
 */
export function replaceFileExtension(newExtension: string, fileName: string) {
  const lastDotIdx = fileName.lastIndexOf('.');
  if (lastDotIdx < 0)
    throw new TypeError(`'${fileName}' is missing a file extension.`);
  const withoutExtension = fileName.slice(0, lastDotIdx);
  return `${withoutExtension}.${newExtension}`;
}

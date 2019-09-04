export type FileFilter = string | RegExp | ((filename: string) => boolean);

export type FileFilterList = FileFilter[];

export function matchesFileFilter(filter: FileFilter) {
  if (typeof filter === 'string')
    return (fileName: string) => fileName === filter;

  if (filter instanceof RegExp)
    return (fileName: string) => filter.test(fileName);

  if (typeof filter === 'function')
    return (fileName: string) => filter(fileName);

  throw new TypeError(`'${filter}' is not a valid 'FileFilter'.`);
}

export function matchesFileFilterList(list: FileFilterList) {
  const filters = list.map(matchesFileFilter);
  return (fileName: string) => filters.some(filter => filter(fileName));
}

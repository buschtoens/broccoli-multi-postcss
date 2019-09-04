/**
 * Flattens a two-dimensional array.
 *
 * Would be using `.flat()` here, but it's not supported in Node 8.
 */
export const flattenArray = <U>(array: U[][]) => ([] as U[]).concat(...array);

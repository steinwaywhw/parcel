// @flow
export * from './assets';
export * from './options';

export function nthIndex(str: string, pat: string, n: number): number {
  var length = str.length,
    i = -1;
  while (n-- && i++ < length) {
    i = str.indexOf(pat, i);
    if (i < 0) break;
  }
  return i;
}

export const ctrlKey: string = navigator.platform.includes('Mac')
  ? '⌘'
  : 'Ctrl';

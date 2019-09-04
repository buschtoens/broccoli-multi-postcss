import { writeFile as _writeFile, readFile as _readFile } from 'fs';
import { promisify } from 'util';

// Normally we'd use `fs.promises`, but it's not available in Node 8.

export const writeFile = promisify(_writeFile);
export const readFile = promisify(_readFile);

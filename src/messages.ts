import { ResultMessage } from 'postcss';

import { FileToWrite } from './types';

export enum MessageType {
  WriteFile = 'broccoli-write-file',
  Dependency = 'broccoli-dependency'
}

export interface WriteFileMessage extends ResultMessage, FileToWrite {
  type: MessageType.WriteFile;
}

export interface DependencyMessage extends ResultMessage {
  type: MessageType.Dependency;
  path: string;
}

export function isWriteFileMessage(
  message: ResultMessage
): message is WriteFileMessage {
  if (message.type === MessageType.WriteFile) {
    if (typeof message.path !== 'string' || message.path.length === 0)
      throw new TypeError(`'WriteFileMessage' is missing a valid 'path'.`);
    if (
      typeof message.content !== 'string' &&
      !Buffer.isBuffer(message.content)
    )
      throw new TypeError(`'WriteFileMessage' is missing valid 'content'.`);
    return true;
  }
  return false;
}

export function isDependencyMessage(
  message: ResultMessage
): message is DependencyMessage {
  if (message.type === MessageType.Dependency) {
    if (typeof message.path !== 'string' || message.path.length === 0)
      throw new TypeError(`'DependencyMessage' is missing a valid 'path'.`);
  }
  return false;
}

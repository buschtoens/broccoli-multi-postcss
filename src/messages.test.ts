import {
  isWriteFileMessage,
  MessageType,
  isDependencyMessage
} from './messages';

test('isWriteFileMessage', () => {
  expect(isWriteFileMessage({ plugin: 'foo', type: 'foo' })).toBe(false);
  expect(() =>
    isWriteFileMessage({
      plugin: 'foo',
      type: MessageType.WriteFile,
      content: ''
    })
  ).toThrow(`'WriteFileMessage' is missing a valid 'path'.`);
  expect(() =>
    isWriteFileMessage({
      plugin: 'foo',
      type: MessageType.WriteFile,
      path: '',
      content: ''
    })
  ).toThrow(`'WriteFileMessage' is missing a valid 'path'.`);
  expect(() =>
    isWriteFileMessage({
      plugin: 'foo',
      type: MessageType.WriteFile,
      path: 'foo'
    })
  ).toThrow(`'WriteFileMessage' is missing valid 'content'.`);
  expect(() =>
    isWriteFileMessage({
      plugin: 'foo',
      type: MessageType.WriteFile,
      path: 'foo',
      content: null
    })
  ).toThrow(`'WriteFileMessage' is missing valid 'content'.`);
  expect(
    isWriteFileMessage({
      plugin: 'foo',
      type: MessageType.WriteFile,
      path: 'foo',
      content: ''
    })
  ).toBe(true);
  expect(
    isWriteFileMessage({
      plugin: 'foo',
      type: MessageType.WriteFile,
      path: 'foo',
      content: Buffer.alloc(1)
    })
  ).toBe(true);
});

test('isDependencyMessage', () => {
  expect(isDependencyMessage({ plugin: 'foo', type: 'foo' })).toBe(false);
  expect(() =>
    isDependencyMessage({
      plugin: 'foo',
      type: MessageType.Dependency
    })
  ).toThrow(`'DependencyMessage' is missing a valid 'path'.`);
  expect(() =>
    isDependencyMessage({
      plugin: 'foo',
      type: MessageType.Dependency,
      path: ''
    })
  ).toThrow(`'DependencyMessage' is missing a valid 'path'.`);
  expect(
    isDependencyMessage({
      plugin: 'foo',
      type: MessageType.Dependency,
      path: 'foo'
    })
  ).toBe(true);
});

import { resolve } from 'path';

import { fromDir, createBuilder } from 'broccoli-test-helper';
import { plugin } from 'postcss';

import { BroccoliMultiPostCSS } from './broccoli-multi-postcss';
import { MessageType } from './messages';

describe('BroccoliMultiPostCSS', () => {
  test('extract selectors', async () => {
    const extractSelectorsPlugin = plugin('extract-selectors', () => {
      return (root, result) => {
        const selectors: string[] = [];
        root.walkRules(rule => {
          selectors.push(rule.selector);
        });

        if (!result.opts)
          throw new TypeError('Expected `result.opts` to be present.');

        const metadata = { selectors, fileName: result.opts.to };

        result.messages.push({
          type: MessageType.WriteFile,
          plugin: 'selector-metadata',
          path: `${result.opts.to}.meta.json`,
          content: JSON.stringify(metadata)
        });
      };
    });
    const fixtures = fromDir(resolve(__dirname, '__fixtures__'));
    const tree = new BroccoliMultiPostCSS([fixtures.path()], {
      plugins: [{ module: extractSelectorsPlugin }]
    });
    const builder = createBuilder(tree);
    await builder.build();
    expect(builder.read()).toEqual({
      'foo.css': '.test {\n}\n',
      'foo.css.meta.json': '{"selectors":[".test"],"fileName":"foo.css"}'
    });
    await builder.dispose();
  });
});

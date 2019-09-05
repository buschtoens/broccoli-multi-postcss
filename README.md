# broccoli-multi-postcss

[![Build Status](https://github.com/buschtoens/broccoli-multi-postcss/workflows/Node%20CI/badge.svg)](https://github.com/buschtoens/broccoli-multi-postcss/actions)
[![npm version](https://badge.fury.io/js/broccoli-multi-postcss.svg)](http://badge.fury.io/js/broccoli-multi-postcss)
[![Download Total](https://img.shields.io/npm/dt/broccoli-multi-postcss.svg)](http://badge.fury.io/js/broccoli-multi-postcss)
[![code style: prettier](https://img.shields.io/badge/code_style-prettier-ff69b4.svg)](https://github.com/prettier/prettier)
[![Dependabot enabled](https://img.shields.io/badge/dependabot-enabled-blue.svg?logo=dependabot)](https://dependabot.com/)
[![dependencies Status](https://david-dm.org/buschtoens/broccoli-multi-postcss/status.svg)](https://david-dm.org/buschtoens/broccoli-multi-postcss)
[![devDependencies Status](https://david-dm.org/buschtoens/broccoli-multi-postcss/dev-status.svg)](https://david-dm.org/buschtoens/broccoli-multi-postcss?type=dev)

**Broccoli plugin to transform one or more input files using PostCSS to one or
more output files.**

It's like [`broccoli-postcss`][broccoli-postcss], but allows you consume more
than once input file at once. It also allows you to generate additional
secondary output files.

[broccoli-postcss]: https://github.com/jeffjewiss/broccoli-postcss

## Installation

```
yarn add broccoli-multi-postcss
```

## Usage

```ts
import BroccoliMultiPostCSS from 'broccoli-multi-postcss';
import { plugin } from 'postcss';

const myPlugin = plugin('selector-metadata', options => {
  return (root, result) => {
    const selectors: string[] = [];
    root.walkRules(rule => {
      selectors.push(rule.selector);
    });

    const metadata = { selectors, fileName: result.opts.to };

    result.messages.push({
      type: MessageType.WriteFile,
      plugin: 'selector-metadata',
      path: `${result.opts.to}.meta.json`,
      content: JSON.stringify(metadata)
    });
  };
});

const tree = new BroccoliMultiPostCSS(['./styles'], { plugins: [myPlugin] });
```

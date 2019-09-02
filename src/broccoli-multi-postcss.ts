import BroccoliMultifilter from 'broccoli-multifilter';

class BroccoliMultiPostCSS extends BroccoliMultifilter {
  build(): Promise<unknown> {
    throw new Error('Method not implemented.');
  }
}

export = BroccoliMultiPostCSS;

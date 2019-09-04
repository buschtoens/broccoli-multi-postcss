import { cpus } from 'os';
import { join, delimiter as pathDelimiter } from 'path';

import BroccoliMultifilter from 'broccoli-multifilter';
import { BroccoliNode, BroccoliPluginOptions } from 'broccoli-plugin';
import { Plugin, ProcessOptions } from 'postcss';
import recursiveReaddir from 'recursive-readdir';

import { writeFile, readFile } from './async-fs';
import { hasFileExtension, replaceFileExtension } from './file-extension';
import { FileFilterList, matchesFileFilterList } from './file-filter-list';
import { flattenArray } from './utils';

type Encoding = 'utf8' | null;

interface ObjectFormPlugin<T = Record<string, any>> {
  module: Plugin<T>;
  options?: T;
}

interface BroccoliMultiPostCSSOptions
  extends Pick<BroccoliPluginOptions, 'name' | 'annotation'>,
    Exclude<ProcessOptions, 'from' | 'to'> {
  /**
   * An array of file extensions to process.
   *
   * @example ['css', 'scss', 'sass']
   * @default ['css']
   */
  extensions?: string[];

  /**
   * The file extension of the corresponding output files.
   * To keep the original file extension, pass `null` or leave this empty. This
   * is useful, when you have multiple input `extensions`.
   *
   * @example '.css'
   */
  targetExtension?: string | null;

  /**
   * Whitelist of files to be processed.
   *
   * In the case when a file matches the `include` list, but its extension does
   * not match the `extension` list, the `include` wins.
   *
   * Added for convenience and compatibility with `broccoli-postcss`.
   */
  include?: FileFilterList;

  /**
   * Blacklist of files to not be processed.
   *
   * In the case when a file matches both an `include` and `exclude` pattern,
   * the `exclude` pattern wins.
   *
   * Added for convenience and compatibility with `broccoli-postcss`.
   */
  exclude?: FileFilterList;

  /**
   * The character encoding used for reading input files to be processed.
   * For binary files, pass `null` to receive a `Buffer` object in
   * `processString`.
   *
   * @default 'utf8'
   */
  inputEncoding?: Encoding;

  /**
   * The character encoding used for writing output files after processing.
   * For binary files, pass `null` and return a `Buffer` object from
   * `processString`.
   *
   * @default 'utf8'
   */
  outputEncoding?: Encoding;

  /**
   * The number of operations that can be run concurrently. This overrides the
   * value set with the `JOBS=n` environment variable.
   *
   * @default the number of detected CPU cores - 1, with a min of 1
   */
  concurrency?: number;

  /**
   * The name of this plugin. Defaults to `this.constructor.name`.
   */
  // name?: BroccoliPluginOptions['name'];

  /**
   * A descriptive annotation. Useful for debugging, to tell multiple
   * instances of the same plugin apart.
   */
  // annotation?: BroccoliPluginOptions['annotation'];

  /**
   * A list of plugin objects to be used by Postcss (a minimum of 1 plugin is
   * required).
   */
  plugins: ObjectFormPlugin[];

  /**
   * A list of browsers to support. Follows the browserslist format. Will be
   * passed to each plugin and can be overridden using the plugin’s options.
   */
  browsers?: string[];
}

const DEFAULT_OPTIONS: Required<
  Omit<
    BroccoliMultiPostCSSOptions,
    | 'name'
    | 'annotation'
    | 'include'
    | 'exclude'
    | keyof ProcessOptions
    | 'plugins'
    | 'browsers'
  >
> = {
  extensions: ['css'],
  targetExtension: null,
  inputEncoding: 'utf8',
  outputEncoding: 'utf8',
  concurrency: (() => {
    if (process.env.JOBS) {
      const parsed = Number.parseInt(process.env.JOBS, 10);
      if (Number.isSafeInteger(parsed)) return parsed;
      console.warn(
        `JOBS='${process.env.JOBS}' was specified, but could not be parsed as an integer. Falling back to CPU count.`
      );
    }
    return Math.max(1, cpus().length - 1);
  })()
};

interface ProcessingResult {
  destinationPath?: string;
}

class BroccoliMultiPostCSS extends BroccoliMultifilter {
  protected readonly options: BroccoliMultiPostCSSOptions &
    typeof DEFAULT_OPTIONS;

  private readonly matchesIncludeList?: (fileName: string) => boolean;
  private readonly matchesExcludeList?: (fileName: string) => boolean;

  constructor(
    inputNodes: BroccoliNode[] | BroccoliNode,
    options: BroccoliMultiPostCSSOptions
  ) {
    super(Array.isArray(inputNodes) ? inputNodes : [inputNodes], options);
    this.options = { ...DEFAULT_OPTIONS, ...options };

    if (this.options.plugins.length === 0)
      throw new TypeError(
        `You must provide at least one plugin to the 'plugins' array`
      );

    if (this.options.include)
      this.matchesIncludeList = matchesFileFilterList(this.options.include);

    if (this.options.exclude)
      this.matchesExcludeList = matchesFileFilterList(this.options.exclude);
  }

  /**
   * Whether this file should be processed by PostCSS. All files in the
   * `inputNodes` are always available during the processing. This method just
   * determines whether this file should be processed individually by PostCSS.
   */
  protected shouldProcessFile(relativePath: string): boolean {
    if (this.matchesExcludeList && !this.matchesExcludeList(relativePath))
      return false;

    if (this.matchesIncludeList)
      if (this.matchesIncludeList(relativePath)) return true;
      // `include` has precedence over `extensions`
      else return false;

    if (
      !this.options.extensions.some(extension =>
        hasFileExtension(extension, relativePath)
      )
    )
      return false;

    return true;
  }

  /**
   * Recursively reads all `inputPaths` and returns all files as a flattened
   * array.
   */
  private async readInputPaths(): Promise<
    {
      absolutePath: string;
      relativePath: string;
      tokenizedPath: string;
    }[]
  > {
    return flattenArray(
      await Promise.all(
        this.inputPaths.map(async inputPath =>
          (await recursiveReaddir(inputPath)).map(relativePath => {
            const absolutePath = join(inputPath, relativePath);
            return {
              absolutePath,
              relativePath,
              // This is required, because `buildAndCache` only accepts strings
              // as tokens.
              // Ideally, we would pass the `{ absolutePath, relativePath }`
              // object.
              tokenizedPath: `${absolutePath}${pathDelimiter}${relativePath}`
            };
          })
        )
      )
    );
  }

  /**
   * Returns the `absolutePath` and `relativePath` of a `tokenizedPath`.
   *
   * This is required, because `buildAndCache` unfortunately
   */
  private destructureTokenizedPath(tokenizedPath: string) {
    const [absolutePath, relativePath] = tokenizedPath.split(pathDelimiter, 2);
    return { absolutePath, relativePath };
  }

  /**
   * Invoked to determine the destination file name for every transformed file.
   *
   * The default implementation first checks, whether the result has a
   * `destinationPath` property and uses it, if present.
   *
   * If not, it will take the original file name and replace the file extension
   * with `targetExtension`, if set.
   *
   * If not, it will just keep the original file name.
   */
  protected getDestinationPath(
    relativePath: string,
    result: ProcessingResult
  ): string {
    if (result.destinationPath) return result.destinationPath;
    if (this.options.targetExtension)
      return replaceFileExtension(this.options.targetExtension, relativePath);
    return relativePath;
  }

  protected async processFile(
    tokenizedPath: string,
    outputDirectory: string
  ): Promise<{ dependencies: string[] }> {
    const { absolutePath, relativePath } = this.destructureTokenizedPath(
      tokenizedPath
    );

    const content = await readFile(absolutePath, this.options.inputEncoding);

    const result: ProcessingResult = {};

    const outputPath = join(
      outputDirectory,
      this.getDestinationPath(relativePath, result)
    );
    await writeFile(outputPath, content, this.options.outputEncoding);

    return { dependencies: [absolutePath] };
  }

  async build(): Promise<void> {
    const inputFiles = await this.readInputPaths();
    const filesToBeProcessed = inputFiles.filter(file =>
      this.shouldProcessFile(file.relativePath)
    );
    await this.buildAndCache(
      filesToBeProcessed.map(file => file.tokenizedPath),
      this.processFile
    );
  }
}

export = BroccoliMultiPostCSS;

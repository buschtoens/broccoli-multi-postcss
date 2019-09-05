import { cpus } from 'os';
import { join, delimiter as pathDelimiter, relative } from 'path';

import BroccoliMultifilter from 'broccoli-multifilter';
import { BroccoliNode, BroccoliPluginOptions } from 'broccoli-plugin';
import postcss, { Plugin, ProcessOptions, Processor } from 'postcss';
import recursiveReaddir from 'recursive-readdir';

import { writeFile, readFile } from './async-fs';
import { hasFileExtension, replaceFileExtension } from './file-extension';
import { FileFilterList, matchesFileFilterList } from './file-filter';
import { isDependencyMessage, isWriteFileMessage } from './messages';
import { FileToWrite } from './types';
import { flattenArray } from './utils';

type Encoding = 'utf8' | null;

interface ObjectFormPlugin<T = Record<string, unknown>> {
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

interface BroccoliMultiPostCSSProcessorOptions extends ProcessOptions {
  readonly inputDirectory: string;
  readonly inputDirectories: readonly string[];
  readonly absolutePath: string;
}

export class BroccoliMultiPostCSS extends BroccoliMultifilter {
  protected readonly options: BroccoliMultiPostCSSOptions &
    typeof DEFAULT_OPTIONS;

  private readonly processor: Processor;

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

    this.processor = postcss(
      this.options.plugins.map(plugin => plugin.module(plugin.options))
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
          (await recursiveReaddir(inputPath)).map(absolutePath => {
            const relativePath = relative(inputPath, absolutePath);
            return {
              absolutePath,
              relativePath,
              // This is required, because `buildAndCache` only accepts strings
              // as tokens.
              // Ideally, we would pass the `{ absolutePath, relativePath }`
              // object.
              tokenizedPath: [absolutePath, inputPath, relativePath].join(
                pathDelimiter
              )
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
    const [absolutePath, inputDirectory, relativePath] = tokenizedPath.split(
      pathDelimiter,
      3
    );
    return { absolutePath, inputDirectory, relativePath };
  }

  /**
   * Invoked to determine the destination file name for every transformed file.
   * Takes the original file name and replaces the file extension with
   * `targetExtension`, if set.
   * If not, it will just keep the original file name.
   *
   * You can also change the `opts.to` property from one of your plugins.
   */
  protected getDestinationPath(relativePath: string): string {
    if (this.options.targetExtension)
      return replaceFileExtension(this.options.targetExtension, relativePath);
    return relativePath;
  }

  protected getProcessOptions({
    absolutePath,
    inputDirectory,
    relativePath
  }: {
    absolutePath: string;
    inputDirectory: string;
    relativePath: string;
  }): BroccoliMultiPostCSSProcessorOptions {
    return {
      from: relativePath,
      to: this.getDestinationPath(relativePath),
      absolutePath,
      inputDirectory,
      inputDirectories: this.inputPaths
    };
  }

  protected async buildFile(
    tokenizedPath: string,
    outputDirectory: string
  ): Promise<{ dependencies: string[] }> {
    const {
      absolutePath,
      inputDirectory,
      relativePath
    } = this.destructureTokenizedPath(tokenizedPath);

    const inContent = await readFile(absolutePath, this.options.inputEncoding);
    const options = this.getProcessOptions({
      absolutePath,
      inputDirectory,
      relativePath
    });

    const result = await this.processor.process(inContent, options);

    if (!result.opts || !result.opts.to)
      throw new TypeError('Missing `opts.to`.');

    const additionalFiles = result.messages.filter(isWriteFileMessage);
    const filesToWrite: FileToWrite[] = [
      { path: result.opts.to, content: result.css },
      ...additionalFiles
    ];

    await Promise.all(
      filesToWrite.map(
        async ({ path, content, encoding = this.options.outputEncoding }) => {
          const outputPath = join(outputDirectory, path);
          await writeFile(outputPath, content, encoding);
        }
      )
    );

    const additionalDependencies = result.messages
      .filter(isDependencyMessage)
      .map(message => message.path);

    return { dependencies: [absolutePath, ...additionalDependencies] };
  }

  async build(): Promise<void> {
    const inputFiles = await this.readInputPaths();
    const filesToBeProcessed = inputFiles.filter(file =>
      this.shouldProcessFile(file.relativePath)
    );
    await this.buildAndCache(
      filesToBeProcessed.map(file => file.tokenizedPath),
      this.buildFile
    );
  }
}

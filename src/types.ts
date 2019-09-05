export type Encoding = 'utf8' | null;

export interface FileToWrite {
  path: string;
  content: string | Buffer;
  encoding?: Encoding;
}

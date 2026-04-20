declare module "diff-match-patch" {
  export const DIFF_DELETE: -1;
  export const DIFF_INSERT: 1;
  export const DIFF_EQUAL: 0;

  export default class diff_match_patch {
    diff_main(text1: string, text2: string): Array<[number, string]>;
    diff_cleanupSemantic(diffs: Array<[number, string]>): void;
  }
}

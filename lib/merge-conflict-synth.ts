import DiffMatchPatch from "diff-match-patch";

const DMP_DIFF_DELETE = -1;
const DMP_DIFF_EQUAL = 0;
const DMP_DIFF_INSERT = 1;

const dmpSingleton = new DiffMatchPatch();

export type MergeConflictFile = {
  name: string;
  contents: string;
};

function buildConflictRegion(local: string, incoming: string): string {
  return `<<<<<<< HEAD\n${local}\n=======\n${incoming}\n>>>>>>> import\n`;
}

export function buildFieldMergeConflictFile(
  local: string,
  incoming: string,
  name: string,
): MergeConflictFile {
  const raw = dmpSingleton.diff_main(local, incoming);
  dmpSingleton.diff_cleanupSemantic(raw);

  let contents = "";

  for (let i = 0; i < raw.length; i += 1) {
    const pair = raw[i];
    if (!pair) continue;
    const [op, text] = pair;
    if (!text) continue;

    if (op === DMP_DIFF_EQUAL) {
      contents += text;
      continue;
    }

    let localChunk = "";
    let incomingChunk = "";

    for (let j = i; j < raw.length; j += 1) {
      const current = raw[j];
      if (!current) continue;
      const [currentOp, currentText] = current;
      if (!currentText) continue;
      if (currentOp === DMP_DIFF_EQUAL) break;
      if (currentOp === DMP_DIFF_DELETE) {
        localChunk += currentText;
      } else if (currentOp === DMP_DIFF_INSERT) {
        incomingChunk += currentText;
      }
      i = j;
    }

    if (localChunk.length === 0 && incomingChunk.length === 0) continue;
    contents += buildConflictRegion(localChunk, incomingChunk);
  }

  return { name, contents };
}

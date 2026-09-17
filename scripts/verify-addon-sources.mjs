import { readdir, readFile } from "node:fs/promises";
import path from "node:path";

const root = process.cwd();

const directoryPairs = [
  ["packages/core/src", "hassio-addon/classeviva-bot/src/packages/core/src"],
  ["packages/core/src", "hassio-addon/classeviva-ui/src/packages/core/src"],
  ["packages/bot/src", "hassio-addon/classeviva-bot/src/packages/bot/src"],
];

async function filesIn(directory) {
  const absolute = path.join(root, directory);
  const entries = await readdir(absolute, { withFileTypes: true });
  const files = await Promise.all(
    entries.map(async (entry) => {
      const relative = path.join(directory, entry.name);
      if (entry.isDirectory()) return filesIn(relative);
      return [relative];
    }),
  );
  return files.flat();
}

async function sameFile(left, right) {
  const [leftContent, rightContent] = await Promise.all([
    readFile(path.join(root, left)),
    readFile(path.join(root, right)),
  ]);
  return leftContent.equals(rightContent);
}

const differences = [];

for (const [source, copy] of directoryPairs) {
  const sourceFiles = await filesIn(source);
  const copyFiles = await filesIn(copy);
  const sourceRelative = sourceFiles.map((file) => path.relative(source, file));
  const copyRelative = copyFiles.map((file) => path.relative(copy, file));
  const expected = new Set(sourceRelative);
  const actual = new Set(copyRelative);

  for (const relative of new Set([...expected, ...actual])) {
    if (!expected.has(relative) || !actual.has(relative)) {
      differences.push(`${copy}: struttura diversa per ${relative}`);
      continue;
    }
    if (!(await sameFile(path.join(source, relative), path.join(copy, relative)))) {
      differences.push(`${copy}: contenuto diverso per ${relative}`);
    }
  }
}

if (differences.length > 0) {
  console.error("Sorgenti degli add-on non sincronizzati:");
  for (const difference of differences) console.error(`- ${difference}`);
  process.exitCode = 1;
} else {
  console.log("Sorgenti degli add-on sincronizzati.");
}

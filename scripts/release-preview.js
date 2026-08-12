import { writeFile } from "node:fs/promises";
import semanticRelease from "semantic-release";

const branch = process.env.HEAD_REF;
const outPath = process.argv[2];

if (!branch || !outPath) {
  console.error(
    "usage: HEAD_REF=<branch> node scripts/release-preview.js <outfile>",
  );
  process.exit(1);
}

process.env.GITHUB_EVENT_NAME = "push";
process.env.GITHUB_REF = `refs/heads/${branch}`;

const result = await semanticRelease({
  dryRun: true,
  ci: false,
  branches: [branch],
});

const next = result?.nextRelease;

const body = next
  ? `<!-- release-preview -->
### Release preview: \`v${next.version}\`

${next.notes}`
  : `<!-- release-preview -->
### Release preview

No release would be cut from this branch — most likely because no commit since the
last tag carries a releasing type (\`feat\`, \`fix\`, \`perf\`, \`refactor\`, or \`chore(deps)\`).

semantic-release also reports no release when it short-circuits for other reasons, so
if that looks wrong, check the \`Compute release preview\` step's log for the reason.`;

await writeFile(outPath, body);
console.log(next ? `next version: ${next.version}` : "no release");

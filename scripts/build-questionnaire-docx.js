/** Build or export a versioned readiness questionnaire. */
const { execFileSync } = require("child_process");
const fs = require("fs");
const os = require("os");
const path = require("path");

const args = process.argv.slice(2);
const valueAfter = (flag, fallback) => {
  const index = args.indexOf(flag);
  return index >= 0 ? args[index + 1] : fallback;
};
const locale = valueAfter("--locale", args.includes("en") ? "en" : "ko") === "en" ? "en" : "ko";
const version = valueAfter("--version", "4.0") === "5.0" ? "5.0" : "4.0";
const out = args.includes("--json")
  ? "--json"
  : args.find((arg, index) => !arg.startsWith("--") && ![args.indexOf("--locale") + 1, args.indexOf("--version") + 1].includes(index));
if (!out) throw new Error("출력 경로 또는 --json을 인자로 주세요.");

const root = path.resolve(__dirname, "..");
const bundle = path.join(os.tmpdir(), `intake-${process.pid}.cjs`);
execFileSync(path.join(root, "node_modules/.bin/esbuild"), [
  path.join(root, "lib/intake-questions.ts"),
  "--bundle", "--format=cjs", "--platform=node", `--outfile=${bundle}`
]);
const { getIntakeStages, getIntakeItems, getIntakeQuestions } = require(bundle);
fs.unlinkSync(bundle);
const catalog = {
  version,
  stages: getIntakeStages(locale),
  items: getIntakeItems(locale),
  questions: getIntakeQuestions(locale, version)
};

if (out === "--json") {
  process.stdout.write(JSON.stringify(catalog));
  process.exit(0);
}

execFileSync(process.env.PYTHON_BIN || "python3", [
  path.join(root, "scripts/render-questionnaire-docx.py"),
  out,
  locale,
  "--version",
  version,
  "--node",
  process.execPath
], { stdio: "inherit" });

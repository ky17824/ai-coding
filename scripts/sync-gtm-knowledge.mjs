import { createHash } from "node:crypto";
import { promises as fs } from "node:fs";
import path from "node:path";
import OpenAI, { toFile } from "openai";

const DEFAULT_VAULT = "/Users/kyuhwangyeon/Library/Mobile Documents/com~apple~CloudDocs/Obsidian Vault/GlobalGoToMarket";
const MANIFEST = path.resolve(".gtm-knowledge-manifest.json");
const apply = process.argv.includes("--apply");
const vault = process.env.GTM_VAULT_PATH || DEFAULT_VAULT;
const allowedRoots = ["methodology/", "templates/", "checklists/", "industries/"];
const allowedFiles = new Set(["SCHEMA.md", "GTM Resource Index.md"]);
const excludedRoots = ["_archive/", ".omc/", "raw/", "Startups/", "Assessments/", "Cases/", "Action Plans/"];
const excludedFiles = new Set(["log.md", ".DS_Store"]);

async function walk(directory) {
  const entries = await fs.readdir(directory, { withFileTypes: true });
  const files = await Promise.all(entries.map((entry) => {
    const target = path.join(directory, entry.name);
    return entry.isDirectory() ? walk(target) : target;
  }));
  return files.flat();
}

function isAllowed(relative, content) {
  const normalized = relative.split(path.sep).join("/");
  if (!normalized.endsWith(".md") || excludedFiles.has(path.basename(normalized))) return false;
  if (excludedRoots.some((root) => normalized.startsWith(root))) return false;
  if (!allowedFiles.has(normalized) && !allowedRoots.some((root) => normalized.startsWith(root))) return false;
  const frontmatter = content.startsWith("---") ? content.split("---", 3)[1] : "";
  return !/^confidentiality:\s*confidential\s*$/im.test(frontmatter);
}

const previous = JSON.parse(await fs.readFile(MANIFEST, "utf8").catch(() => "{}"));
const current = {};
for (const file of await walk(vault)) {
  const relative = path.relative(vault, file);
  const content = await fs.readFile(file, "utf8");
  if (!isAllowed(relative, content)) continue;
  current[relative] = {
    sha256: createHash("sha256").update(content).digest("hex"),
    content
  };
}

const changed = Object.keys(current).filter((key) => current[key].sha256 !== previous[key]?.sha256);
const removed = Object.keys(previous).filter((key) => !current[key]);
console.log(`GTM knowledge: ${Object.keys(current).length} files, ${changed.length} changed, ${removed.length} removed.`);
for (const key of [...changed, ...removed]) console.log(`${current[key] ? "UPDATE" : "REMOVE"} ${key}`);
if (!apply) {
  console.log("Dry run only. Re-run with --apply to update the vector store.");
  process.exit(0);
}

if (!process.env.OPENAI_API_KEY || !process.env.OPENAI_GTM_VECTOR_STORE_ID) {
  throw new Error("--apply requires OPENAI_API_KEY and OPENAI_GTM_VECTOR_STORE_ID.");
}
const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
const vectorStoreId = process.env.OPENAI_GTM_VECTOR_STORE_ID;
const next = { ...previous };

async function removeRemote(entry) {
  if (!entry?.fileId) return;
  await client.vectorStores.files.delete(entry.fileId, { vector_store_id: vectorStoreId }).catch(() => undefined);
  await client.files.delete(entry.fileId).catch(() => undefined);
}

for (const key of removed) {
  await removeRemote(previous[key]);
  delete next[key];
}
for (const key of changed) {
  await removeRemote(previous[key]);
  const uploaded = await client.files.create({
    file: await toFile(Buffer.from(current[key].content), path.basename(key)),
    purpose: "assistants"
  });
  const attached = await client.vectorStores.files.createAndPoll(vectorStoreId, {
    file_id: uploaded.id,
    attributes: { source_path: key, sha256: current[key].sha256 }
  });
  if (attached.status !== "completed") throw new Error(`Indexing failed: ${key}`);
  next[key] = { sha256: current[key].sha256, fileId: uploaded.id };
}
await fs.writeFile(MANIFEST, `${JSON.stringify(next, null, 2)}\n`);
console.log("GTM knowledge sync complete.");

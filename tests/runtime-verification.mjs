// Opt-in local integration check. Creates only uniquely named temporary records
// and removes those exact IDs in finally. Never run against a shared database.
import assert from "node:assert/strict";
import { createRequire } from "node:module";
import fs from "node:fs";
import vm from "node:vm";
import path from "node:path";
import ts from "typescript";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../src/generated/prisma/client.ts";

if (process.env.PHOENIX_RUNTIME_TEST !== "1") throw new Error("Set PHOENIX_RUNTIME_TEST=1 to explicitly enable temporary local DB tests.");
const require = createRequire(import.meta.url);
const { chromium } = require(process.env.PHOENIX_PLAYWRIGHT_PATH);
const prisma = new PrismaClient({ adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL }) });
const root = path.resolve(import.meta.dirname, "..");
function load(file) {
  const moduleBox = { exports: {} };
  const code = ts.transpileModule(fs.readFileSync(path.join(root, file), "utf8"), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 } }).outputText;
  vm.runInNewContext(code, { module: moduleBox, exports: moduleBox.exports, Date, Intl, require: (id) => {
    if (id === "server-only") return {};
    if (id === "@/lib/prisma") return { prisma };
    if (id.startsWith("@/")) return load(`src/${id.slice(2)}.ts`);
    return require(id);
  } });
  return moduleBox.exports;
}
const db = load("src/lib/db/index.ts");
const base = "http://localhost:3001";
const marker = `Phoenix verification ${crypto.randomUUID()}`;
const noteText = `${marker} note`;
const errors = [];
let browser, taskId;
try {
  browser = await chromium.launch({ channel: "msedge", headless: true });
  const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } });
  page.on("pageerror", (error) => errors.push(error.message));
  const open = async (route) => { await page.goto(base + route); await page.getByRole("heading", { level: 1 }).waitFor(); };
  await open("/");
  const aside = page.locator("aside");
  await aside.getByRole("link", { name: "Tasks", exact: true }).waitFor();
  const toggle = aside.getByRole("button", { name: /Expand sidebar|Collapse sidebar/ });
  await toggle.click();
  await toggle.click();
  assert.equal(await aside.getByRole("link", { name: "Tasks", exact: true }).count(), 1);
  console.log("PASS sidebar named links and manual toggle");

  const input = page.getByRole("textbox", { name: "Quick note", exact: true });
  const add = page.getByRole("button", { name: "Add note", exact: true });
  await input.fill("x".repeat(121)); await add.click();
  await page.getByRole("alert").filter({ hasText: "120 characters" }).waitFor();
  assert.equal((await input.inputValue()).length, 121);
  console.log("PASS Quick Notes overlength preserves input");

  await page.route("**/*", async (route) => {
    if (route.request().method() === "POST") return route.abort("failed");
    return route.continue();
  });
  await input.fill("Failure-safe unsaved text"); await add.click();
  await page.getByRole("alert").filter({ hasText: "Could not save" }).waitFor();
  assert.equal(await input.inputValue(), "Failure-safe unsaved text");
  await page.unroute("**/*");
  console.log("PASS simulated failed Quick Notes request preserves input");

  await input.fill(noteText); await add.click();
  await page.getByText(noteText, { exact: true }).waitFor();
  await page.reload(); await page.getByText(noteText, { exact: true }).waitFor();
  assert.equal(await prisma.note.count({ where: { userId: "demo-user", title: noteText } }), 1);
  console.log("PASS Quick Notes real save and hard refresh");

  const created = await db.createTask({ title: marker, description: "Temporary lifecycle verification", priority: "LOW" });
  taskId = created.id;
  await open("/tasks");
  const taskCard = page.locator("article").filter({ hasText: marker });
  await taskCard.getByRole("button", { name: "Start Task", exact: true }).click();
  await taskCard.getByRole("button", { name: "Complete", exact: true }).waitFor();
  await page.reload(); await taskCard.getByRole("button", { name: "Complete", exact: true }).waitFor();
  assert.equal((await db.getTasks()).find((task) => task.id === taskId).status, "IN_PROGRESS");
  await taskCard.getByRole("button", { name: "Complete", exact: true }).click();
  await taskCard.getByText("Completed", { exact: true }).waitFor();
  const completed = await prisma.task.findUniqueOrThrow({ where: { id: taskId } });
  assert.ok(completed.completedAt);
  await Promise.all([db.updateTaskStatus(taskId, "DONE"), db.updateTaskStatus(taskId, "DONE")]);
  const repeated = await prisma.task.findUniqueOrThrow({ where: { id: taskId } });
  assert.equal(repeated.completedAt.getTime(), completed.completedAt.getTime());
  await page.reload(); await taskCard.getByText("Completed", { exact: true }).waitFor();
  console.log("PASS real task lifecycle, concurrent DONE retry and hard refresh");

  await page.setViewportSize({ width: 390, height: 844 });
  const nav = page.getByRole("navigation", { name: "Mobile navigation" });
  const routes = ["/", "/tasks", "/engineering", "/habits", "/health", "/languages", "/career", "/income", "/mindset", "/resources", "/notes", "/settings"];
  for (const href of routes) {
    const link = nav.locator(`a[href="${href}"]`);
    if (!await link.isVisible()) await nav.getByText("More", { exact: true }).click();
    await link.click(); await page.waitForURL(base + href);
    await page.getByRole("heading", { level: 1 }).waitFor();
    if (!await link.isVisible()) await nav.getByText("More", { exact: true }).click();
    assert.equal(await link.getAttribute("aria-current"), "page");
  }
  console.log("PASS all twelve mobile routes and active states");
  assert.deepEqual(errors, []);
  console.log("PASS no uncaught browser errors");
} finally {
  if (browser) await browser.close();
  if (taskId) await prisma.task.deleteMany({ where: { id: taskId, userId: "demo-user", title: marker } });
  // A note may have been persisted even if the browser lost the response.
  const notes = await prisma.note.findMany({ where: { userId: "demo-user", title: noteText }, select: { id: true } });
  for (const note of notes) await prisma.note.deleteMany({ where: { id: note.id, userId: "demo-user", title: noteText } });
  await prisma.$disconnect();
  console.log("Removed only this run's exact temporary task/note records.");
}

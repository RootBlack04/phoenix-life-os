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
let browser, taskId, optionalTaskId;
let careerTestId;
const nextActionIds = [];
const tasksOnly = process.env.PHOENIX_TASKS_ONLY === "1";
try {
  browser = await chromium.launch({ channel: "msedge", headless: true });
  const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } });
  page.on("pageerror", (error) => errors.push(error.message));
  const open = async (route) => { await page.goto(base + route); await page.getByRole("heading", { level: 1 }).waitFor(); };
  if (process.env.PHOENIX_CAREER_ONLY === "1") {
    const original = await prisma.jobApplication.create({ data: {
      userId: "demo-user", company: marker, role: "Temporary stage verification", stage: "APPLIED",
      appliedOn: new Date("2026-09-01T12:00:00Z"), salary: "Test salary", location: "Test location",
      url: "https://example.com", notes: "Temporary record; keep these fields intact",
    } });
    careerTestId = original.id;
    console.log(`TEMP application ${careerTestId}: ${marker}`);
    const unchangedFields = (record) => Object.fromEntries(Object.entries(record).filter(([key]) => key !== "stage" && key !== "updatedAt"));
    const card = page.locator("article").filter({ hasText: marker });
    const select = card.getByRole("combobox", { name: `Stage for ${marker} — Temporary stage verification`, exact: true });
    await open("/career");
    await select.waitFor();
    assert.deepEqual(await select.locator("option").evaluateAll((options) => options.map((o) => o.value)), ["APPLIED", "INTERVIEW", "OFFER", "REJECTED"]);
    let posts = 0;
    page.on("request", (request) => { if (request.method() === "POST") posts++; });
    await card.getByText(marker, { exact: true }).click();
    await select.focus();
    await select.selectOption("APPLIED");
    assert.equal(posts, 0);
    assert.equal((await prisma.jobApplication.findUniqueOrThrow({ where: { id: careerTestId } })).stage, "APPLIED");
    await page.route("**/*", async (route) => route.request().method() === "POST" ? route.abort("failed") : route.continue());
    await select.selectOption("REJECTED");
    await page.getByRole("alert").filter({ hasText: "Could not save the stage" }).waitFor();
    assert.equal(await select.inputValue(), "APPLIED");
    assert.equal((await prisma.jobApplication.findUniqueOrThrow({ where: { id: careerTestId } })).stage, "APPLIED");
    await page.unroute("**/*");
    console.log("PASS card click/current selection do not mutate; failed save retains APPLIED");
    let releasePost, seenPost;
    const held = new Promise((resolve) => { releasePost = resolve; });
    const seen = new Promise((resolve) => { seenPost = resolve; });
    await page.route("**/*", async (route) => {
      if (route.request().method() === "POST") { seenPost(); await held; }
      await route.continue();
    });
    const before = posts;
    await select.selectOption("OFFER");
    await seen;
    assert.equal(await select.isDisabled(), true);
    assert.equal(await select.inputValue(), "APPLIED");
    await card.getByRole("status").filter({ hasText: "Saving stage" }).waitFor();
    await select.evaluate((element) => { element.value = "REJECTED"; element.dispatchEvent(new Event("change", { bubbles: true })); });
    releasePost();
    await page.waitForFunction((id) => document.getElementById(`stage-${id}`)?.value === "OFFER", careerTestId);
    await page.unroute("**/*");
    assert.equal(posts - before, 1);
    await page.reload(); await select.waitFor();
    assert.equal(await select.inputValue(), "OFFER");
    const saved = await prisma.jobApplication.findUniqueOrThrow({ where: { id: careerTestId } });
    assert.equal(saved.stage, "OFFER");
    assert.deepEqual(unchangedFields(saved), unchangedFields(original));
    assert.equal(await prisma.jobApplication.count({ where: { userId: "demo-user", company: marker } }), 1);
    for (const stage of ["REJECTED", "APPLIED"]) {
      await select.selectOption(stage);
      await page.waitForFunction(({ id, stage }) => document.getElementById(`stage-${id}`)?.value === stage, { id: careerTestId, stage });
      assert.equal((await prisma.jobApplication.findUniqueOrThrow({ where: { id: careerTestId } })).stage, stage);
    }
    console.log("PASS direct OFFER without intermediate writes, pending guard, reverse transitions, hard refresh and unchanged metadata");
    for (const width of [1440, 390]) {
      await page.setViewportSize({ width, height: 900 });
      for (const route of ["/career", "/"]) {
        await open(route);
        assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false);
      }
    }
    await open("/career");
    assert.ok((await select.boundingBox()).height >= 44);
    assert.deepEqual(errors, []);
    console.log("PASS Career/Overview desktop and mobile, 44px select target, no uncaught browser errors");
  } else {
  await open("/");
  const aside = page.locator("aside");
  await aside.getByRole("link", { name: "Tasks", exact: true }).waitFor();
  const toggle = aside.getByRole("button", { name: /Expand sidebar|Collapse sidebar/ });
  await toggle.click();
  await toggle.click();
  assert.equal(await aside.getByRole("link", { name: "Tasks", exact: true }).count(), 1);
  console.log("PASS sidebar named links and manual toggle");

  if (!tasksOnly) {
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
  }

  await open("/tasks");
  const form = page.getByRole("form", { name: "Create Task", exact: true });
  const fillTask = async (title, dueDate = "", priority = "MEDIUM", description = "") => {
    await form.getByLabel("Title", { exact: true }).fill(title);
    await form.getByLabel("Description (optional)", { exact: true }).fill(description);
    await form.getByLabel("Priority", { exact: true }).selectOption(priority);
    await form.getByLabel("Due date (optional)", { exact: true }).fill(dueDate);
  };
  await fillTask("x".repeat(201));
  await form.getByRole("button", { name: "Create Task", exact: true }).click();
  await form.getByRole("alert").filter({ hasText: "200 characters" }).waitFor();
  assert.equal((await form.getByLabel("Title", { exact: true }).inputValue()).length, 201);
  await fillTask(marker, "2026-09-10", "HIGH", "Temporary lifecycle verification");
  await page.route("**/*", async (route) => route.request().method() === "POST" ? route.abort("failed") : route.continue());
  await form.getByRole("button", { name: "Create Task", exact: true }).click();
  await form.getByRole("alert").filter({ hasText: "Could not confirm" }).waitFor();
  assert.equal(await form.getByLabel("Title", { exact: true }).inputValue(), marker);
  assert.equal(await form.getByLabel("Description (optional)", { exact: true }).inputValue(), "Temporary lifecycle verification");
  assert.equal(await form.getByLabel("Due date (optional)", { exact: true }).inputValue(), "2026-09-10");
  assert.equal(await form.getByLabel("Priority", { exact: true }).inputValue(), "HIGH");
  await page.unroute("**/*");
  // Hold the request while verifying the form is disabled; a second submit event
  // must not dispatch another action, even before a re-render.
  let releasePost, postSeen;
  const seen = new Promise((resolve) => { postSeen = resolve; });
  const held = new Promise((resolve) => { releasePost = resolve; });
  let posts = 0;
  await page.route("**/*", async (route) => {
    if (route.request().method() === "POST") { posts++; postSeen(); await held; }
    await route.continue();
  });
  await form.getByRole("button", { name: "Create Task", exact: true }).click();
  await seen;
  assert.equal(await form.getByRole("button", { name: "Creating…", exact: true }).isDisabled(), true);
  await form.evaluate((element) => element.dispatchEvent(new Event("submit", { bubbles: true, cancelable: true })));
  releasePost();
  const taskCard = page.locator("article").filter({ hasText: marker });
  await taskCard.getByRole("button", { name: "Start Task", exact: true }).waitFor();
  await page.unroute("**/*");
  assert.equal(posts, 1);
  const createdRows = await prisma.task.findMany({ where: { userId: "demo-user", title: marker } });
  assert.equal(createdRows.length, 1);
  const created = createdRows[0]; taskId = created.id;
  console.log(`TEMP task ${taskId}: ${marker}`);
  assert.equal(created.status, "PENDING"); assert.equal(created.priority, "HIGH");
  assert.equal(created.dueDate.toISOString(), "2026-09-10T00:00:00.000Z");
  assert.equal(created.completedAt, null);
  assert.equal(await form.getByLabel("Title", { exact: true }).inputValue(), "");
  await taskCard.getByText("Due Sep 10, 2026", { exact: true }).waitFor();
  await page.reload(); await taskCard.getByRole("button", { name: "Start Task", exact: true }).waitFor();
  await taskCard.getByText("Due Sep 10, 2026", { exact: true }).waitFor();
  console.log("PASS manual creation, draft retention, duplicate guard, calendar date, server/hard refresh");
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

  await fillTask(`${marker} optional`);
  await form.getByRole("button", { name: "Create Task", exact: true }).click();
  const optionalCard = page.locator("article").filter({ hasText: `${marker} optional` });
  await optionalCard.getByRole("button", { name: "Start Task", exact: true }).waitFor();
  const optional = await prisma.task.findFirstOrThrow({ where: { userId: "demo-user", title: `${marker} optional` } });
  optionalTaskId = optional.id;
  console.log(`TEMP task ${optionalTaskId}: ${marker} optional`);
  assert.equal(optional.description, null); assert.equal(optional.dueDate, null); assert.equal(optional.priority, "MEDIUM");
  const doneElsewhere = await db.updateTaskStatus(optional.id, "DONE");
  await optionalCard.getByRole("button", { name: "Start Task", exact: true }).click();
  await optionalCard.getByText("Completed", { exact: true }).waitFor();
  const stillDone = await prisma.task.findUniqueOrThrow({ where: { id: optional.id } });
  assert.equal(stillDone.status, "DONE"); assert.equal(stillDone.completedAt.getTime(), doneElsewhere.completedAt.getTime());
  console.log("PASS omitted fields and stale /tasks Start cannot reopen completed work");

  // Exercise Overview selection without changing any pre-existing task.
  const earliest = await prisma.task.aggregate({
    where: { userId: "demo-user", status: { in: ["PENDING", "IN_PROGRESS"] } },
    _min: { dueDate: true },
  });
  const due = new Date(Math.min(earliest._min.dueDate?.getTime() ?? Date.now(), Date.now()) - 86_400_000);
  for (let index = 0; index < 2; index++) {
    await fillTask(`${marker} next ${index}`, due.toISOString().slice(0, 10), "LOW");
    await form.getByRole("button", { name: "Create Task", exact: true }).click();
    await page.locator("article").filter({ hasText: `${marker} next ${index}` }).getByRole("button", { name: "Start Task", exact: true }).waitFor();
    const nextTask = await prisma.task.findFirstOrThrow({ where: { userId: "demo-user", title: `${marker} next ${index}` } });
    nextActionIds.push(nextTask.id);
    console.log(`TEMP task ${nextTask.id}: ${nextTask.title}`);
    await db.updateTaskStatus(nextTask.id, "IN_PROGRESS", "PENDING");
  }
  await open("/");
  const nextCard = page.getByRole("region", { name: "Next Action", exact: true });
  await nextCard.getByText(`${marker} next 0`, { exact: true }).waitFor();
  await nextCard.getByRole("button", { name: "Complete", exact: true }).click();
  await nextCard.getByText(`${marker} next 1`, { exact: true }).waitFor();
  await page.reload();
  await nextCard.getByText(`${marker} next 1`, { exact: true }).waitFor();
  assert.equal((await prisma.task.findUniqueOrThrow({ where: { id: nextActionIds[0] } })).status, "DONE");
  // Simulate another surface completing the displayed task before a stale click.
  const elsewhere = await db.updateTaskStatus(nextActionIds[1], "DONE");
  await nextCard.getByRole("button", { name: "Complete", exact: true }).click();
  await nextCard.getByText(`${marker} next 1`, { exact: true }).waitFor({ state: "hidden" });
  const afterStale = await prisma.task.findUniqueOrThrow({ where: { id: nextActionIds[1] } });
  assert.equal(afterStale.completedAt.getTime(), elsewhere.completedAt.getTime());
  console.log("PASS Next Action completion handoff, hard refresh and stale completion");

  await page.setViewportSize({ width: 390, height: 844 });
  const nav = page.getByRole("navigation", { name: "Mobile navigation" });
  const routes = tasksOnly ? ["/", "/tasks"] : ["/", "/tasks", "/engineering", "/habits", "/health", "/languages", "/career", "/income", "/mindset", "/resources", "/notes", "/settings"];
  for (const href of routes) {
    const link = nav.locator(`a[href="${href}"]`);
    if (!await link.isVisible()) await nav.getByText("More", { exact: true }).click();
    await link.click(); await page.waitForURL(base + href);
    await page.getByRole("heading", { level: 1 }).waitFor();
    if (!await link.isVisible()) await nav.getByText("More", { exact: true }).click();
    assert.equal(await link.getAttribute("aria-current"), "page");
  }
  console.log(`PASS ${routes.length} mobile routes and active states`);
  await open("/tasks");
  assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false);
  await form.getByRole("button", { name: "Create Task", exact: true }).waitFor();
  console.log("PASS Tasks form and groups have no mobile overflow");
  await open("/");
  await page.getByRole("region", { name: "Next Action", exact: true }).waitFor();
  assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false);
  console.log("PASS Next Action mobile layout has no horizontal overflow");
  assert.deepEqual(errors, []);
  console.log("PASS no uncaught browser errors");
  }
} finally {
  if (browser) await browser.close();
  if (careerTestId) {
    const removed = await prisma.jobApplication.deleteMany({ where: { id: careerTestId, userId: "demo-user", company: marker } });
    assert.equal(removed.count, 1);
    console.log(`REMOVED temporary application ${careerTestId}`);
  }
  // Recover exact IDs even if a save succeeded but the browser lost its response.
  const temporary = await prisma.task.findMany({ where: { userId: "demo-user", title: { in: [marker, `${marker} optional`, `${marker} next 0`, `${marker} next 1`] } }, select: { id: true, title: true } });
  for (const task of temporary) {
    await prisma.task.deleteMany({ where: { id: task.id, userId: "demo-user", title: task.title } });
    console.log(`REMOVED temporary task ${task.id}`);
  }
  // A note may have been persisted even if the browser lost the response.
  const notes = await prisma.note.findMany({ where: { userId: "demo-user", title: noteText }, select: { id: true } });
  for (const note of notes) await prisma.note.deleteMany({ where: { id: note.id, userId: "demo-user", title: noteText } });
  await prisma.$disconnect();
  console.log("Removed only this run's exact temporary verification records.");
}

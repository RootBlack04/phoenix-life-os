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
let incomeTestId;
let journalTestId;
let resourceTestId;
let noteSafetyTestId;
const engineeringTestIds = [];
let languageTestId;
let habitTestId;
let healthTestDate, healthTestId;
const healthHistoryTestIds = [];
const nextActionIds = [];
const tasksOnly = process.env.PHOENIX_TASKS_ONLY === "1";
try {
  browser = await chromium.launch({ channel: "msedge", headless: true });
  const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } });
  page.on("pageerror", (error) => errors.push(error.message));
  const open = async (route) => { await page.goto(base + route); await page.getByRole("heading", { level: 1 }).waitFor(); };
  if (process.env.PHOENIX_HABITS_ONLY === "1") {
    const dates = load("src/lib/dates.ts");
    const today = dates.localDateKey(new Date());
    const original = await prisma.habit.create({ data: { userId: "demo-user", name: marker, emoji: "T", target: 7 } });
    habitTestId = original.id;
    const cell = page.getByRole("button", { name: `${marker} ${today}`, exact: true });
    await open("/habits");
    let release, requests = 0;
    const held = new Promise((resolve) => { release = resolve; });
    await page.route("**/*", async (route) => { if (route.request().method() === "POST") { requests++; await held; } await route.continue(); });
    await cell.click(); await cell.dispatchEvent("click"); assert.equal(await cell.getAttribute("aria-pressed"), "false");
    const saved = page.waitForResponse((r) => r.request().method() === "POST"); release(); await saved; await page.unroute("**/*");
    await page.reload(); assert.equal(requests, 1); assert.equal(await cell.getAttribute("aria-pressed"), "true");
    await db.toggleHabit(original.id, today, true);
    assert.equal(await prisma.habitLog.count({ where: { habitId: original.id } }), 1);
    for (let i = 0; i < 7; i++) {
      const day = dates.addDateDays(dates.mondayKey(), i);
      if (day > today) assert.equal(await page.getByRole("button", { name: `${marker} ${day}`, exact: true }).isEnabled(), false);
    }
    await assert.rejects(() => db.toggleHabit(original.id, dates.addDateDays(today, 1), true));
    await assert.rejects(() => db.toggleHabit(`${marker}-missing`, today, true));
    await page.route("**/*", (route) => route.request().method() === "POST" ? route.abort("failed") : route.continue());
    await cell.click(); await page.getByRole("alert").filter({ hasText: "Could not save the habit" }).waitFor();
    assert.equal(await cell.getAttribute("aria-pressed"), "true");
    assert.equal((await prisma.habitLog.findFirst({ where: { habitId: original.id } })).completed, true);
    await page.unroute("**/*"); await page.reload();
    const unchecked = page.waitForResponse((r) => r.request().method() === "POST"); await cell.click(); await unchecked; await page.reload();
    assert.equal(await cell.getAttribute("aria-pressed"), "false");
    assert.equal(await prisma.habitLog.count({ where: { habitId: original.id } }), 1);
    await page.setViewportSize({ width: 390, height: 844 }); await cell.waitFor({ state: "visible" });
    await page.waitForFunction(() => document.documentElement.scrollWidth <= innerWidth);
    await open("/"); await cell.waitFor({ state: "visible" });
    const overviewSaved = page.waitForResponse((r) => r.request().method() === "POST"); await cell.click(); await overviewSaved; await page.reload();
    assert.equal(await cell.getAttribute("aria-pressed"), "true");
    assert.equal(await prisma.habitLog.count({ where: { habitId: original.id } }), 1);
    assert.deepEqual(errors, []);
    console.log("PASS Habits check/uncheck refresh, failure/retry, duplicate guard, unique row, future rejection/disabled cells, Overview and mobile");
  } else if (process.env.PHOENIX_LANGUAGE_TRUTH_ONLY === "1") {
    const dates = load("src/lib/dates.ts");
    const week = dates.weekTimestampRange(dates.mondayKey());
    const original = await prisma.language.create({ data: {
      userId: "demo-user", code: marker, name: "Verification language", flag: "T", currentLevel: "A1", targetLevel: "B1",
      percent: 65, hoursLogged: 138, vocabulary: 55, grammar: 20, listening: 100, speaking: 5, writing: 25, reading: 10, weeklyGoalHours: 6,
    } });
    languageTestId = original.id;
    for (const minutes of [30, 45, 30]) await prisma.languageStudySession.create({ data: { languageId: original.id, date: week.start, minutes, skill: "reading", note: marker } });
    for (const [label, score] of [["W1", 25], ["W3", 40]]) await prisma.languageProgress.create({ data: { languageId: original.id, week: label, score } });
    await open("/languages");
    const card = page.locator('.glass-hover').filter({ has: page.getByRole("heading", { name: "Verification language", exact: true }) });
    const check = async () => {
      await card.getByText("Skill average", { exact: true }).waitFor();
      assert.equal(await card.getByText("36%", { exact: true }).count(), 1);
      assert.equal(await card.getByText("65%", { exact: true }).count(), 0);
      assert.equal(await card.getByText("1h 45m", { exact: true }).count(), 1);
      assert.ok((await card.innerText()).includes("This week: 1h 45m logged / 6h weekly goal"));
      assert.equal(await card.getByText("138h", { exact: true }).count(), 0);
      const history = card.getByRole("list", { name: "Stored assessment observations" });
      assert.equal(await history.getByRole("listitem").count(), 2);
      assert.equal(await history.locator("svg").count(), 0);
      assert.equal((await history.innerText()).includes("W2"), false);
      assert.ok((await card.innerText()).includes("Recent sessions · latest 3 of 3"));
    };
    await check(); await page.reload(); await check();
    await page.setViewportSize({ width: 390, height: 844 }); await card.getByText("Skill average", { exact: true }).waitFor();
    await page.waitForFunction(() => document.documentElement.scrollWidth <= innerWidth);
    assert.deepEqual(await prisma.language.findUnique({ where: { id: original.id } }), original);
    assert.deepEqual(errors, []);
    console.log("PASS Languages truthfulness: 36% skills, 1h 45m sessions/week, only stored history points, refresh/mobile and unchanged snapshots");
  } else if (process.env.PHOENIX_LANGUAGES_ONLY === "1") {
    const original = await prisma.language.create({ data: {
      userId: "demo-user", code: marker, name: "Verification language", flag: "T", currentLevel: "A1", targetLevel: "B1",
      percent: 73, vocabulary: 10, grammar: 20, listening: 30, speaking: 40, writing: 50, reading: 60, hoursLogged: 12,
    } });
    languageTestId = original.id;
    const card = page.locator('.glass-hover').filter({ has: page.getByRole("heading", { name: "Verification language", exact: true }) });
    const plus = card.getByRole("button", { name: "Increase Speaking", exact: true });
    const skillRow = card.locator('[aria-busy]').filter({ has: page.getByRole("button", { name: "Increase Speaking", exact: true }) });
    await open("/languages");
    let release, requests = 0;
    const held = new Promise((resolve) => { release = resolve; });
    await page.route("**/*", async (route) => { if (route.request().method() === "POST") { requests++; await held; } await route.continue(); });
    await plus.click(); await plus.dispatchEvent("click");
    assert.ok((await skillRow.innerText()).includes("40%"));
    assert.equal(await card.getByRole("button", { name: "Increase Reading", exact: true }).isEnabled(), true);
    assert.equal(await card.getByRole("button", { name: "Add session", exact: true }).isEnabled(), true);
    const saved = page.waitForResponse((r) => r.request().method() === "POST"); release(); await saved;
    await page.unroute("**/*"); await page.reload();
    assert.equal(requests, 1); assert.ok((await skillRow.innerText()).includes("45%"));
    const updated = await prisma.language.findUnique({ where: { id: original.id } });
    for (const key of Object.keys(original).filter((k) => !["updatedAt", "speaking"].includes(k))) assert.deepEqual(updated[key], original[key]);
    assert.equal(updated.speaking, 45);
    await page.route("**/*", (route) => route.request().method() === "POST" ? route.abort("failed") : route.continue());
    await plus.click(); await card.getByRole("alert").waitFor();
    assert.ok((await skillRow.innerText()).includes("45%")); await page.unroute("**/*"); await page.reload();
    await db.updateLanguageSkills(original.id, { skill: "speaking", value: 60, expectedValue: 45 });
    await plus.click(); await card.getByRole("alert").waitFor();
    await page.reload(); assert.ok((await skillRow.innerText()).includes("60%"));
    const retry = page.waitForResponse((r) => r.request().method() === "POST"); await plus.click(); await retry; await page.reload();
    assert.equal((await prisma.language.findUnique({ where: { id: original.id } })).speaking, 65);
    await assert.rejects(() => db.createLanguageStudySession({ languageId: `${marker}-missing`, date: new Date(), minutes: 30, skill: "listening" }));
    await card.getByRole("button", { name: "Add session", exact: true }).click();
    await card.getByLabel("Minutes", { exact: true }).fill("25");
    await card.getByLabel("Note", { exact: true }).fill(marker);
    const sessionSaved = page.waitForResponse((r) => r.request().method() === "POST");
    await card.getByRole("button", { name: "Save session", exact: true }).click(); await sessionSaved; await page.reload();
    await card.getByText(marker, { exact: true }).waitFor();
    const sessions = await prisma.languageStudySession.findMany({ where: { languageId: original.id } });
    assert.equal(sessions.length, 1); assert.equal(sessions[0].minutes, 25); assert.equal(sessions[0].skill, "listening");
    assert.equal((await prisma.language.findUnique({ where: { id: original.id } })).hoursLogged, 12);
    await page.setViewportSize({ width: 390, height: 844 }); await plus.waitFor({ state: "visible" });
    await page.waitForFunction(() => document.documentElement.scrollWidth <= innerWidth);
    assert.deepEqual(errors, []);
    console.log("PASS Languages single-skill persistence, unchanged fields/overall, failure/retry, stale rejection, duplicate guard, independent controls, session creation and mobile");
  } else if (process.env.PHOENIX_ENGINEERING_ONLY === "1") {
    for (const suffix of ["", " second"]) {
      const row = await prisma.project.create({ data: { userId: "demo-user", name: marker + suffix, progress: 40, status: "IN_PROGRESS", technologies: ["Test"] } });
      engineeringTestIds.push(row.id);
    }
    const original = await prisma.project.findUnique({ where: { id: engineeringTestIds[0] } });
    const plus = page.getByRole("button", { name: `Increase ${marker} progress`, exact: true });
    const row = page.locator('[aria-busy]').filter({ has: plus });
    await open("/engineering");
    let release, requests = 0;
    const held = new Promise((resolve) => { release = resolve; });
    await page.route("**/*", async (route) => {
      if (route.request().method() === "POST") { requests++; await held; }
      await route.continue();
    });
    await plus.click(); await plus.dispatchEvent("click");
    assert.ok((await row.innerText()).includes("40%"));
    assert.equal(await page.getByRole("button", { name: `Increase ${marker} second progress`, exact: true }).isEnabled(), true);
    const saved = page.waitForResponse((r) => r.request().method() === "POST"); release(); await saved;
    await page.unroute("**/*"); await page.reload();
    assert.equal(requests, 1); assert.ok((await row.innerText()).includes("50%"));
    await page.route("**/*", (route) => route.request().method() === "POST" ? route.abort("failed") : route.continue());
    await plus.click(); await page.getByRole("alert").filter({ hasText: "Could not save progress" }).waitFor();
    assert.ok((await row.innerText()).includes("50%")); await page.unroute("**/*");
    await page.reload();
    await db.updateProjectProgress(original.id, 60, 50);
    await plus.click(); await page.getByRole("alert").filter({ hasText: "Could not save progress" }).waitFor();
    await page.waitForFunction((name) => Array.from(document.querySelectorAll('[aria-busy]')).some((el) => el.textContent.includes(name) && el.textContent.includes("60%")), marker);
    assert.equal((await prisma.project.findUnique({ where: { id: original.id } })).progress, 60);
    await page.reload();
    const retry = page.waitForResponse((r) => r.request().method() === "POST"); await plus.click(); await retry; await page.reload();
    const updated = await prisma.project.findUnique({ where: { id: original.id } });
    assert.equal(updated.progress, 70); assert.equal(updated.status, original.status);
    for (const key of ["id", "userId", "name", "description", "repositoryUrl", "liveUrl"]) assert.equal(updated[key], original[key]);
    assert.deepEqual(updated.technologies, original.technologies); assert.equal(updated.createdAt.getTime(), original.createdAt.getTime());
    await page.setViewportSize({ width: 390, height: 844 });
    await page.waitForFunction(() => document.documentElement.scrollWidth <= innerWidth);
    await plus.waitFor({ state: "visible" }); assert.deepEqual(errors, []);
    console.log("PASS Engineering persisted refresh, failure/retry, stale rejection, duplicate guard, per-project pending, unchanged metadata/status and mobile");
  } else if (process.env.PHOENIX_NOTES_ONLY === "1") {
    const original = await prisma.note.create({ data: { userId: "demo-user", title: marker, content: `${marker} original`, tag: "General", pinned: false } });
    noteSafetyTestId = original.id;
    let confirmDelete = false;
    page.on("dialog", async (dialog) => {
      assert.ok(dialog.message().includes(marker)); assert.ok(dialog.message().includes("permanent"));
      if (confirmDelete) await dialog.accept(); else await dialog.dismiss();
    });
    await open("/notes");
    await page.getByRole("button").filter({ hasText: marker }).click();
    await page.getByLabel("Note content", { exact: true }).fill(`${marker} edited`);
    const saved = page.waitForResponse((response) => response.request().method() === "POST");
    await page.getByRole("heading", { name: "Notes", exact: true }).click(); await saved;
    await page.reload(); await page.getByRole("button").filter({ hasText: marker }).click();
    assert.equal(await page.getByLabel("Note content", { exact: true }).inputValue(), `${marker} edited`);
    const updated = await prisma.note.findUnique({ where: { id: noteSafetyTestId } });
    assert.equal(updated.content, `${marker} edited`); assert.equal(updated.createdAt.getTime(), original.createdAt.getTime());
    assert.equal(await prisma.note.count({ where: { userId: "demo-user", title: marker } }), 1);
    await page.getByRole("button", { name: "Delete note", exact: true }).click();
    assert.ok(await prisma.note.findUnique({ where: { id: noteSafetyTestId } }));
    await page.setViewportSize({ width: 390, height: 844 }); await page.waitForFunction(() => document.documentElement.scrollWidth <= innerWidth);
    confirmDelete = true;
    await page.route("**/*", (route) => route.request().method() === "POST" ? route.abort("failed") : route.continue());
    await page.getByRole("button", { name: "Delete note", exact: true }).click();
    await page.getByRole("alert").filter({ hasText: "Could not confirm deletion" }).waitFor();
    assert.equal(await page.getByLabel("Note title", { exact: true }).inputValue(), marker);
    assert.ok(await prisma.note.findUnique({ where: { id: noteSafetyTestId } }));
    assert.equal(await page.getByRole("button", { name: "Delete note", exact: true }).isEnabled(), true);
    await page.unroute("**/*");
    const deleted = page.waitForResponse((response) => response.request().method() === "POST");
    await page.getByRole("button", { name: "Delete note", exact: true }).click(); await deleted; await page.reload();
    assert.equal(await page.getByRole("button").filter({ hasText: marker }).count(), 0);
    assert.equal(await prisma.note.findUnique({ where: { id: noteSafetyTestId } }), null);
    await open("/"); assert.equal(await page.getByText(`${marker} edited`, { exact: true }).count(), 0);
    assert.deepEqual(errors, []);
    console.log(`PASS Notes same-ID edit/refresh, cancel/failed/confirmed delete, Overview refresh and mobile; deleted ${noteSafetyTestId}`);
  } else if (process.env.PHOENIX_RESOURCES_ONLY === "1") {
    const original = await prisma.resource.create({ data: { userId: "demo-user", title: marker, type: "COURSE", tag: "Test", url: "https://example.com/original", progress: 45, completed: false } });
    resourceTestId = original.id;
    let confirmDelete = false;
    page.on("dialog", async (dialog) => {
      assert.ok(dialog.message().includes(marker)); assert.ok(dialog.message().includes("cannot be undone"));
      if (confirmDelete) await dialog.accept(); else await dialog.dismiss();
    });
    await open("/resources");
    let region = page.getByRole("region", { name: `Resource ${marker}`, exact: true });
    await region.getByRole("button", { name: "Edit", exact: true }).click();
    let form = region.getByRole("form", { name: "Edit resource" });
    assert.equal(await form.getByLabel("Title", { exact: true }).inputValue(), marker);
    assert.equal(await form.getByLabel("URL (optional)", { exact: true }).inputValue(), original.url);
    await form.getByLabel("Title", { exact: true }).fill(`${marker} edited`);
    await form.getByLabel("Tag", { exact: true }).fill("Reading");
    await form.getByLabel("Type", { exact: true }).selectOption("BOOK");
    await form.getByLabel("URL (optional)", { exact: true }).fill("https://example.com/edited");
    await page.route("**/*", (route) => route.request().method() === "POST" ? route.abort("failed") : route.continue());
    await form.getByRole("button", { name: "Save changes" }).click(); await page.getByRole("alert").filter({ hasText: "Could not save" }).waitFor();
    assert.equal(await form.getByLabel("Title", { exact: true }).inputValue(), `${marker} edited`);
    assert.equal((await prisma.resource.findUnique({ where: { id: resourceTestId } })).title, marker);
    await page.unroute("**/*");
    const saved = page.waitForResponse((response) => response.request().method() === "POST");
    await form.getByRole("button", { name: "Save changes" }).click(); await saved;
    await page.reload();
    region = page.getByRole("region", { name: `Resource ${marker} edited`, exact: true }); await region.waitFor();
    const updated = await prisma.resource.findUnique({ where: { id: resourceTestId } });
    assert.equal(updated.title, `${marker} edited`); assert.equal(updated.type, "BOOK"); assert.equal(updated.tag, "Reading"); assert.equal(updated.url, "https://example.com/edited");
    for (const key of ["id", "userId", "progress", "completed"]) assert.equal(updated[key], original[key]);
    assert.equal(updated.createdAt.getTime(), original.createdAt.getTime());
    assert.equal(await prisma.resource.count({ where: { userId: "demo-user", title: { in: [marker, `${marker} edited`] } } }), 1);
    await region.getByRole("button", { name: "Edit", exact: true }).click();
    form = region.getByRole("form", { name: "Edit resource" });
    await page.setViewportSize({ width: 390, height: 844 }); await page.waitForFunction(() => document.documentElement.scrollWidth <= innerWidth);
    await form.getByLabel("URL (optional)", { exact: true }).fill("");
    const cleared = page.waitForResponse((response) => response.request().method() === "POST");
    await form.getByRole("button", { name: "Save changes" }).click(); await cleared; await page.reload();
    assert.equal((await prisma.resource.findUnique({ where: { id: resourceTestId } })).url, null);
    assert.equal(await region.getByRole("link", { name: "Open resource" }).count(), 0);
    await region.getByRole("button", { name: "Delete", exact: true }).click();
    assert.ok(await prisma.resource.findUnique({ where: { id: resourceTestId } }));
    confirmDelete = true;
    await page.route("**/*", (route) => route.request().method() === "POST" ? route.abort("failed") : route.continue());
    await region.getByRole("button", { name: "Delete", exact: true }).click(); await page.getByRole("alert").filter({ hasText: "Could not confirm deletion" }).waitFor();
    assert.ok(await prisma.resource.findUnique({ where: { id: resourceTestId } })); assert.equal(await region.count(), 1);
    await page.unroute("**/*");
    const deleted = page.waitForResponse((response) => response.request().method() === "POST");
    await region.getByRole("button", { name: "Delete", exact: true }).click(); await deleted; await page.reload();
    assert.equal(await region.count(), 0); assert.equal(await prisma.resource.findUnique({ where: { id: resourceTestId } }), null);
    assert.deepEqual(errors, []);
    console.log(`PASS Resource metadata edit/refresh, null URL, same ID/progress/owner/timestamp, failed drafts, cancel/failed/confirmed delete and mobile; deleted ${resourceTestId}`);
  } else if (process.env.PHOENIX_MINDSET_ONLY === "1") {
    const dates = load("src/lib/dates.ts");
    const weeklyApi = load("src/lib/analytics/weekly.ts");
    const today = dates.localDateKey(new Date());
    const correctedDay = dates.addDateDays(today, -1);
    const baselineWeekly = await weeklyApi.getWeeklyMetrics();
    const baselineOverview = await db.getOverviewData();
    const original = await prisma.journalEntry.create({ data: { userId: "demo-user", title: marker, content: `${marker} original`, mood: 2, date: dates.dateFromKey(today) } });
    journalTestId = original.id;
    let confirmDelete = false;
    page.on("dialog", async (dialog) => {
      assert.ok(dialog.message().includes(marker)); assert.ok(dialog.message().includes("cannot be undone"));
      if (confirmDelete) await dialog.accept(); else await dialog.dismiss();
    });
    await open("/mindset");
    let article = page.getByRole("article", { name: `Journal entry ${marker}`, exact: true });
    await article.getByRole("button", { name: "Delete", exact: true }).click();
    assert.ok(await prisma.journalEntry.findUnique({ where: { id: journalTestId } }));
    await article.getByRole("button", { name: "Edit", exact: true }).click();
    const form = article.getByRole("form", { name: "Edit journal entry" });
    assert.equal(await form.getByLabel("Reflection", { exact: true }).inputValue(), `${marker} original`);
    await form.getByLabel("Title", { exact: true }).fill(`${marker} edited`);
    await form.getByLabel("Reflection", { exact: true }).fill(`${marker} corrected`);
    await form.getByLabel("Mood", { exact: true }).selectOption("5");
    await form.getByLabel("Date", { exact: true }).fill(correctedDay);
    await page.route("**/*", (route) => route.request().method() === "POST" ? route.abort("failed") : route.continue());
    await form.getByRole("button", { name: "Save changes" }).click();
    await article.getByRole("alert").waitFor();
    assert.equal(await form.getByLabel("Reflection", { exact: true }).inputValue(), `${marker} corrected`);
    assert.equal((await prisma.journalEntry.findUnique({ where: { id: journalTestId } })).mood, 2);
    await page.unroute("**/*");
    const saved = page.waitForResponse((response) => response.request().method() === "POST");
    await form.getByRole("button", { name: "Save changes" }).click(); await saved;
    await page.reload();
    article = page.getByRole("article", { name: `Journal entry ${marker} edited`, exact: true });
    await article.waitFor();
    const updated = await prisma.journalEntry.findUnique({ where: { id: journalTestId } });
    assert.equal(updated.content, `${marker} corrected`); assert.equal(updated.mood, 5); assert.equal(updated.date.toISOString().slice(0, 10), correctedDay);
    assert.equal(updated.createdAt.getTime(), original.createdAt.getTime()); assert.equal(updated.userId, original.userId);
    assert.equal(await prisma.journalEntry.count({ where: { userId: "demo-user", title: { in: [marker, `${marker} edited`] } } }), 1);
    const weekly = await weeklyApi.getWeeklyMetrics(dates.dateFromKey(correctedDay));
    const rows = (await db.getMindset()).filter((row) => { const day = row.date.toISOString().slice(0, 10); return day >= weekly.week.start && day <= weekly.week.end; });
    assert.equal(weekly.current.mindset.averageMood, Math.round(rows.reduce((sum, row) => sum + row.mood, 0) / rows.length * 10) / 10);
    await article.getByRole("button", { name: "Edit", exact: true }).click();
    await page.setViewportSize({ width: 390, height: 844 });
    await page.waitForFunction(() => document.documentElement.scrollWidth <= innerWidth);
    await article.getByRole("button", { name: "Cancel", exact: true }).click();
    confirmDelete = true;
    await page.route("**/*", (route) => route.request().method() === "POST" ? route.abort("failed") : route.continue());
    await article.getByRole("button", { name: "Delete", exact: true }).click();
    await article.getByRole("alert").waitFor();
    assert.ok(await prisma.journalEntry.findUnique({ where: { id: journalTestId } }));
    await page.unroute("**/*");
    const deleted = page.waitForResponse((response) => response.request().method() === "POST");
    await article.getByRole("button", { name: "Delete", exact: true }).click(); await deleted;
    await page.reload();
    assert.equal(await article.count(), 0); assert.equal(await prisma.journalEntry.findUnique({ where: { id: journalTestId } }), null);
    const afterWeekly = await weeklyApi.getWeeklyMetrics();
    assert.deepEqual(afterWeekly.current.mindset, baselineWeekly.current.mindset); assert.deepEqual(afterWeekly.previous.mindset, baselineWeekly.previous.mindset);
    const overview = await db.getOverviewData();
    assert.equal(overview.lifeAreas.find((area) => area.key === "mindset").percent, baselineOverview.lifeAreas.find((area) => area.key === "mindset").percent);
    await open("/"); assert.deepEqual(errors, []);
    console.log(`PASS Mindset edit/date/refresh/same ID, failed drafts, confirmation cancel/confirm, failed delete, analytics restored and mobile; deleted ${journalTestId}`);
  } else if (process.env.PHOENIX_INCOME_ONLY === "1") {
    const dates = load("src/lib/dates.ts");
    const baseline = (await db.getIncome()).reduce((sum, row) => sum + row.amount, 0);
    const original = await prisma.income.create({ data: { userId: "demo-user", source: marker, amount: 153.25, goal: 500, type: "FREELANCE", month: dates.dateFromKey("2026-09-03"), notes: marker, status: "active" } });
    incomeTestId = original.id;
    await open("/income");
    let article = page.getByRole("article", { name: `Income record ${marker}`, exact: true });
    await article.getByRole("button", { name: "Edit", exact: true }).click();
    let form = article.getByRole("form", { name: "Edit income" });
    assert.equal(await form.getByLabel("Amount", { exact: true }).inputValue(), "153.25");
    assert.equal(await form.getByLabel("Month", { exact: true }).inputValue(), "2026-09");
    await form.getByLabel("Source", { exact: true }).fill(`${marker} edited`);
    await form.getByLabel("Amount", { exact: true }).fill("201.375");
    await form.getByLabel("Type", { exact: true }).selectOption("REMOTE_JOB");
    await form.getByLabel("Month", { exact: true }).fill("2026-08");
    await page.route("**/*", (route) => route.request().method() === "POST" ? route.abort("failed") : route.continue());
    await form.getByRole("button", { name: "Save changes" }).click();
    await article.getByRole("alert").waitFor();
    assert.equal(await form.getByLabel("Amount", { exact: true }).inputValue(), "201.375");
    assert.equal((await prisma.income.findUnique({ where: { id: incomeTestId } })).amount, 153.25);
    await page.unroute("**/*");
    const saved = page.waitForResponse((response) => response.request().method() === "POST");
    await form.getByRole("button", { name: "Save changes" }).click(); await saved;
    await page.reload();
    article = page.getByRole("article", { name: `Income record ${marker} edited`, exact: true });
    await article.waitFor();
    const updated = await prisma.income.findUnique({ where: { id: incomeTestId } });
    assert.equal(updated.amount, 201.375); assert.equal(updated.source, `${marker} edited`); assert.equal(updated.type, "REMOTE_JOB");
    assert.equal(updated.month.toISOString(), "2026-08-01T00:00:00.000Z");
    for (const key of ["id", "userId", "goal", "notes", "status"]) assert.equal(updated[key], original[key]);
    assert.equal(updated.createdAt.getTime(), original.createdAt.getTime());
    const current = await db.getIncome();
    assert.equal(current.filter((row) => row.id === incomeTestId).length, 1);
    assert.ok(Math.abs(current.reduce((sum, row) => sum + row.amount, 0) - baseline - 201.375) < 0.000001);
    const total = page.getByText("Total", { exact: true }).locator("..");
    assert.ok((await total.innerText()).includes((baseline + 201.375).toLocaleString()));
    await article.getByRole("button", { name: "Edit", exact: true }).click();
    form = article.getByRole("form", { name: "Edit income" });
    assert.equal(await form.getByLabel("Month", { exact: true }).inputValue(), "2026-08");
    await page.setViewportSize({ width: 390, height: 844 });
    await page.waitForFunction(() => document.documentElement.scrollWidth <= innerWidth);
    await form.getByLabel("Goal (optional)", { exact: true }).fill("");
    const cleared = page.waitForResponse((response) => response.request().method() === "POST");
    await form.getByRole("button", { name: "Save changes" }).click(); await cleared;
    await page.reload();
    assert.equal((await prisma.income.findUnique({ where: { id: incomeTestId } })).goal, null);
    await open("/"); assert.deepEqual(errors, []);
    console.log("PASS Income edit fields, same ID, metadata preserved, exact totals, failed draft, hard refresh, nullable goal and mobile");
  } else if (process.env.PHOENIX_HEALTH_HISTORY_ONLY === "1") {
    const dates = load("src/lib/dates.ts");
    const rows = await db.getHealth();
    let end = dates.addDateDays(dates.localDateKey(new Date()), -1);
    while (rows.some((row) => row.date >= dates.dateFromKey(dates.addDateDays(end, -6)) && row.date <= dates.dateFromKey(end))) end = dates.addDateDays(end, -1);
    const days = [-2, -1, 0].map((offset) => dates.addDateDays(end, offset));
    for (let i = 0; i < days.length; i++) {
      const row = await prisma.healthMetric.create({ data: { userId: "demo-user", date: dates.dateFromKey(days[i]), sleep: [7, null, 6.5][i], water: 1.234 } });
      healthHistoryTestIds.push(row.id);
    }
    await open(`/health?date=${end}`);
    const history = (day) => page.getByRole("article", { name: `Health record ${day}`, exact: true });
    for (const day of days) await history(day).waitFor();
    assert.match(await history(days[1]).innerText(), /Sleep\s+—/);
    const dots = page.locator(".recharts-line-dots circle");
    await dots.first().waitFor(); assert.equal(await dots.count(), 2);
    const paths = await page.locator(".recharts-line-curve").evaluateAll((nodes) => nodes.map((node) => node.getAttribute("d") ?? ""));
    assert.ok(paths.every((d) => !/[LCQ]/i.test(d)), "Separated observations must not have connecting lines/curves");
    await history(days[0]).getByRole("link").click();
    const form = page.getByRole("form", { name: "Health entry" });
    await page.getByRole("status").filter({ hasText: "At least two" }).waitFor();
    assert.equal(await page.getByLabel("Health date", { exact: true }).inputValue(), days[0]);
    assert.equal(await form.getByLabel("Sleep h").inputValue(), "7");
    await form.getByLabel("Sleep h").fill("8");
    const response = page.waitForResponse((r) => r.request().method() === "POST");
    await form.getByRole("button", { name: "Save metrics" }).click(); await response;
    await page.reload();
    assert.match(await history(days[0]).innerText(), /Sleep\s+8h/);
    assert.equal(await form.getByLabel("Sleep h").inputValue(), "8");
    const updated = await prisma.healthMetric.findUnique({ where: { id: healthHistoryTestIds[0] } });
    assert.equal(updated.sleep, 8); assert.equal(updated.water, 1.234);
    assert.equal(await prisma.healthMetric.count({ where: { userId: "demo-user", date: updated.date } }), 1);
    await history(end).getByRole("link").click();
    await dots.first().waitFor(); assert.equal(await dots.count(), 2);
    await dots.first().hover(); await page.getByText("8h", { exact: true }).last().waitFor();
    await page.setViewportSize({ width: 390, height: 844 });
    await page.waitForFunction(() => document.documentElement.scrollWidth <= innerWidth);
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false);
    await open(`/health?date=${dates.addDateDays(days[0], -1)}`);
    await page.getByText("No sleep data recorded yet.", { exact: true }).waitFor();
    await page.getByText("No health entry for this date yet.", { exact: true }).waitFor();
    assert.deepEqual(errors, []);
    console.log(`PASS history selection/correction/refresh, genuine dots with null gap, zero/one-value states, no duplicate and mobile: ${days.join(", ")}`);
  } else if (process.env.PHOENIX_HEALTH_ONLY === "1") {
    const dates = load("src/lib/dates.ts");
    const rows = await db.getHealth();
    let day = dates.addDateDays(dates.localDateKey(new Date()), -1);
    while (rows.some((row) => row.date.toISOString().slice(0, 10) === day)) day = dates.addDateDays(day, -1);
    healthTestDate = dates.dateFromKey(day);
    await open("/health");
    assert.equal(await page.getByLabel("Health date", { exact: true }).inputValue(), dates.localDateKey(new Date()));
    await page.getByLabel("Health date", { exact: true }).fill(day);
    await page.getByText("No health entry for this date yet.", { exact: true }).waitFor();
    const form = page.getByRole("form", { name: "Health entry" });
    assert.equal(await form.getByLabel("Weight kg").inputValue(), "");
    await form.getByLabel("Weight kg").fill("82");
    await form.getByLabel("Sleep h").fill("6.5");
    await form.getByRole("button", { name: "Save metrics" }).click();
    await page.getByText("Edit saved measurements.", { exact: false }).waitFor();
    const read = () => prisma.healthMetric.findUnique({ where: { userId_date: { userId: "demo-user", date: healthTestDate } } });
    healthTestId = (await read()).id;
    await page.reload();
    assert.equal(await form.getByLabel("Sleep h").inputValue(), "6.5");
    await form.getByLabel("Weight kg").fill("81.5");
    await page.route("**/*", (route) => route.request().method() === "POST" ? route.abort("failed") : route.continue());
    await form.getByRole("button", { name: "Save metrics" }).click();
    await page.getByRole("alert").filter({ hasText: "Could not save" }).waitFor();
    assert.equal(await form.getByLabel("Weight kg").inputValue(), "81.5");
    assert.equal((await read()).weight, 82);
    await page.unroute("**/*");
    const saved = page.waitForResponse((response) => response.request().method() === "POST");
    await form.getByRole("button", { name: "Save metrics" }).click();
    await saved;
    await page.reload();
    assert.equal(await form.getByLabel("Weight kg").inputValue(), "81.5");
    assert.equal(await form.getByLabel("Sleep h").inputValue(), "6.5");
    assert.equal(await page.getByLabel("Health date", { exact: true }).inputValue(), day);
    const corrected = await read();
    assert.equal(corrected.id, healthTestId); assert.equal(corrected.sleep, 6.5);
    await form.getByLabel("Weight kg").fill("");
    const cleared = page.waitForResponse((response) => response.request().method() === "POST");
    await form.getByRole("button", { name: "Save metrics" }).click(); await cleared;
    await page.reload();
    assert.equal(await form.getByLabel("Weight kg").inputValue(), "");
    assert.equal((await read()).weight, null); assert.equal((await read()).sleep, 6.5);
    assert.equal(await prisma.healthMetric.count({ where: { userId: "demo-user", date: healthTestDate } }), 1);
    await form.getByLabel("Sleep h").fill("7.5");
    const sleepSaved = page.waitForResponse((response) => response.request().method() === "POST");
    await form.getByRole("button", { name: "Save metrics" }).click(); await sleepSaved;
    await page.reload();
    assert.equal(await form.getByLabel("Sleep h").inputValue(), "7.5");
    const weekly = await load("src/lib/analytics/weekly.ts").getWeeklyMetrics(healthTestDate);
    const allHealth = await db.getHealth();
    const weekSleep = allHealth.filter((row) => {
      const key = row.date.toISOString().slice(0, 10);
      return key >= weekly.week.start && key <= weekly.week.end && row.sleep !== null;
    }).map((row) => row.sleep);
    assert.equal(weekly.current.health.averageSleep, Math.round(weekSleep.reduce((a, b) => a + b, 0) / weekSleep.length * 10) / 10);
    const latest = allHealth.at(-1);
    const parts = [[latest.sleep, 8], [latest.water, 3], [latest.steps, 10000]].filter(([value]) => value !== null).map(([value, target]) => Math.min(value, target) / target);
    const overview = await db.getOverviewData();
    assert.equal(overview.lifeAreas.find((area) => area.key === "health").percent, parts.length ? Math.round(parts.reduce((a, b) => a + b, 0) / parts.length * 100) : null);
    await page.setViewportSize({ width: 390, height: 844 });
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false);
    await open("/");
    assert.deepEqual(errors, []);
    console.log(`PASS Health create/correct/clear/refresh, same ID/date, preserved sleep, failure input retention, mobile and Overview; temporary date ${day}`);
  } else if (process.env.PHOENIX_GOALS_ONLY === "1") {
    let acceptCompletion = false;
    page.on("dialog", async (dialog) => acceptCompletion ? dialog.accept() : dialog.dismiss());
    const baseline = await db.getOverviewData();
    await open("/goals");
    const region = page.getByRole("region", { name: "Active Goals", exact: true });
    await region.getByRole("button", { name: "Create Goal", exact: true }).click();
    const form = region.getByRole("form");
    await form.getByLabel("Title", { exact: true }).fill(marker);
    await form.getByLabel("Area", { exact: true }).selectOption("CAREER");
    const failPosts = async () => page.route("**/*", async (route) => route.request().method() === "POST" ? route.abort("failed") : route.continue());
    await failPosts();
    await form.getByRole("button", { name: "Save Goal", exact: true }).click();
    await region.getByRole("alert").filter({ hasText: "Could not confirm" }).waitFor();
    assert.equal(await form.getByLabel("Title", { exact: true }).inputValue(), marker);
    await page.unroute("**/*");
    let release, saw, posts = 0;
    const held = new Promise((resolve) => { release = resolve; });
    const seen = new Promise((resolve) => { saw = resolve; });
    await page.route("**/*", async (route) => { if (route.request().method() === "POST") { posts++; saw(); await held; } await route.continue(); });
    await form.getByRole("button", { name: "Save Goal", exact: true }).click();
    await seen;
    assert.equal(await form.getByRole("button", { name: "Saving…", exact: true }).isDisabled(), true);
    await form.evaluate((element) => element.dispatchEvent(new Event("submit", { bubbles: true, cancelable: true })));
    release();
    const card = region.locator("article").filter({ hasText: marker });
    await card.waitFor(); await page.unroute("**/*"); assert.equal(posts, 1);
    const original = await prisma.goal.findFirstOrThrow({ where: { userId: "demo-user", title: marker } });
    console.log(`TEMP goal ${original.id}: ${marker}`);
    assert.equal(original.status, "IN_PROGRESS"); assert.equal(original.progress, 0);
    assert.equal(original.deadline, null); assert.equal(original.description, null);
    await page.reload(); await card.waitFor(); await card.getByText("No deadline", { exact: true }).waitFor();
    await card.getByRole("button", { name: "Edit Goal", exact: true }).click();
    await form.getByLabel("Title", { exact: true }).fill(`${marker} edited`);
    await form.getByLabel("Description (optional)", { exact: true }).fill("Temporary goal description");
    await form.getByLabel("Progress (%)", { exact: true }).fill("45");
    await form.getByLabel("Deadline (optional)", { exact: true }).fill("2026-09-10");
    await failPosts(); await form.getByRole("button", { name: "Save Goal", exact: true }).click();
    await region.getByRole("alert").filter({ hasText: "Could not confirm" }).waitFor();
    assert.equal(await form.getByLabel("Progress (%)", { exact: true }).inputValue(), "45");
    await card.getByText("0%", { exact: true }).waitFor();
    assert.equal((await prisma.goal.findUniqueOrThrow({ where: { id: original.id } })).progress, 0);
    await page.unroute("**/*");
    await form.getByRole("button", { name: "Save Goal", exact: true }).click();
    await card.getByText("45%", { exact: true }).waitFor();
    await page.reload(); await card.getByText("45%", { exact: true }).waitFor();
    await card.getByText("Sep 10, 2026", { exact: true }).waitFor();
    const edited = await prisma.goal.findUniqueOrThrow({ where: { id: original.id } });
    assert.equal(edited.title, `${marker} edited`); assert.equal(edited.description, "Temporary goal description");
    assert.equal(edited.deadline.toISOString(), "2026-09-09T23:00:00.000Z");
    for (const key of ["id", "userId", "category", "priority", "status"]) assert.equal(edited[key], original[key]);
    const active = await db.getGoals();
    const current = await db.getOverviewData();
    const career = active.filter((goal) => goal.category === "CAREER");
    assert.equal(current.lifeAreas.find((area) => area.key === "career").percent, Math.round(career.reduce((sum, goal) => sum + goal.progress, 0) / career.length));
    // Optional fields can be explicitly cleared, not replaced with defaults.
    await card.getByRole("button", { name: "Edit Goal", exact: true }).click();
    assert.equal(await form.getByLabel("Description (optional)", { exact: true }).inputValue(), "Temporary goal description");
    await form.getByLabel("Description (optional)", { exact: true }).fill("");
    await form.getByLabel("Deadline (optional)", { exact: true }).fill("");
    await page.setViewportSize({ width: 390, height: 844 });
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false);
    await form.getByRole("button", { name: "Save Goal", exact: true }).click();
    await card.getByText("No deadline", { exact: true }).waitFor();
    const cleared = await prisma.goal.findUniqueOrThrow({ where: { id: original.id } });
    assert.equal(cleared.description, null); assert.equal(cleared.deadline, null);
    await card.getByRole("button", { name: "Complete", exact: true }).click();
    assert.equal((await prisma.goal.findUniqueOrThrow({ where: { id: original.id } })).status, "IN_PROGRESS");
    acceptCompletion = true;
    await failPosts(); await card.getByRole("button", { name: "Complete", exact: true }).click();
    await region.getByRole("alert").filter({ hasText: "Could not complete" }).waitFor();
    assert.equal((await prisma.goal.findUniqueOrThrow({ where: { id: original.id } })).status, "IN_PROGRESS");
    await page.unroute("**/*");
    await card.getByRole("button", { name: "Complete", exact: true }).click();
    await card.waitFor({ state: "hidden" }); await page.reload(); await region.waitFor();
    assert.equal(await card.count(), 0);
    const done = await prisma.goal.findUniqueOrThrow({ where: { id: original.id } });
    assert.equal(done.status, "DONE"); assert.equal(done.progress, 45);
    const after = await db.getOverviewData();
    assert.equal(after.kpis.find((kpi) => kpi.id === "overall").value, baseline.kpis.find((kpi) => kpi.id === "overall").value);
    assert.deepEqual(after.lifeAreas, baseline.lifeAreas);
    await open("/goals");
    await page.waitForURL(base + "/goals");
    const historyCard = page.locator("article").filter({ hasText: marker });
    assert.equal(await historyCard.count(), 0);
    const views = page.getByRole("navigation", { name: "Goal views", exact: true });
    assert.equal(await views.getByRole("link", { name: "Active", exact: true }).getAttribute("aria-current"), "page");
    await views.getByRole("link", { name: "Completed", exact: true }).click();
    await historyCard.getByRole("button", { name: "Reopen", exact: true }).waitFor();
    await historyCard.getByText("Last progress: 45%", { exact: true }).waitFor();
    await page.reload(); await historyCard.waitFor();
    assert.equal(await views.getByRole("link", { name: "Completed", exact: true }).getAttribute("aria-current"), "page");
    await failPosts(); await historyCard.getByRole("button", { name: "Reopen", exact: true }).click();
    await page.getByRole("alert").filter({ hasText: "Could not reopen" }).waitFor();
    assert.equal((await prisma.goal.findUniqueOrThrow({ where: { id: original.id } })).status, "DONE");
    await page.unroute("**/*");
    await historyCard.getByRole("button", { name: "Reopen", exact: true }).click();
    await historyCard.waitFor({ state: "hidden" });
    const reopened = await prisma.goal.findUniqueOrThrow({ where: { id: original.id } });
    const withoutUpdated = (record) => Object.fromEntries(Object.entries(record).filter(([key]) => key !== "updatedAt"));
    assert.deepEqual(withoutUpdated(reopened), { ...withoutUpdated(done), status: "IN_PROGRESS" });
    await views.getByRole("link", { name: "Active", exact: true }).click();
    await historyCard.waitFor(); await page.reload(); await historyCard.waitFor();
    await historyCard.getByText("45%", { exact: true }).waitFor();
    assert.equal(await prisma.goal.count({ where: { id: original.id } }), 1);
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false);
    const mobile = page.getByRole("navigation", { name: "Mobile navigation", exact: true });
    await mobile.getByText("More", { exact: true }).click();
    const mobileGoals = mobile.getByRole("link", { name: "Goals", exact: true });
    await mobileGoals.click(); await page.waitForURL(base + "/goals");
    await mobile.getByText("More", { exact: true }).click();
    assert.equal(await mobileGoals.getAttribute("aria-current"), "page");
    await mobile.getByText("More", { exact: true }).click();
    await page.setViewportSize({ width: 1440, height: 1000 });
    const desktopGoals = page.locator("aside").getByRole("link", { name: "Goals", exact: true });
    await desktopGoals.click(); assert.equal(await desktopGoals.getAttribute("aria-current"), "page");
    await open("/");
    const overviewCard = page.getByRole("region", { name: "Active Missions", exact: true }).locator("article").filter({ hasText: marker });
    await overviewCard.waitFor(); await overviewCard.getByText("45%", { exact: true }).waitFor();
    const reopenedOverview = await db.getOverviewData();
    const reopenedCareer = (await db.getGoals()).filter((goal) => goal.category === "CAREER");
    assert.equal(reopenedOverview.lifeAreas.find((area) => area.key === "career").percent, Math.round(reopenedCareer.reduce((sum, goal) => sum + goal.progress, 0) / reopenedCareer.length));
    await overviewCard.getByRole("button", { name: "Complete", exact: true }).click();
    await overviewCard.waitFor({ state: "hidden" });
    const overviewDone = await prisma.goal.findUniqueOrThrow({ where: { id: original.id } });
    assert.equal(overviewDone.status, "DONE"); assert.equal(overviewDone.progress, 45);
    await open("/goals?view=completed"); await historyCard.getByText("Last progress: 45%", { exact: true }).waitFor();
    console.log("PASS confirmation cancellation, complete to history, failed/successful reopen, same record/metadata, hard refresh, active analytics and Goals desktop/mobile navigation");
    assert.deepEqual(errors, []);
    console.log("PASS Goal create/edit/progress/complete, failure retention, duplicate guard, null/date semantics, hard refresh, unchanged metadata, active-only analytics and mobile layout");
  } else if (process.env.PHOENIX_CAREER_ONLY === "1") {
    const { getWeeklyMetrics } = load("src/lib/analytics/weekly.ts");
    const metricsBefore = await getWeeklyMetrics(new Date("2026-09-10T12:00:00Z"));
    await open("/career");
    const form = page.getByRole("form", { name: "Create Application", exact: true });
    await form.getByLabel("Company", { exact: true }).fill(marker);
    await form.getByLabel("Role / Position", { exact: true }).fill("Temporary stage verification");
    await form.getByLabel("Application date", { exact: true }).fill("2026-09-10");
    assert.equal(await form.getByLabel("Stage", { exact: true }).inputValue(), "APPLIED");
    await page.route("**/*", async (route) => route.request().method() === "POST" ? route.abort("failed") : route.continue());
    await form.getByRole("button", { name: "Create Application", exact: true }).click();
    await form.getByRole("alert").filter({ hasText: "Could not confirm" }).waitFor();
    assert.equal(await form.getByLabel("Company", { exact: true }).inputValue(), marker);
    assert.equal(await form.getByLabel("Role / Position", { exact: true }).inputValue(), "Temporary stage verification");
    assert.equal(await form.getByLabel("Application date", { exact: true }).inputValue(), "2026-09-10");
    await page.unroute("**/*");
    let releaseCreate, sawCreate, createPosts = 0;
    const createHeld = new Promise((resolve) => { releaseCreate = resolve; });
    const createSeen = new Promise((resolve) => { sawCreate = resolve; });
    await page.route("**/*", async (route) => {
      if (route.request().method() === "POST") { createPosts++; sawCreate(); await createHeld; }
      await route.continue();
    });
    await form.getByRole("button", { name: "Create Application", exact: true }).click();
    await createSeen;
    assert.equal(await form.getByRole("button", { name: "Creating…", exact: true }).isDisabled(), true);
    await form.evaluate((element) => element.dispatchEvent(new Event("submit", { bubbles: true, cancelable: true })));
    releaseCreate();
    await page.locator("article").filter({ hasText: marker }).waitFor();
    await page.unroute("**/*");
    assert.equal(createPosts, 1);
    const original = await prisma.jobApplication.findFirstOrThrow({ where: { userId: "demo-user", company: marker } });
    careerTestId = original.id;
    assert.equal(original.stage, "APPLIED");
    assert.equal(original.appliedOn.toISOString(), "2026-09-09T23:00:00.000Z");
    assert.equal(await form.getByLabel("Company", { exact: true }).inputValue(), "");
    const metricsAfter = await getWeeklyMetrics(new Date("2026-09-10T12:00:00Z"));
    assert.equal(metricsAfter.current.career.applications, metricsBefore.current.career.applications + 1);
    console.log(`TEMP application ${careerTestId}: ${marker}`);
    const unchangedFields = (record) => Object.fromEntries(Object.entries(record).filter(([key]) => key !== "stage" && key !== "updatedAt"));
    const card = page.locator("article").filter({ hasText: marker });
    const select = card.getByRole("combobox", { name: `Stage for ${marker} — Temporary stage verification`, exact: true });
    await open("/career");
    await select.waitFor();
    await card.getByText("Sep 10, 2026", { exact: true }).waitFor();
    await page.reload(); await select.waitFor();
    await card.getByText("Sep 10, 2026", { exact: true }).waitFor();
    console.log("PASS creation from form, failed-save retention, duplicate guard, ownership, date, hard refresh and weekly analytics");
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
  if (habitTestId) {
    const logs = await prisma.habitLog.findMany({ where: { habitId: habitTestId }, select: { id: true } });
    for (const log of logs) await prisma.habitLog.deleteMany({ where: { id: log.id, habitId: habitTestId } });
    const removed = await prisma.habit.deleteMany({ where: { id: habitTestId, userId: "demo-user", name: marker } });
    assert.equal(removed.count, 1);
    console.log(`REMOVED exact temporary Habit ${habitTestId} and ${logs.length} logs`);
  }
  if (languageTestId) {
    const sessions = await prisma.languageStudySession.findMany({ where: { languageId: languageTestId, note: marker }, select: { id: true } });
    for (const session of sessions) await prisma.languageStudySession.deleteMany({ where: { id: session.id, languageId: languageTestId, note: marker } });
    const removed = await prisma.language.deleteMany({ where: { id: languageTestId, userId: "demo-user", code: marker } });
    assert.equal(removed.count, 1);
    console.log(`REMOVED exact temporary Language ${languageTestId} and ${sessions.length} test sessions`);
  }
  for (const id of engineeringTestIds) {
    const removed = await prisma.project.deleteMany({ where: { id, userId: "demo-user", name: { in: [marker, `${marker} second`] } } });
    assert.equal(removed.count, 1);
    console.log(`REMOVED exact temporary Engineering project ${id}`);
  }
  if (browser) await browser.close();
  if (noteSafetyTestId) {
    const removed = await prisma.note.deleteMany({ where: { id: noteSafetyTestId, userId: "demo-user", title: marker } });
    console.log(`Temporary note cleanup: ${removed.count ? "removed" : "already deleted"} ${noteSafetyTestId}`);
  }
  if (resourceTestId) {
    const removed = await prisma.resource.deleteMany({ where: { id: resourceTestId, userId: "demo-user", title: { in: [marker, `${marker} edited`] } } });
    console.log(`Temporary resource cleanup: ${removed.count ? "removed" : "already deleted"} ${resourceTestId}`);
  }
  if (journalTestId) {
    const removed = await prisma.journalEntry.deleteMany({ where: { id: journalTestId, userId: "demo-user", title: { in: [marker, `${marker} edited`] } } });
    console.log(`Temporary journal cleanup: ${removed.count ? "removed" : "already deleted"} ${journalTestId}`);
  }
  if (incomeTestId) {
    const removed = await prisma.income.deleteMany({ where: { id: incomeTestId, userId: "demo-user", notes: marker } });
    assert.equal(removed.count, 1);
    console.log(`REMOVED exact temporary Income record ${incomeTestId}`);
  }
  for (const id of healthHistoryTestIds) {
    const removed = await prisma.healthMetric.deleteMany({ where: { id, userId: "demo-user", water: 1.234 } });
    assert.equal(removed.count, 1);
    console.log(`REMOVED exact temporary Health history record ${id}`);
  }
  if (healthTestDate) {
    // Date was confirmed absent before the test; recover its ID after a lost response.
    const row = await prisma.healthMetric.findUnique({ where: { userId_date: { userId: "demo-user", date: healthTestDate } } });
    if (row) {
      assert.ok(!healthTestId || row.id === healthTestId);
      await prisma.healthMetric.deleteMany({ where: { id: row.id, userId: "demo-user", date: healthTestDate } });
      console.log(`REMOVED exact temporary HealthMetric ${row.id}`);
    }
  }
  if (process.env.PHOENIX_GOALS_ONLY === "1") {
    const temporaryGoals = await prisma.goal.findMany({ where: { userId: "demo-user", title: { in: [marker, `${marker} edited`] } }, select: { id: true, title: true } });
    for (const goal of temporaryGoals) {
      const removed = await prisma.goal.deleteMany({ where: { id: goal.id, userId: "demo-user", title: goal.title } });
      assert.equal(removed.count, 1);
      console.log(`REMOVED temporary goal ${goal.id}`);
    }
  }
  if (process.env.PHOENIX_CAREER_ONLY === "1" && !careerTestId) {
    const recovered = await prisma.jobApplication.findFirst({ where: { userId: "demo-user", company: marker }, select: { id: true } });
    careerTestId = recovered?.id;
  }
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

import assert from "node:assert/strict";
import { test } from "node:test";
import fs from "node:fs";
import path from "node:path";
import vm from "node:vm";
import { createRequire } from "node:module";
import ts from "typescript";

const require = createRequire(import.meta.url);
const root = path.resolve(import.meta.dirname, "..");
function load(file, mocks = {}) {
  const filename = path.join(root, file);
  const code = ts.transpileModule(fs.readFileSync(filename, "utf8"), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020, jsx: ts.JsxEmit.ReactJSX, esModuleInterop: true },
  }).outputText;
  const moduleBox = { exports: {} };
  const localRequire = (id) => {
    if (id in mocks) return mocks[id];
    if (id === "server-only") return {};
    if (id.startsWith("@/")) return load(`src/${id.slice(2)}.ts`, mocks);
    return require(id);
  };
  vm.runInNewContext(code, { module: moduleBox, exports: moduleBox.exports, require: localRequire, Date, Intl, console, setTimeout, clearTimeout }, { filename });
  return moduleBox.exports;
}

const dates = load("src/lib/dates.ts");
test("Next Action selection is deterministic and does not mutate shared tasks", () => {
  const { selectNextTask, getNextAction, taskDueState } = load("src/lib/tasks/next-action.ts");
  const now = new Date("2026-08-30T23:30:00Z");
  const task = (id, patch = {}) => ({ id, title: id, status: "PENDING", priority: "LOW", dueDate: null, createdAt: new Date("2026-08-01T00:00:00Z"), ...patch });
  const past = task("past", { dueDate: new Date("2026-08-29T12:00:00Z") });
  const future = task("future", { dueDate: new Date("2026-09-02T12:00:00Z") });
  const nearer = task("nearer", { dueDate: new Date("2026-09-01T12:00:00Z") });
  const progress = task("progress", { status: "IN_PROGRESS" });
  assert.equal(selectNextTask([past, progress]).id, "progress");
  assert.equal(selectNextTask([future, past]).id, "past");
  assert.equal(selectNextTask([future, nearer]).id, "nearer");
  assert.equal(selectNextTask([task("undated", { priority: "CRITICAL" }), future]).id, "future");
  for (const status of ["PENDING", "IN_PROGRESS"]) {
    const tasks = ["LOW", "MEDIUM", "HIGH", "CRITICAL"].map((priority) => task(priority, { status, priority, dueDate: future.dueDate }));
    assert.equal(selectNextTask(tasks).id, "CRITICAL");
    assert.deepEqual(tasks.map((item) => item.id), ["LOW", "MEDIUM", "HIGH", "CRITICAL"]);
  }
  assert.equal(selectNextTask([task("new", { createdAt: new Date("2026-08-02") }), task("old")]).id, "old");
  assert.equal(selectNextTask([task("b"), task("a")]).id, "a");
  assert.equal(getNextAction([], now), null);
  assert.equal(getNextAction([task("done", { status: "DONE" })], now), null);
  assert.equal(taskDueState(new Date("2026-08-30T23:05:00Z"), now).label, "Due today");
  assert.equal(taskDueState(past.dueDate, now).overdue, true);
  assert.match(taskDueState(future.dueDate, now).label, /^Due ·/);
  assert.equal(taskDueState(null, now).label, null);
  const finished = { ...progress, status: "DONE" };
  assert.equal(selectNextTask([finished, past]).id, "past");
});

test("Next Action expected status prevents stale Start and repeated Complete writes", async () => {
  let row = { id: "task", userId: "demo-user", status: "PENDING", completedAt: null };
  const prisma = { task: {
    updateMany: async ({ where, data }) => {
      if (where.id !== row.id || where.userId !== row.userId || (typeof where.status === "string" && where.status !== row.status)) return { count: 0 };
      row = { ...row, ...data }; return { count: 1 };
    },
    findFirst: async () => ({ ...row }),
  } };
  const { updateTaskStatus } = load("src/lib/db/index.ts", { "@/lib/prisma": { prisma } });
  assert.equal((await updateTaskStatus("task", "IN_PROGRESS", "PENDING")).status, "IN_PROGRESS");
  const done = await updateTaskStatus("task", "DONE", "IN_PROGRESS");
  assert.equal(done.status, "DONE");
  assert.equal((await updateTaskStatus("task", "IN_PROGRESS", "PENDING")).status, "DONE");
  assert.equal((await updateTaskStatus("task", "DONE", "IN_PROGRESS")).completedAt, done.completedAt);
});

test("Casablanca Monday first hour, exclusive end, and Ramadan offset", () => {
  const summer = dates.weekTimestampRange("2026-08-31");
  assert.equal(summer.start.toISOString(), "2026-08-30T23:00:00.000Z");
  const firstHour = new Date("2026-08-30T23:30:00Z");
  assert.equal(dates.localDateKey(firstHour), "2026-08-31");
  assert.ok(firstHour >= summer.start && firstHour < summer.endExclusive);
  assert.equal(dates.mondayKey(firstHour), "2026-08-31");
  assert.equal(dates.localDateKey(summer.endExclusive), "2026-09-07");
  assert.equal(dates.weekTimestampRange("2026-02-23").start.toISOString(), "2026-02-23T00:00:00.000Z");
  assert.equal(dates.dateFromKey("2026-08-31").toISOString(), "2026-08-31T00:00:00.000Z");
  for (const key of ["2026-02-09", "2026-02-16", "2026-03-16", "2026-03-23"]) {
    const range = dates.weekTimestampRange(key);
    assert.equal(dates.localDateKey(range.start), key);
    assert.equal(dates.localDateKey(new Date(range.start.getTime() - 1)), dates.addDateDays(key, -1));
    assert.equal(dates.localDateKey(range.endExclusive), dates.addDateDays(key, 7));
  }
});

function emptyMetrics() {
  return {
    habits: { expected: 0, completionRate: 0 }, languages: { goalHours: 0, goalCompletionRate: 0 },
    engineering: { averageTrackProgress: null, averageProjectProgress: null },
    career: { applications: 0, interviews: 0, offers: 0 },
    health: { averageSleep: null, averageWater: null, averageSteps: null, workoutDays: 0 },
    mindset: { averageMood: null, journalDays: 0 }, tasks: { total: 0 }, daily: { daysTracked: 0 },
  };
}

test("Engineering: absent, tracks only, projects only, both, and genuine zero", () => {
  const { calculateWeeklyScore } = load("src/lib/analytics/scores.ts");
  const { generateWeeklyInsights } = load("src/lib/analytics/insights.ts");
  const { generateWeeklyPlan } = load("src/lib/analytics/planning.ts");
  for (const [track, project, expected] of [[null, null, null], [80, null, 80], [null, 60, 60], [80, 60, 70], [0, null, 0]]) {
    const current = emptyMetrics();
    current.engineering = { averageTrackProgress: track, averageProjectProgress: project };
    const metrics = { current, previous: emptyMetrics() };
    const score = calculateWeeklyScore(metrics);
    assert.equal(score.domains.engineering.score, expected);
    assert.equal(score.domains.engineering.available, expected !== null);
    assert.equal(score.overall, expected);
    assert.equal(score.change, null);
    if (expected === null) {
      const insights = generateWeeklyInsights(metrics, score);
      assert.equal(insights.some((item) => item.domain === "engineering"), false);
      assert.equal(generateWeeklyPlan(metrics, score, insights).priorities.length, 0);
    }
  }
});

test("weekly queries distinguish SQL dates from instants", async () => {
  const queries = {};
  const prisma = Object.fromEntries(["habit", "language", "engineeringTrack", "project", "jobApplication", "healthMetric", "journalEntry", "task", "dailyMetric"].map((name) => [name, { findMany: async (query) => { (queries[name] ??= []).push(query); return []; } }]));
  const { getWeeklyMetrics } = load("src/lib/analytics/weekly.ts", { "@/lib/prisma": { prisma } });
  const metrics = await getWeeklyMetrics(new Date("2026-09-02T12:00:00Z"));
  assert.equal(metrics.week.start, "2026-08-31");
  assert.equal(metrics.week.end, "2026-09-06");
  assert.equal(metrics.current.engineering.averageTrackProgress, null);
  const midnight = "2026-08-31T00:00:00.000Z", instant = "2026-08-30T23:00:00.000Z";
  assert.equal(queries.habit[0].include.logs.where.date.gte.toISOString(), midnight);
  for (const name of ["healthMetric", "journalEntry", "dailyMetric"]) assert.equal(queries[name][0].where.date.gte.toISOString(), midnight);
  assert.equal(queries.language[0].include.studySessions.where.date.gte.toISOString(), instant);
  assert.equal(queries.jobApplication[0].where.appliedOn.gte.toISOString(), instant);
  for (const condition of queries.task[0].where.OR) assert.equal(Object.values(condition)[0].gte.toISOString(), instant);
});

test("priority matching tolerates changed evidence but not unrelated descriptions", () => {
  const { matchesPriorityTask } = load("src/lib/analytics/priority-task.ts");
  const title = "Schedule another focused language session this week.";
  const before = "You logged 0h across 0 sessions, reaching 0% of the 10h weekly goal.";
  const after = "You logged 2.5h across 3 sessions, reaching 25% of the 10h weekly goal.";
  for (const status of ["PENDING", "IN_PROGRESS", "DONE"]) assert.equal(matchesPriorityTask({ title, description: before, status }, title, after), true);
  assert.equal(matchesPriorityTask({ title, description: null }, title, after), false);
  assert.equal(matchesPriorityTask({ title, description: "My manual task" }, title, after), false);
  assert.equal(matchesPriorityTask({ title: "Different task", description: before }, title, after), false);
  const overview = fs.readFileSync(path.join(root, "src/app/page.tsx"), "utf8");
  assert.match(overview, /task\.createdAt >= taskWeek\.start/);
  assert.match(overview, /task\.createdAt < taskWeek\.endExclusive/);
});

test("task completion is idempotent and ownership remains scoped", async () => {
  let row = { id: "owned", userId: "demo-user", status: "PENDING", completedAt: null };
  const prisma = { task: {
    updateMany: async ({ where, data }) => {
      if (where.id !== row.id || where.userId !== row.userId || (where.status && row.status === where.status.not)) return { count: 0 };
      row = { ...row, ...data }; return { count: 1 };
    },
    findFirst: async ({ where }) => where.id === row.id && where.userId === row.userId ? { ...row } : null,
  } };
  const { updateTaskStatus } = load("src/lib/db/index.ts", { "@/lib/prisma": { prisma } });
  assert.equal((await updateTaskStatus("owned", "IN_PROGRESS")).completedAt, null);
  const done = await updateTaskStatus("owned", "DONE");
  assert.ok(done.completedAt instanceof Date);
  assert.equal((await updateTaskStatus("owned", "DONE")).completedAt, done.completedAt);
  assert.equal((await updateTaskStatus("owned", "PENDING")).completedAt, null);
  await assert.rejects(updateTaskStatus("not-owned", "DONE"), /Task not found/);
});

test("Settings saves only active fields, ignoring stale hidden payload values", async () => {
  const writes = [];
  const actions = load("src/lib/db/actions.ts", {
    "next/cache": { revalidatePath() {} },
    "@/lib/db": {
      updateUserProfile: async (data) => writes.push(JSON.parse(JSON.stringify(data))),
      updateSettings: async (data) => writes.push(JSON.parse(JSON.stringify(data))),
    },
  });
  await actions.saveSettings({ name: "Phoenix", sidebarCollapsed: true, theme: "FOREST", timezone: "stale", weeklyFocusHours: 99 });
  assert.deepEqual(writes, [{ name: "Phoenix" }, { sidebarCollapsed: true }]);
});

function elements(node, predicate, found = []) {
  if (!node || typeof node !== "object") return found;
  if (Array.isArray(node)) { node.forEach((child) => elements(child, predicate, found)); return found; }
  if (node.props) {
    if (predicate(node)) found.push(node);
    Object.values(node.props).forEach((value) => elements(value, predicate, found));
  }
  return found;
}

test("Next Action card uses the existing action for Start/Complete and refreshes server props", async () => {
  const slots = [], calls = [];
  let cursor = 0, work, refreshes = 0;
  const { NextAction } = load("src/components/dashboard/next-action.tsx", {
    react: {
      useState: (initial) => { const index = cursor++; if (!(index in slots)) slots[index] = initial; return [slots[index], (value) => { slots[index] = value; }]; },
      useRef: (initial) => { const index = cursor++; return slots[index] ??= { current: initial }; },
      useTransition: () => [false, (callback) => { work = callback(); }],
    },
    "next/navigation": { useRouter: () => ({ refresh: () => refreshes++ }) },
    "next/link": { __esModule: true, default: "link" },
    "lucide-react": { Check: "check", Loader2: "loader", Play: "play" },
    "@/components/ui/card": { Card: "card", CardHeader: "card-header" },
    "@/lib/db/actions": { setTaskStatus: async (input) => { calls.push(JSON.parse(JSON.stringify(input))); return input; } },
  });
  const render = (task) => { cursor = 0; return NextAction({ task }); };
  const task = { id: "pending", title: "Real task projection", status: "PENDING", priority: "HIGH", due: { label: null, overdue: false } };
  let tree = render(task);
  let button = elements(tree, (node) => node.type === "button")[0];
  assert.match(JSON.stringify(button), /Start/);
  button.props.onClick(); button.props.onClick(); await work;
  assert.deepEqual(calls, [{ id: "pending", status: "IN_PROGRESS", expectedStatus: "PENDING" }]);
  tree = render({ ...task, status: "IN_PROGRESS" });
  button = elements(tree, (node) => node.type === "button")[0];
  assert.match(JSON.stringify(button), /Complete/);
  button.props.onClick(); await work;
  assert.deepEqual(calls[1], { id: "pending", status: "DONE", expectedStatus: "IN_PROGRESS" });
  assert.equal(refreshes, 2);
  tree = render(null);
  assert.match(JSON.stringify(tree), /No active task right now/);
  assert.equal(elements(tree, (node) => node.type === "button").length, 0);
});

test("Quick Notes validation, failure, duplicate guard, newer draft, persisted identity and refresh", async () => {
  let cursor = 0, dirty = false, calls = 0, resolveSave, rejectSave;
  const slots = [];
  const hooks = {
    useState: (initial) => {
      const index = cursor++;
      if (!(index in slots)) slots[index] = initial;
      return [slots[index], (value) => { slots[index] = typeof value === "function" ? value(slots[index]) : value; dirty = true; }];
    },
    useRef: (initial) => { const index = cursor++; return slots[index] ??= { current: initial }; },
  };
  const { QuickNotes } = load("src/components/dashboard/quick-notes.tsx", {
    react: hooks, "next/navigation": { useRouter: () => ({ refresh() {} }) },
    "lucide-react": { Plus: "plus" }, "@/components/ui/card": { Card: "card", CardHeader: "card-header" },
    "@/lib/db/actions": { saveNote: () => { calls++; return new Promise((resolve, reject) => { resolveSave = resolve; rejectSave = reject; }); } },
  });
  let props = { initialNotes: [] }, tree;
  const render = () => { do { dirty = false; cursor = 0; tree = QuickNotes(props); } while (dirty); };
  const input = () => elements(tree, (element) => element.type === "input")[0];
  const submit = () => elements(tree, (element) => element.type === "button")[0].props.onClick();
  const type = (text) => { input().props.onChange({ target: { value: text } }); render(); };
  render(); type("x".repeat(121)); await submit(); render();
  assert.equal(calls, 0); assert.equal(input().props.value.length, 121);
  assert.ok(elements(tree, (element) => element.props.role === "alert").length);
  type("Keep this draft"); const failed = submit(); rejectSave(new Error("offline")); await failed; render();
  assert.equal(input().props.value, "Keep this draft");
  const saving = submit(); await submit(); render(); assert.equal(calls, 2);
  type("Newer text while saving"); resolveSave({ id: "db-note", title: "Keep this draft" }); await saving; render();
  assert.equal(input().props.value, "Newer text while saving");
  assert.ok(elements(tree, (element) => element.type === "li" && element.key === "db-note").length);
  const finalSave = submit(); resolveSave({ id: "db-note-2", title: "Newer text while saving" }); await finalSave; render();
  assert.equal(input().props.value, "");
  props = { initialNotes: [{ id: "refreshed", text: "Server refresh" }] }; render();
  assert.ok(elements(tree, (element) => element.type === "li" && element.key === "refreshed").length);
});

test("monthly empty state, missing deadline, mobile route coverage and accessible sidebar", () => {
  const uiMocks = { "@/components/ui/card": { Card: "card", CardHeader: "card-header" } };
  const { MonthlyProgress } = load("src/components/dashboard/monthly-progress.tsx", uiMocks);
  const empty = MonthlyProgress({ monthlyProgress: [{ label: "Week 1", score: null }] });
  assert.match(JSON.stringify(empty), /No daily metrics recorded/);
  assert.doesNotMatch(JSON.stringify(empty), /Best Day/);
  const mobile = fs.readFileSync(path.join(root, "src/components/layout/mobile-nav.tsx"), "utf8");
  assert.match(mobile, /\[\.\.\.navItems, settingsItem\]/);
  assert.match(mobile, /aria-current/);
  const sidebar = fs.readFileSync(path.join(root, "src/components/layout/sidebar.tsx"), "utf8");
  assert.match(sidebar, /aria-label=\{item.label\}/);
  assert.match(sidebar, /Expand sidebar/);
  const db = fs.readFileSync(path.join(root, "src/lib/db/index.ts"), "utf8");
  assert.match(db, /deadline: goal.deadline\?\.toISOString\(\) \?\? null/);
});

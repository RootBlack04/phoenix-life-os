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
  vm.runInNewContext(code, { module: moduleBox, exports: moduleBox.exports, require: localRequire, Date, Intl, console, setTimeout, clearTimeout, window: mocks.window, FormData: mocks.FormData }, { filename });
  return moduleBox.exports;
}

const dates = load("src/lib/dates.ts");
test("Languages display real skill/session summaries, Casablanca boundaries and discrete history", () => {
  const { LanguagesClient } = load("src/components/domain/languages-client.tsx", {
    react: { useState: (v) => [v, () => {}], useTransition: () => [false, () => {}] },
    "next/navigation": { useRouter: () => ({ refresh() {} }) }, "@/lib/db/actions": {},
    "@/components/ui/card": { Card: "card" }, "@/components/ui/badge": { Badge: "badge" },
    "@/components/ui/progress-ring": { ProgressRing: "ring" }, "@/components/ui/detail-progress": { DetailProgress: "detail" },
    "@/components/charts/language-chart": { LanguageChart: "history" },
  });
  const range = dates.weekTimestampRange("2026-08-31");
  const activeWeek = { start: range.start.toISOString(), endExclusive: range.endExclusive.toISOString() };
  const text = (n) => n == null || typeof n === "boolean" ? "" : typeof n !== "object" ? String(n) : Array.isArray(n) ? n.map(text).join("") : text(n.props?.children);
  const language = { id: "l", vocabulary: 55, grammar: 20, listening: 100, speaking: 5, writing: 25, reading: 10, percent: 65, hoursLogged: 138, dailyGoalMinutes: 30, weeklyGoalHours: 6,
    weeklyTrend: [{ week: "W1", score: 25 }, { week: "W3", score: 40 }],
    studySessions: [
      { id: "1", date: activeWeek.start, minutes: 30, skill: "reading" },
      { id: "2", date: "2026-09-02T12:00:00Z", minutes: 45, skill: "reading" },
      { id: "3", date: activeWeek.endExclusive, minutes: 30, skill: "reading" },
    ] };
  const render = (value = language) => LanguagesClient({ initialLanguages: [value], activeWeek });
  const tree = render();
  assert.equal(elements(tree, (n) => n.type === "ring")[0].props.percent, 36);
  assert.ok(text(tree).includes("1h 45m")); assert.ok(text(tree).includes("This week: 1h 15m logged / 6h weekly goal"));
  assert.ok(text(tree).includes("31 Aug 2026")); assert.ok(text(tree).includes("Recent sessions · latest 3 of 3"));
  assert.equal(text(tree).includes("138h"), false);
  assert.ok(text(render({ ...language, studySessions: [] })).includes("0m"));
  assert.ok(text(render({ ...language, studySessions: language.studySessions.slice(1, 2) })).includes("45m"));
  assert.ok(text(render({ ...language, studySessions: Array.from({ length: 6 }, (_, i) => ({ ...language.studySessions[0], id: String(i) })) })).includes("latest 5 of 6"));
  const { LanguageChart } = load("src/components/charts/language-chart.tsx");
  const history = LanguageChart({ data: language.weeklyTrend });
  assert.equal(elements(history, (n) => n.type === "li").length, 2);
  assert.ok(text(history).includes("W3")); assert.equal(text(history).includes("W2"), false);
  assert.ok(text(LanguageChart({ data: [] })).includes("No stored assessments"));
  assert.doesNotMatch(fs.readFileSync(path.join(root, "src/components/charts/language-chart.tsx"), "utf8"), /monotone|LineChart|recharts/);
});
test("Language weekly metrics remain session-based, independent of stored skills and lifetime hours", async () => {
  const language = { percent: 73, speaking: 40, hoursLogged: 900, weeklyGoalHours: 4, studySessions: [{ minutes: 30 }, { minutes: 60 }] };
  const prisma = Object.fromEntries(["habit", "language", "engineeringTrack", "project", "jobApplication", "healthMetric", "journalEntry", "task", "dailyMetric"].map((name) => [name, { findMany: async () => name === "language" ? [language] : [] }]));
  const { getWeeklyMetrics } = load("src/lib/analytics/weekly.ts", { "@/lib/prisma": { prisma } });
  const before = (await getWeeklyMetrics(new Date("2026-09-03T12:00:00Z"))).current.languages;
  assert.equal(before.studyMinutes, 90); assert.equal(before.studyHours, 1.5);
  assert.equal(before.sessions, 2); assert.equal(before.goalHours, 4); assert.equal(before.goalCompletionRate, 38);
  language.speaking = 45;
  assert.deepEqual((await getWeeklyMetrics(new Date("2026-09-03T12:00:00Z"))).current.languages, before);
});
test("Language single-skill writes enforce ownership and narrow CAS without altering overall or other skills", async () => {
  const row = { id: "owned", userId: "demo-user", vocabulary: 10, grammar: 20, listening: 30, speaking: 40, writing: 50, reading: 60, percent: 73, hoursLogged: 15 };
  const foreign = { ...row, id: "foreign", userId: "other" };
  const paths = [], sessions = [];
  const db = load("src/lib/db/index.ts", { "@/lib/prisma": { prisma: {
    language: { updateMany: async ({ where, data }) => {
      assert.equal(where.userId, "demo-user");
      assert.equal(Object.keys(data).length, 1);
      const target = [row, foreign].find((r) => Object.entries(where).every(([k, v]) => r[k] === v));
      if (!target) return { count: 0 };
      Object.assign(target, data); return { count: 1 };
    } },
    languageStudySession: { create: async ({ data }) => {
      const connect = data.language.connect;
      assert.equal(connect.userId, "demo-user");
      if (![row, foreign].some((r) => r.id === connect.id && r.userId === connect.userId)) throw new Error("Unavailable");
      sessions.push(data); return data;
    } },
  } } });
  const { setLanguageSkills, addLanguageStudySession } = load("src/lib/db/actions.ts", { "@/lib/db": db, "next/cache": { revalidatePath: (p) => paths.push(p) } });
  const payload = { id: "owned", skill: "speaking", value: 45, expectedValue: 40 };
  for (const id of ["foreign", "missing", " "]) await assert.rejects(() => setLanguageSkills({ ...payload, id }));
  for (const skill of ["percent", "userId", "__proto__", "Speaking", ""]) await assert.rejects(() => setLanguageSkills({ ...payload, skill }));
  for (const value of [-1, 101, 1.5, NaN, Infinity, "45", null, undefined]) {
    await assert.rejects(() => setLanguageSkills({ ...payload, value }));
    await assert.rejects(() => setLanguageSkills({ ...payload, expectedValue: value }));
  }
  await setLanguageSkills({ ...payload, percent: 0, reading: 0, userId: "other" });
  assert.deepEqual(row, { id: "owned", userId: "demo-user", vocabulary: 10, grammar: 20, listening: 30, speaking: 45, writing: 50, reading: 60, percent: 73, hoursLogged: 15 });
  await assert.rejects(() => setLanguageSkills(payload));
  await setLanguageSkills({ ...payload, skill: "reading", value: 65, expectedValue: 60 });
  assert.equal(row.speaking, 45); assert.equal(row.reading, 65); assert.equal(foreign.speaking, 40);
  const session = { languageId: "owned", date: new Date("2026-09-03T10:00:00Z"), minutes: 30, skill: "listening", note: "Keep" };
  for (const languageId of ["foreign", "missing", " "]) await assert.rejects(() => addLanguageStudySession({ ...session, languageId }));
  for (const minutes of [0, -1, 1.5, 1441, NaN, "30"]) await assert.rejects(() => addLanguageStudySession({ ...session, minutes }));
  await assert.rejects(() => addLanguageStudySession({ ...session, skill: "invalid" }));
  await assert.rejects(() => addLanguageStudySession({ ...session, note: "x".repeat(501) }));
  await addLanguageStudySession(session);
  assert.equal(sessions.length, 1); assert.equal(sessions[0].date.getTime(), session.date.getTime());
  assert.equal(sessions[0].minutes, 30); assert.equal(sessions[0].note, "Keep"); assert.equal(row.hoursLogged, 15);
  assert.deepEqual(paths, ["/languages", "/", "/languages", "/", "/languages", "/"]);
});

test("Language skill control keeps persisted props, rejects duplicate clicks and recovers failure", async () => {
  let cursor = 0, refreshes = 0, resolveSave, rejectSave;
  const slots = [], calls = [], transitions = [];
  const { LanguagesClient } = load("src/components/domain/languages-client.tsx", {
    react: {
      useRef: (initial) => { const i = cursor++; return slots[i] ??= { current: initial }; },
      useState: (initial) => { const i = cursor++; if (!(i in slots)) slots[i] = initial; return [slots[i], (v) => { slots[i] = v; }]; },
      useTransition: () => [false, (fn) => transitions.push(fn())],
    },
    "next/navigation": { useRouter: () => ({ refresh: () => refreshes++ }) },
    "@/lib/db/actions": { setLanguageSkills: (input) => { calls.push(input); return new Promise((resolve, reject) => { resolveSave = resolve; rejectSave = reject; }); } },
    "@/components/ui/card": { Card: "card" }, "@/components/ui/badge": { Badge: "badge" },
    "@/components/ui/progress-ring": { ProgressRing: "ring" }, "@/components/ui/detail-progress": { DetailProgress: "detail" },
    "@/components/charts/language-chart": { LanguageChart: "chart" },
  });
  const language = { id: "lang", name: "Test", vocabulary: 10, grammar: 20, listening: 30, speaking: 40, writing: 50, reading: 60, studySessions: [] };
  const tree = LanguagesClient({ initialLanguages: [language] });
  const skill = elements(tree, (n) => typeof n.type === "function" && n.props.skill === "speaking")[0];
  slots.length = 0;
  const render = (value = 40) => { cursor = 0; return skill.type({ ...skill.props, value }); };
  const plus = () => elements(render(), (n) => n.props?.["aria-label"] === "Increase Speaking")[0];
  const value = (tree) => elements(tree, (n) => n.type === "detail")[0].props.percent;
  plus().props.onClick(); plus().props.onClick();
  assert.equal(calls.length, 1); assert.equal(value(render()), 40);
  assert.deepEqual(Object.keys(calls[0]).sort(), ["expectedValue", "id", "skill", "value"]);
  rejectSave(new Error("Fail")); await transitions.pop();
  assert.equal(value(render()), 40); assert.equal(elements(render(), (n) => n.props?.role === "alert").length, 1);
  plus().props.onClick(); resolveSave(); await transitions.pop();
  assert.equal(refreshes, 2); assert.equal(value(render(45)), 45);
});
test("Engineering writes enforce ownership, expected progress, validation and independent status", async () => {
  const rows = [{ id: "owned", userId: "demo-user", progress: 40, status: "IN_PROGRESS", name: "Keep" }, { id: "foreign", userId: "other", progress: 40, status: "DONE" }];
  const paths = [];
  const db = load("src/lib/db/index.ts", { "@/lib/prisma": { prisma: { project: { updateMany: async ({ where, data }) => {
    assert.equal(where.userId, "demo-user");
    assert.deepEqual(Object.keys(data), ["progress"]);
    const row = rows.find((r) => r.id === where.id && r.userId === where.userId && r.progress === where.progress);
    if (!row) return { count: 0 };
    Object.assign(row, data); return { count: 1 };
  } } } } });
  const { setProjectProgress } = load("src/lib/db/actions.ts", { "@/lib/db": db, "next/cache": { revalidatePath: (p) => paths.push(p) } });
  for (const value of [-1, 101, 1.5, NaN, Infinity, "50", null, undefined]) {
    await assert.rejects(() => setProjectProgress({ id: "owned", progress: value, expectedProgress: 40 }));
    await assert.rejects(() => setProjectProgress({ id: "owned", progress: 50, expectedProgress: value }));
  }
  for (const id of ["foreign", "missing", " "]) await assert.rejects(() => setProjectProgress({ id, progress: 50, expectedProgress: 40 }));
  await setProjectProgress({ id: "owned", progress: 60, expectedProgress: 40 });
  await assert.rejects(() => setProjectProgress({ id: "owned", progress: 50, expectedProgress: 40 }));
  assert.equal(rows[0].progress, 60);
  await setProjectProgress({ id: "owned", progress: 100, expectedProgress: 60 });
  assert.deepEqual(rows[0], { id: "owned", userId: "demo-user", progress: 100, status: "IN_PROGRESS", name: "Keep" });
  assert.equal(rows[1].progress, 40);
  assert.deepEqual(paths, ["/engineering", "/", "/engineering", "/"]);
});

test("Engineering displays server props, guards duplicate saves and recovers failures", async () => {
  let cursor = 0, refreshes = 0, resolveSave, rejectSave;
  const slots = [], calls = [], transitions = [];
  const { EngineeringBoard } = load("src/components/domain/engineering-board.tsx", {
    react: {
      useRef: (initial) => { const i = cursor++; return slots[i] ??= { current: initial }; },
      useState: (initial) => { const i = cursor++; if (!(i in slots)) slots[i] = initial; return [slots[i], (v) => { slots[i] = v; }]; },
      useTransition: () => [false, (fn) => transitions.push(fn())],
    },
    "next/navigation": { useRouter: () => ({ refresh: () => refreshes++ }) },
    "@/lib/db/actions": { setProjectProgress: (input) => { calls.push(input); return new Promise((resolve, reject) => { resolveSave = resolve; rejectSave = reject; }); } },
    "@/components/ui/badge": { Badge: "badge" },
    "@/components/ui/progress-bar": { ProgressBar: "bar" },
  });
  const project = { id: "p", name: "Project", stack: [], progress: 40, status: "in-progress" };
  const render = (p = project) => { cursor = 0; const row = EngineeringBoard({ projects: [p] }).props.children[0]; return row.type(row.props); };
  const plus = (tree) => elements(tree, (n) => n.props?.["aria-label"] === "Increase Project progress")[0];
  const percent = (tree) => elements(tree, (n) => n.type === "bar")[0].props.percent;
  plus(render()).props.onClick(); plus(render()).props.onClick();
  assert.equal(calls.length, 1); assert.equal(percent(render()), 40); assert.equal(calls[0].expectedProgress, 40);
  rejectSave(new Error("Failed")); await transitions.pop();
  assert.equal(percent(render()), 40); assert.equal(elements(render(), (n) => n.props?.role === "alert").length, 1);
  plus(render()).props.onClick(); resolveSave(); await transitions.pop();
  assert.equal(refreshes, 2); assert.equal(percent(render({ ...project, progress: 50 })), 50);
  assert.equal(elements(render(), (n) => n.props?.role === "alert").length, 0);
});
test("Note update/delete require owner plus ID and preserve identity", async () => {
  let row = { id: "n", userId: "demo-user", title: "Before", content: "Before", tag: "General", pinned: false };
  const paths = [];
  const check = (where) => { assert.equal(where.userId, "demo-user"); if (!row || where.id !== row.id) throw new Error("Not owned"); };
  const db = load("src/lib/db/index.ts", { "@/lib/prisma": { prisma: { note: {
    update: async ({ where, data }) => { check(where); Object.assign(row, data); return row; },
    delete: async ({ where }) => { check(where); row = null; },
  } } } });
  const { saveNote, removeNote } = load("src/lib/db/actions.ts", { "@/lib/db": db, "next/cache": { revalidatePath: (route) => paths.push(route) } });
  const payload = { id: "n", title: "After", content: "After", tag: "General", pinned: false };
  await assert.rejects(() => saveNote({ ...payload, id: "foreign" })); await assert.rejects(() => removeNote("foreign"));
  await assert.rejects(() => saveNote({ ...payload, id: "" })); await assert.rejects(() => removeNote(" "));
  await saveNote({ ...payload, userId: "foreign" }); assert.equal(row.id, "n"); assert.equal(row.userId, "demo-user"); assert.equal(row.content, "After");
  await removeNote("n"); assert.equal(row, null); await assert.rejects(() => removeNote("n"));
  assert.deepEqual(paths, ["/notes", "/", "/notes", "/"]);
});

test("Notes confirmation cancels safely, guards duplicate delete and retains failed records", async () => {
  let cursor = 0, refreshes = 0, resolveDelete, rejectDelete, confirmed = false;
  const slots = [], calls = [], prompts = [];
  const { NotesClient } = load("src/components/domain/notes-client.tsx", {
    window: { confirm: (prompt) => { prompts.push(prompt); return confirmed; } },
    react: {
      useState: (initial) => { const i = cursor++; if (!(i in slots)) slots[i] = initial; return [slots[i], (v) => { slots[i] = typeof v === "function" ? v(slots[i]) : v; }]; },
      useRef: (initial) => { const i = cursor++; return slots[i] ??= { current: initial }; },
      useMemo: (fn) => fn(),
    },
    "@/components/ui/card": { Card: "card" }, "@/components/ui/badge": { Badge: "badge" },
    "next/navigation": { useRouter: () => ({ refresh: () => refreshes++ }) },
    "@/lib/db/actions": { removeNote: (id) => { calls.push(id); return new Promise((resolve, reject) => { resolveDelete = resolve; rejectDelete = reject; }); } },
  });
  const notes = [{ id: "n", title: "Private note", content: "Keep", tag: "General", pinned: false }];
  let tree;
  const render = () => { cursor = 0; tree = NotesClient({ initialNotes: notes }); };
  const remove = () => elements(tree, (node) => node.props["aria-label"] === "Delete note")[0].props.onClick();
  render(); await remove(); assert.equal(calls.length, 0); assert.match(prompts[0], /Private note.*permanent/);
  confirmed = true; const failed = remove(); await remove(); assert.equal(calls.length, 1);
  render(); assert.equal(elements(tree, (node) => node.props["aria-label"] === "Delete note")[0].props.disabled, true);
  rejectDelete(new Error("offline")); await failed; render();
  assert.match(JSON.stringify(tree), /Could not confirm deletion/); assert.match(JSON.stringify(tree), /Private note/); assert.equal(refreshes, 0);
  const success = remove(); resolveDelete(); await success; render();
  assert.match(JSON.stringify(tree), /No notes yet/); assert.match(JSON.stringify(tree), /Create your first note/); assert.equal(refreshes, 1);
});
test("Resource metadata validates, preserves progress/timestamps and scopes update/delete", async () => {
  let row = { id: "r", userId: "demo-user", title: "Before", tag: "Study", type: "COURSE", url: "https://example.com", progress: 45, completed: false, createdAt: new Date() };
  const original = { ...row }, paths = [];
  const db = load("src/lib/db/index.ts", { "@/lib/prisma": { prisma: { resource: {
    update: async ({ where, data }) => { assert.equal(where.userId, "demo-user"); if (where.id !== row.id) throw new Error("Not owned"); Object.assign(row, Object.fromEntries(Object.entries(data).filter(([, v]) => v !== undefined))); return row; },
    deleteMany: async ({ where }) => { assert.equal(where.userId, "demo-user"); if (row?.id !== where.id) return { count: 0 }; row = null; return { count: 1 }; },
  } } } });
  const actions = load("src/lib/db/actions.ts", { "@/lib/db": db, "next/cache": { revalidatePath: (route) => paths.push(route) } });
  const payload = { id: "r", title: "Edited", type: "BOOK", tag: "Reading", url: "https://example.com/book" };
  for (const bad of [{ title: " " }, { tag: "" }, { type: "INVALID" }, { url: "not a URL" }, { id: "foreign" }]) await assert.rejects(() => actions.editResource({ ...payload, ...bad }));
  await actions.editResource({ ...payload, progress: 100, completed: true, userId: "foreign" });
  assert.equal(row.title, "Edited"); assert.equal(row.type, "BOOK"); assert.equal(row.url, payload.url);
  for (const key of ["id", "userId", "progress", "completed", "createdAt"]) assert.equal(row[key], original[key]);
  await actions.editResource({ ...payload, url: "" }); assert.equal(row.url, null);
  await actions.removeResource("foreign"); assert.ok(row);
  await assert.rejects(() => actions.removeResource(" "));
  await actions.removeResource("r"); assert.equal(row, null);
  assert.ok(paths.every((path) => path === "/resources"));
});

test("Resources UI loads metadata, guards duplicates, confirms deletion and retains failures", async () => {
  let cursor = 0, refreshes = 0, resolveSave, rejectSave, confirmed = false;
  const slots = [], calls = [], transitions = [], prompts = [];
  const { ResourcesClient } = load("src/components/domain/resources-client.tsx", {
    FormData: class { constructor(values) { this.values = values; } get(key) { return this.values[key]; } },
    window: { confirm: (prompt) => { prompts.push(prompt); return confirmed; } },
    react: {
      useState: (initial) => { const i = cursor++; if (!(i in slots)) slots[i] = initial; return [slots[i], (v) => { slots[i] = v; }]; },
      useRef: (initial) => { const i = cursor++; return slots[i] ??= { current: initial }; },
      useTransition: () => [false, (fn) => transitions.push(fn())],
    },
    "next/navigation": { useRouter: () => ({ refresh: () => refreshes++ }) },
    "@/lib/db/actions": Object.fromEntries(["editResource", "removeResource"].map((name) => [name, (input) => { calls.push({ name, input }); return new Promise((resolve, reject) => { resolveSave = resolve; rejectSave = reject; }); }])),
  });
  const resource = { id: "r", title: "Resource", type: "BOOK", tag: "Study", url: "https://example.com", progress: 45, completed: false };
  let tree;
  const render = (resources = [resource]) => { cursor = 0; tree = ResourcesClient({ resources }); };
  const button = (text) => elements(tree, (node) => node.type === "button" && node.props.children === text)[0];
  render([]); assert.match(JSON.stringify(tree), /No resources yet/); assert.equal(elements(tree, (node) => node.type === "form").length, 1);
  render(); button("Delete").props.onClick(); assert.equal(calls.length, 0); assert.match(prompts[0], /Resource.*cannot be undone/);
  button("Edit").props.onClick(); render();
  const form = () => elements(tree, (node) => node.props["aria-label"] === "Edit resource")[0];
  for (const key of ["title", "type", "tag", "url"]) assert.equal(elements(form(), (node) => node.props.name === key)[0].props.defaultValue, resource[key]);
  const submit = () => form().props.onSubmit({ preventDefault() {}, currentTarget: { title: "Edited", type: "LINK", tag: "Study", url: "" } });
  submit(); submit(); assert.equal(calls.length, 1);
  rejectSave(new Error("offline")); await Promise.all(transitions); render(); assert.match(JSON.stringify(tree), /Your edits have been kept/); assert.equal(refreshes, 0);
  submit(); resolveSave(); await Promise.all(transitions); render(); assert.equal(refreshes, 1);
  confirmed = true; button("Delete").props.onClick(); button("Delete").props.onClick(); assert.equal(calls.length, 3);
  rejectSave(new Error("offline")); await Promise.all(transitions); render(); assert.match(JSON.stringify(tree), /Could not confirm deletion/);
  button("Delete").props.onClick(); resolveSave(); await Promise.all(transitions); assert.equal(refreshes, 2);
});
test("Journal edits/deletes validate and scope ownership while preserving identity and metadata", async () => {
  let row = { id: "j", userId: "demo-user", title: "Before", content: "Before", mood: 3, date: dates.dateFromKey("2026-09-03"), createdAt: new Date() };
  const original = { ...row }, paths = [];
  const check = (where) => { assert.equal(where.userId, "demo-user"); if (!row || where.id !== row.id) throw new Error("Not owned"); };
  const db = load("src/lib/db/index.ts", { "@/lib/prisma": { prisma: { journalEntry: {
    update: async ({ where, data }) => { check(where); Object.assign(row, data); return row; },
    delete: async ({ where }) => { check(where); row = null; },
  } } } });
  const actions = load("src/lib/db/actions.ts", { "@/lib/db": db, "next/cache": { revalidatePath: (route) => paths.push(route) } });
  const payload = { id: "j", title: "Edited", content: "Reflection", mood: 5, date: "2026-09-02" };
  for (const bad of [{ mood: 0 }, { mood: 6 }, { mood: 2.5 }, { mood: "3" }, { date: "2026-02-30" }, { title: " " }, { content: "" }, { id: "foreign" }]) await assert.rejects(() => actions.editJournalEntry({ ...payload, ...bad }));
  await assert.rejects(() => actions.removeJournalEntry("foreign")); await assert.rejects(() => actions.removeJournalEntry(" "));
  await actions.editJournalEntry({ ...payload, userId: "foreign" });
  assert.equal(row.id, original.id); assert.equal(row.userId, original.userId); assert.equal(row.createdAt, original.createdAt);
  assert.equal(row.content, "Reflection"); assert.equal(row.mood, 5); assert.equal(row.date.toISOString(), "2026-09-02T00:00:00.000Z");
  await actions.removeJournalEntry("j"); assert.equal(row, null); await assert.rejects(() => actions.removeJournalEntry("j"));
  assert.deepEqual(paths, ["/mindset", "/", "/mindset", "/"]);
});

test("Journal UI guards save/delete, confirms exact entry, retains failures and refreshes only on success", async () => {
  let cursor = 0, refreshes = 0, resolveSave, rejectSave, confirmed = false;
  const slots = [], calls = [], transitions = [], prompts = [];
  const { JournalEntryCard } = load("src/components/domain/mindset-client.tsx", {
    FormData: class { constructor(values) { this.values = values; } get(key) { return this.values[key]; } },
    window: { confirm: (prompt) => { prompts.push(prompt); return confirmed; } },
    react: {
      useState: (initial) => { const i = cursor++; if (!(i in slots)) slots[i] = initial; return [slots[i], (v) => { slots[i] = v; }]; },
      useRef: (initial) => { const i = cursor++; return slots[i] ??= { current: initial }; },
      useTransition: () => [false, (fn) => transitions.push(fn())],
    },
    "@/components/ui/card": { Card: "card", CardHeader: "header" },
    "next/navigation": { useRouter: () => ({ refresh: () => refreshes++ }) },
    "@/lib/db/actions": Object.fromEntries(["editJournalEntry", "removeJournalEntry"].map((name) => [name, (input) => { calls.push({ name, input }); return new Promise((resolve, reject) => { resolveSave = resolve; rejectSave = reject; }); }])),
  });
  const entry = { id: "j", title: "Private entry", content: "Before", mood: 3, date: "2026-09-02" };
  let tree;
  const render = () => { cursor = 0; tree = JournalEntryCard({ entry }); };
  const button = (text) => elements(tree, (node) => node.type === "button" && node.props.children === text)[0];
  render(); button("Delete").props.onClick(); assert.equal(calls.length, 0); assert.match(prompts[0], /Private entry.*2026-09-02.*cannot be undone/);
  button("Edit").props.onClick(); render();
  for (const key of ["title", "content", "mood", "date"]) assert.equal(elements(tree, (node) => node.props.name === key)[0].props.defaultValue, entry[key]);
  const submit = () => elements(tree, (node) => node.type === "form")[0].props.onSubmit({ preventDefault() {}, currentTarget: { title: "Edited", content: "Draft", mood: "4", date: "2026-09-01" } });
  submit(); submit(); assert.equal(calls.length, 1);
  rejectSave(new Error("offline")); await Promise.all(transitions); render(); assert.match(JSON.stringify(tree), /Your edits have been kept/); assert.equal(refreshes, 0);
  submit(); resolveSave(); await Promise.all(transitions); render(); assert.equal(refreshes, 1);
  confirmed = true; button("Delete").props.onClick(); button("Delete").props.onClick(); assert.equal(calls.length, 3);
  rejectSave(new Error("offline")); await Promise.all(transitions); render(); assert.match(JSON.stringify(tree), /Could not confirm deletion/);
  button("Delete").props.onClick(); resolveSave(); await Promise.all(transitions); assert.equal(refreshes, 2);
});

test("Empty Mindset keeps creation available and shows no fabricated history", async () => {
  const { default: Page } = load("src/app/mindset/page.tsx", {
    "@/components/layout/app-shell": { AppShell: "shell" }, "@/components/ui/card": { Card: "card", CardHeader: "header" },
    "@/components/charts/mindset-chart": { MindsetChart: "chart" }, "@/components/domain/mindset-client": { MindsetEntryForm: "create", JournalEntryCard: "entry" },
    "@/lib/db": { getMindset: async () => [] },
  });
  const tree = await Page(); assert.match(JSON.stringify(tree), /No journal entries yet/);
  assert.equal(elements(tree, (node) => node.type === "create").length, 1); assert.equal(elements(tree, (node) => node.type === "entry").length, 0);
});
test("Income edit validates values and preserves owner, ID and unrelated data", async () => {
  const row = { id: "income", userId: "demo-user", source: "Before", amount: 12, goal: 100, type: "FREELANCE", month: dates.dateFromKey("2026-09-03"), status: "active", notes: "Keep", createdAt: new Date() };
  const original = { ...row }, paths = [];
  const db = load("src/lib/db/index.ts", { "@/lib/prisma": { prisma: { income: {
    update: async ({ where, data }) => {
      assert.equal(where.userId, "demo-user");
      if (where.id !== row.id) throw new Error("Not owned");
      Object.assign(row, Object.fromEntries(Object.entries(data).filter(([, v]) => v !== undefined)));
      return row;
    },
  } } } });
  const { editIncome } = load("src/lib/db/actions.ts", { "@/lib/db": db, "next/cache": { revalidatePath: (route) => paths.push(route) } });
  const payload = { id: row.id, source: " Corrected ", amount: 23.456, type: "OTHER" };
  for (const bad of [{ amount: -1 }, { amount: NaN }, { amount: Infinity }, { amount: "" }, { source: " " }, { type: "INVALID" }, { month: "2026-13" }, { month: "2026-09-01" }, { id: "foreign" }, { goal: -1 }]) await assert.rejects(() => editIncome({ ...payload, ...bad }));
  await editIncome({ ...payload, notes: "Cannot overwrite", status: "other", userId: "foreign" });
  assert.equal(row.source, "Corrected"); assert.equal(row.amount, 23.456); assert.equal(row.type, "OTHER"); assert.equal(row.month, original.month); assert.equal(row.goal, 100);
  await editIncome({ ...payload, month: "2026-08", goal: null });
  assert.equal(row.month.toISOString(), "2026-08-01T00:00:00.000Z"); assert.equal(row.goal, null);
  for (const key of ["id", "userId", "notes", "status", "createdAt"]) assert.equal(row[key], original[key]);
  assert.deepEqual(paths, ["/income", "/", "/income", "/"]);
});

test("Income edit UI loads persisted fields, retains failure and guards duplicate saves", async () => {
  let cursor = 0, refreshes = 0, resolveSave, rejectSave;
  const slots = [], calls = [], transitions = [];
  const { IncomeRecordCard } = load("src/components/domain/income-client.tsx", {
    FormData: class { constructor(values) { this.values = values; } get(key) { return this.values[key] ?? ""; } },
    react: {
      useState: (initial) => { const i = cursor++; if (!(i in slots)) slots[i] = initial; return [slots[i], (v) => { slots[i] = v; }]; },
      useRef: (initial) => { const i = cursor++; return slots[i] ??= { current: initial }; },
      useTransition: () => [false, (fn) => transitions.push(fn())],
    },
    "@/components/ui/card": { Card: "card", CardHeader: "header" }, "@/components/ui/progress-bar": { ProgressBar: "bar" },
    "next/navigation": { useRouter: () => ({ refresh: () => refreshes++ }) },
    "@/lib/db/actions": { editIncome: (input) => { calls.push(input); return new Promise((resolve, reject) => { resolveSave = resolve; rejectSave = reject; }); } },
  });
  const record = { id: "i", source: "Old", amount: 10, goal: 100, type: "FREELANCE", month: "2026-09" };
  let tree;
  const render = () => { cursor = 0; tree = IncomeRecordCard({ record }); };
  render(); elements(tree, (node) => node.type === "button")[0].props.onClick(); render();
  for (const key of ["source", "amount", "goal", "type", "month"]) assert.equal(elements(tree, (node) => node.props.name === key)[0].props.defaultValue, record[key]);
  const values = { source: "New", amount: "20.5", goal: "", type: "SAVINGS", month: "2026-08" };
  const submit = () => elements(tree, (node) => node.type === "form")[0].props.onSubmit({ preventDefault() {}, currentTarget: values });
  submit(); submit(); assert.equal(calls.length, 1); assert.equal(calls[0].goal, null); assert.equal(calls[0].month, "2026-08");
  rejectSave(new Error("offline")); await Promise.all(transitions); render();
  assert.match(JSON.stringify(tree), /Your edits have been kept/); assert.equal(refreshes, 0);
  submit(); resolveSave(); await Promise.all(transitions); render();
  assert.equal(refreshes, 1); assert.equal(elements(tree, (node) => node.type === "form").length, 0);
});
test("Health form sends only changed values, guards duplicates, retains failure and refreshes on success", async () => {
  let cursor = 0, refreshes = 0, resolveSave, rejectSave;
  const slots = [], calls = [], transitions = [], routes = [];
  const entry = { weight: 82, sleep: 6.5, water: null, steps: null, workouts: null, heartRate: null };
  const { HealthEntryForm } = load("src/components/domain/health-client.tsx", {
    FormData: class { constructor(values) { this.values = values; } get(key) { return this.values[key] ?? ""; } },
    react: {
      useState: (initial) => { const i = cursor++; if (!(i in slots)) slots[i] = initial; return [slots[i], (v) => { slots[i] = v; }]; },
      useRef: (initial) => { const i = cursor++; return slots[i] ??= { current: initial }; },
      useTransition: () => [false, (fn) => transitions.push(fn())],
    },
    "@/components/ui/card": { CardHeader: "header" },
    "next/navigation": { useRouter: () => ({ refresh: () => refreshes++, replace: (route) => routes.push(route) }) },
    "@/lib/db/actions": { saveHealth: (input) => { calls.push(input); return new Promise((resolve, reject) => { resolveSave = resolve; rejectSave = reject; }); } },
  });
  let tree;
  const render = () => { cursor = 0; tree = HealthEntryForm({ date: "2026-09-01", today: "2026-09-03", entry }); };
  const submit = (values) => elements(tree, (node) => node.type === "form")[0].props.onSubmit({ preventDefault() {}, currentTarget: values });
  render();
  submit({ weight: "82", sleep: "6.5" }); assert.equal(calls.length, 0);
  submit({ weight: "81.5", sleep: "6.5" }); submit({ weight: "81.5", sleep: "6.5" });
  assert.equal(calls.length, 1); assert.deepEqual(JSON.parse(JSON.stringify(calls[0])), { date: "2026-09-01", weight: 81.5 });
  rejectSave(new Error("offline")); await Promise.all(transitions); render();
  assert.match(JSON.stringify(tree), /Your input has been kept/); assert.equal(refreshes, 0);
  submit({ weight: "", sleep: "6.5" }); assert.equal(calls[1].weight, null); assert.equal(calls[1].sleep, undefined);
  resolveSave(); await Promise.all(transitions); assert.equal(refreshes, 1);
  elements(tree, (node) => node.props.type === "date")[0].props.onChange({ target: { value: "2026-08-01" } });
  assert.deepEqual(routes, ["/health?date=2026-08-01"]);
});
test("Health calendar upsert preserves omitted fields, clears null and validates without coercion", async () => {
  const rows = [], paths = [];
  const prisma = { healthMetric: {
    findMany: async ({ where }) => rows.filter((row) => row.userId === where.userId),
    upsert: async ({ where, update, create }) => {
      assert.equal(where.userId_date.userId, "demo-user");
      const found = rows.find((row) => row.date.getTime() === where.userId_date.date.getTime() && row.userId === where.userId_date.userId);
      if (found) Object.assign(found, Object.fromEntries(Object.entries(update).filter(([, value]) => value !== undefined)));
      else rows.push({ ...create });
    },
  } };
  const db = load("src/lib/db/index.ts", { "@/lib/prisma": { prisma } });
  const { saveHealth } = load("src/lib/db/actions.ts", { "@/lib/db": db, "next/cache": { revalidatePath: (route) => paths.push(route) } });
  const date = "2026-09-01";
  await saveHealth({ date, weight: 82, sleep: 6.5 });
  await saveHealth({ date, weight: 81.5 });
  assert.equal(rows.length, 1); assert.equal(rows[0].sleep, 6.5); assert.equal(rows[0].weight, 81.5);
  assert.equal(rows[0].date.toISOString(), "2026-09-01T00:00:00.000Z");
  await saveHealth({ date, weight: null });
  assert.equal(rows[0].weight, null); assert.equal(rows[0].sleep, 6.5);
  await saveHealth({ date, steps: 0 }); assert.equal(rows[0].steps, 0);
  for (const input of [{ date }, { date: "2026-02-30", sleep: 7 }, { date: "9999-01-01", sleep: 7 }, { date, weight: "" }, { date, weight: 0 }, { date, sleep: -1 }, { date, steps: 1.2 }, { date, water: Infinity }]) await assert.rejects(() => saveHealth(input));
  assert.equal(rows.length, 1); assert.equal((await db.getHealth()).length, 1);
  assert.deepEqual(paths, Array(4).fill(["/health", "/"]).flat());
});

test("Health page defaults to local today and loads exact historical dates without missing-value zeros", async () => {
  const row = { date: dates.dateFromKey("2026-09-01"), updatedAt: new Date(), weight: 82, sleep: null };
  const { default: Page } = load("src/app/health/page.tsx", {
    "@/components/layout/app-shell": { AppShell: "shell" }, "@/components/ui/card": { Card: "card", CardHeader: "header" },
    "@/components/ui/progress-ring": { ProgressRing: "ring" }, "@/components/charts/health-chart": { HealthChart: "chart" },
    "next/link": "link",
    "@/components/domain/health-client": { HealthEntryForm: "form" }, "@/lib/db": { getHealthPageData: async (day) => ({ history: [], entry: day === "2026-09-01" ? row : null, trend: [row] }) },
  });
  for (const date of [undefined, "2026-09-01", "2026-08-01", "9999-01-01", "invalid"]) {
    const tree = await Page({ searchParams: Promise.resolve({ date }) });
    assert.match(JSON.stringify(tree), /No health history yet/);
    const form = elements(tree, (node) => node.type === "form")[0];
    assert.equal(form.props.date, date && date < "9999" && date !== "invalid" ? date : dates.localDateKey(new Date()));
    assert.equal(form.props.entry, date === "2026-09-01" ? row : null);
    assert.equal(elements(tree, (node) => node.type === "chart")[0].props.data[0].hours, null);
  }
});
test("Health page queries are bounded, date-ordered and user-scoped", async () => {
  const queries = [];
  const record = { id: "real" };
  const db = load("src/lib/db/index.ts", { "@/lib/prisma": { prisma: { healthMetric: {
    findMany: async (query) => { queries.push(query); return [record]; },
    findUnique: async (query) => { queries.push(query); return record; },
  } } } });
  const result = await db.getHealthPageData("2026-09-03");
  assert.equal(result.entry, record); assert.equal(result.history[0], record);
  assert.equal(queries[0].where.userId, "demo-user"); assert.equal(queries[0].take, 30); assert.equal(queries[0].orderBy.date, "desc");
  assert.equal(queries[1].where.userId_date.userId, "demo-user"); assert.equal(queries[1].where.userId_date.date.toISOString(), "2026-09-03T00:00:00.000Z");
  assert.equal(queries[2].where.userId, "demo-user"); assert.equal(queries[2].orderBy.date, "asc");
  assert.equal(queries[2].where.date.gte.toISOString(), "2026-08-28T00:00:00.000Z");
});

test("Health history links reuse editor; sleep calendar preserves absent/null gaps and real zero", async () => {
  const rows = [
    { id: "a", date: dates.dateFromKey("2026-09-01"), sleep: 7 },
    { id: "b", date: dates.dateFromKey("2026-09-02"), sleep: null },
    { id: "c", date: dates.dateFromKey("2026-09-03"), sleep: 0 },
  ];
  const { default: Page } = load("src/app/health/page.tsx", {
    "next/link": "link", "@/components/layout/app-shell": { AppShell: "shell" },
    "@/components/ui/card": { Card: "card", CardHeader: "header" }, "@/components/ui/progress-ring": { ProgressRing: "ring" },
    "@/components/charts/health-chart": { HealthChart: "chart" }, "@/components/domain/health-client": { HealthEntryForm: "form" },
    "@/lib/db": { getHealthPageData: async () => ({ history: [...rows].reverse(), entry: null, trend: rows }) },
  });
  const render = () => Page({ searchParams: Promise.resolve({ date: "2026-09-03" }) });
  let tree = await render();
  const data = elements(tree, (node) => node.type === "chart")[0].props.data;
  assert.deepEqual(Array.from(data, (point) => point.hours), [null, null, null, null, 7, null, 0]);
  assert.equal(data[5].day, "2026-09-02");
  const links = elements(tree, (node) => node.type === "link");
  assert.equal(links[0].props.href, "/health?date=2026-09-03#health-editor");
  assert.equal(links[0].props["aria-current"], "date");
  assert.match(JSON.stringify(tree), /—/);
  rows[0].sleep = 8;
  tree = await render(); assert.equal(elements(tree, (node) => node.type === "chart")[0].props.data[4].hours, 8);
});

test("Sleep chart has honest zero/one-observation states and unsmoothed gaps", () => {
  const { HealthChart } = load("src/components/charts/health-chart.tsx", { recharts: { ResponsiveContainer: "container", LineChart: "chart", Line: "line", XAxis: "axis", Tooltip: "tooltip" } });
  assert.match(JSON.stringify(HealthChart({ data: [{ day: "2026-09-01", hours: null }] })), /No sleep data recorded yet/);
  const one = HealthChart({ data: [{ day: "2026-09-01", hours: 7 }] });
  assert.match(JSON.stringify(one), /At least two/); assert.equal(elements(one, (node) => node.type === "line").length, 0);
  const tree = HealthChart({ data: [{ day: "2026-09-01", hours: 7 }, { day: "2026-09-02", hours: null }, { day: "2026-09-03", hours: 6.5 }] });
  const line = elements(tree, (node) => node.type === "line")[0];
  assert.equal(line.props.connectNulls, false); assert.equal(line.props.type, "linear"); assert.equal(line.props.isAnimationActive, false); assert.equal(line.props.dot.r, 4);
});
test("Goal complete/reopen preserves 45, 80 and 100; editable non-DONE statuses stay intact", async () => {
  let row;
  const prisma = { goal: {
    update: async ({ where, data }) => {
      assert.equal(where.userId, "demo-user"); assert.equal(where.id, row.id);
      if (typeof where.status === "string" && where.status !== row.status) throw new Error("Invalid status");
      if (where.status?.not === row.status) throw new Error("Invalid status");
      if (data.status === "DONE") assert.deepEqual(Object.keys(data), ["status"]);
      row = { ...row, ...data }; return row;
    },
  } };
  const db = load("src/lib/db/index.ts", { "@/lib/prisma": { prisma } });
  for (const progress of [45, 80, 100]) {
    row = { id: "g", userId: "demo-user", title: "Keep", category: "CAREER", priority: "HIGH", status: "IN_PROGRESS", progress, deadline: null, description: null };
    const before = { ...row };
    await db.completeGoal(row.id); assert.deepEqual(row, { ...before, status: "DONE" });
    await db.reopenGoal(row.id); assert.deepEqual(row, before);
  }
  for (const status of ["NOT_STARTED", "BLOCKED", "IN_PROGRESS"]) {
    row.status = status;
    await db.updateGoal(row.id, { title: "Edited", description: null, deadline: null, progress: 45 });
    assert.equal(row.status, status); assert.equal(row.progress, 45);
  }
});

test("Goal history filters ownership/status and reopen preserves the same record", async () => {
  const rows = ["DONE", "IN_PROGRESS", "BLOCKED", "NOT_STARTED"].map((status, i) => ({ id: String(i), userId: "demo-user", status, progress: 100, title: "Goal", description: "Keep", category: "CAREER", priority: "HIGH", deadline: null }));
  rows.push({ ...rows[0], id: "foreign", userId: "foreign-user" });
  const paths = [];
  const prisma = { goal: {
    findMany: async ({ where }) => rows.filter((row) => row.userId === where.userId && (typeof where.status === "string" ? row.status === where.status : row.status !== where.status.not)),
    update: async ({ where, data }) => {
      const row = rows.find((row) => row.id === where.id && row.userId === where.userId && row.status === where.status);
      if (!row) throw new Error("Not found");
      Object.assign(row, data); return row;
    },
  } };
  const db = load("src/lib/db/index.ts", { "@/lib/prisma": { prisma } });
  assert.equal((await db.getGoalHistory("active")).length, 3);
  assert.equal((await db.getGoalHistory("completed")).length, 1);
  assert.equal((await db.getGoals()).length, 1);
  const { reopenCompletedGoal } = load("src/lib/db/actions.ts", { "@/lib/db": db, "next/cache": { revalidatePath: (route) => paths.push(route) } });
  await assert.rejects(() => reopenCompletedGoal(" "));
  await assert.rejects(() => reopenCompletedGoal("foreign"));
  await assert.rejects(() => reopenCompletedGoal("1"));
  const before = { ...rows[0] };
  await reopenCompletedGoal("0");
  assert.deepEqual(rows[0], { ...before, status: "IN_PROGRESS" });
  assert.equal(rows.length, 5);
  assert.equal((await db.getGoalHistory("completed")).length, 0);
  assert.equal((await db.getGoals()).length, 2);
  await assert.rejects(() => reopenCompletedGoal("0"));
  assert.deepEqual(paths, ["/", "/goals"]);
});

test("Goals page defaults to Active and exposes selected view and empty states honestly", async () => {
  const views = [];
  const { default: Page } = load("src/app/goals/page.tsx", {
    "next/link": "link", "@/components/layout/app-shell": { AppShell: "shell" },
    "@/components/goals/goals-client": { GoalsClient: "goals" },
    "@/lib/db": { getGoalHistory: async (view) => { views.push(view); return []; } },
  });
  for (const view of [undefined, "completed", "invalid"]) {
    const tree = await Page({ searchParams: Promise.resolve({ view }) });
    const selected = elements(tree, (node) => node.props["aria-current"] === "page")[0];
    assert.equal(selected.props.children, view === "completed" ? "Completed" : "Active");
  }
  assert.deepEqual(views, ["active", "completed", "active"]);
  const missions = fs.readFileSync(path.join(root, "src/components/goals/goal-manager.tsx"), "utf8");
  assert.match(missions, /href="\/goals"/);
  assert.match(missions, /window.confirm/);
  assert.match(fs.readFileSync(path.join(root, "src/lib/nav.ts"), "utf8"), /label: "Goals", href: "\/goals"/);
});

test("Goals reopen UI waits for persistence, guards duplicates and handles failure", async () => {
  let cursor = 0, calls = 0, refreshes = 0, resolveSave, rejectSave;
  const slots = [], transitions = [];
  const { GoalsClient } = load("src/components/goals/goals-client.tsx", {
    "@/components/goals/goal-manager": { GoalManager: "manager" },
    react: {
      useState: (initial) => { const i = cursor++; if (!(i in slots)) slots[i] = initial; return [slots[i], (value) => { slots[i] = value; }]; },
      useRef: (initial) => { const i = cursor++; return slots[i] ??= { current: initial }; },
      useTransition: () => [false, (fn) => transitions.push(fn())],
    },
    "next/navigation": { useRouter: () => ({ refresh: () => refreshes++ }) },
    "@/components/ui/card": { Card: "card" }, "@/components/ui/progress-bar": { ProgressBar: "progress" },
    "@/lib/db/actions": { reopenCompletedGoal: () => { calls++; return new Promise((resolve, reject) => { resolveSave = resolve; rejectSave = reject; }); } },
  });
  let goals = [], tree;
  const render = (view = "completed") => { cursor = 0; tree = GoalsClient({ goals, view }); };
  render(); assert.match(JSON.stringify(tree), /No completed goals yet/);
  render("active"); assert.equal(tree.type, "manager"); assert.equal(tree.props.missions.length, 0);
  goals = [{ id: "g", title: "Retained", category: "CAREER", priority: "MEDIUM", description: null, progress: 100, status: "DONE", deadline: null }];
  render(); const reopen = () => elements(tree, (node) => node.type === "button")[0].props.onClick();
  reopen(); reopen(); assert.equal(calls, 1); rejectSave(new Error("offline")); await Promise.all(transitions); render();
  assert.match(JSON.stringify(tree), /Could not reopen/); assert.equal(elements(tree, (node) => node.type === "article").length, 1);
  reopen(); resolveSave({}); await Promise.all(transitions); render();
  assert.equal(refreshes, 2); assert.equal(elements(tree, (node) => node.type === "article").length, 1);
  goals = []; render(); assert.equal(elements(tree, (node) => node.type === "article").length, 0);
});

test("Goal actions validate, scope writes, preserve metadata and complete without deleting", async () => {
  let row;
  const paths = [];
  const prisma = { goal: {
    create: async ({ data }) => (row = { id: "goal", ...data }),
    update: async ({ where, data }) => {
      if (where.id !== row.id || where.userId !== row.userId || (typeof where.status === "string" && where.status !== row.status) || (where.status?.not && where.status.not === row.status)) throw new Error("Not found");
      row = { ...row, ...data }; return row;
    },
    findMany: async ({ where }) => row && row.userId === where.userId && row.status === where.status ? [row] : [],
  } };
  const db = load("src/lib/db/index.ts", { "@/lib/prisma": { prisma } });
  const actions = load("src/lib/db/actions.ts", { "@/lib/db": db, "next/cache": { revalidatePath: (route) => paths.push(route) } });
  const valid = { title: " Goal ", category: "CAREER", progress: 0 };
  for (const patch of [{ title: " " }, { title: "x".repeat(201) }, { description: "x".repeat(2001) }, { progress: -1 }, { progress: 101 }, { progress: 1.5 }, { category: "OTHER" }, { deadline: "2026-02-30" }]) await assert.rejects(() => actions.addGoal({ ...valid, ...patch }));
  assert.equal(row, undefined);
  await actions.addGoal({ ...valid, userId: "foreign", status: "DONE" });
  assert.equal(row.userId, "demo-user"); assert.equal(row.status, "IN_PROGRESS"); assert.equal(row.priority, "MEDIUM");
  assert.equal(row.description, null); assert.equal(row.deadline, null);
  await actions.saveGoal({ id: row.id, title: "Edited", description: "Description", progress: 75, deadline: "2026-09-10", category: "INCOME", priority: "HIGH" });
  assert.equal(row.progress, 75); assert.equal(row.category, "CAREER"); assert.equal(row.priority, "MEDIUM");
  assert.equal(dates.localDateKey(row.deadline), "2026-09-10");
  await assert.rejects(() => actions.saveGoal({ id: row.id, title: "bad", progress: 101 }));
  const own = row;
  row = { ...row, userId: "foreign" };
  await assert.rejects(() => actions.markGoalComplete(row.id));
  await assert.rejects(() => actions.saveGoal({ id: row.id, title: "bad", progress: 1 }));
  row = own;
  await actions.saveGoal({ id: row.id, title: row.title, description: "", progress: 75, deadline: null });
  assert.equal(row.deadline, null); assert.equal(row.description, null);
  assert.equal((await db.getGoals()).length, 1);
  await actions.markGoalComplete(row.id);
  assert.equal(row.status, "DONE"); assert.equal(row.progress, 75); assert.equal(row.title, "Edited");
  assert.equal((await db.getGoals()).length, 0);
  await actions.markGoalComplete(row.id); // retained, repeat-safe completion
  await assert.rejects(() => actions.saveGoal({ id: row.id, title: "stale", progress: 0 }));
  assert.deepEqual(paths, Array.from({ length: 5 }, () => ["/", "/goals"]).flat());
});

test("Missions create/edit/complete preserve failed drafts and wait for server state", async () => {
  let cursor = 0, refreshes = 0, resolveSave, rejectSave, confirmed = false;
  const slots = [], calls = [];
  const mutate = (kind) => (input) => { calls.push({ kind, input }); return new Promise((resolve, reject) => { resolveSave = resolve; rejectSave = reject; }); };
  const { GoalManager: ActiveMissions } = load("src/components/goals/goal-manager.tsx", {
    "next/link": "link",
    window: { confirm: () => confirmed },
    react: {
      useState: (initial) => { const i = cursor++; if (!(i in slots)) slots[i] = initial; return [slots[i], (value) => { slots[i] = value; }]; },
      useRef: (initial) => { const i = cursor++; return slots[i] ??= { current: initial }; },
    },
    "next/navigation": { useRouter: () => ({ refresh: () => refreshes++ }) },
    "@/components/ui/card": { Card: "card", CardHeader: "header" },
    "@/components/ui/progress-bar": { ProgressBar: "progress" }, "@/components/ui/badge": { Badge: "badge" },
    "@/lib/db/actions": { addGoal: mutate("create"), saveGoal: mutate("update"), markGoalComplete: mutate("complete") },
  });
  let missions = [], tree;
  const render = () => { cursor = 0; tree = ActiveMissions({ missions }); };
  const field = (name) => elements(tree, (node) => node.props.name === name)[0];
  const type = (name, value) => { field(name).props.onChange({ target: { value } }); render(); };
  const button = (name) => elements(tree, (node) => node.type === "button" && node.props.children === name)[0];
  const submit = () => elements(tree, (node) => node.type === "form")[0].props.onSubmit({ preventDefault() {} });
  render(); assert.match(JSON.stringify(tree), /Create your first goal/);
  button("Create Goal").props.onClick(); render();
  type("title", "My goal"); type("category", "CAREER"); type("description", "Keep draft");
  const failed = submit(); await submit(); assert.equal(calls.length, 1); rejectSave(new Error("offline")); await failed; render();
  assert.equal(field("title").props.value, "My goal"); assert.equal(field("description").props.value, "Keep draft");
  const saved = submit(); resolveSave({ title: "My goal" }); await saved; render();
  assert.equal(refreshes, 1); assert.equal(elements(tree, (node) => node.type === "article").length, 0);
  missions = [{ id: "g", title: "My goal", description: "Keep draft", category: "career", priority: "medium", progress: 0, deadline: null, status: "in-progress" }]; render();
  button("Edit Goal").props.onClick(); render(); assert.equal(field("description").props.value, "Keep draft");
  type("progress", "50"); type("deadline", "2026-09-10"); const failedEdit = submit(); rejectSave(new Error("offline")); await failedEdit; render();
  assert.equal(field("progress").props.value, "50"); assert.equal(elements(tree, (node) => node.type === "progress")[0].props.percent, 0);
  const edit = submit(); resolveSave({ title: "My goal" }); await edit; render();
  const beforeComplete = calls.length;
  await button("Complete").props.onClick(); assert.equal(calls.length, beforeComplete);
  confirmed = true;
  const failedComplete = button("Complete").props.onClick(); await button("Complete").props.onClick(); rejectSave(new Error("offline")); await failedComplete; render();
  assert.equal(elements(tree, (node) => node.type === "article").length, 1);
  const done = button("Complete").props.onClick(); resolveSave({}); await done; render();
  assert.equal(refreshes, 3); missions = []; render(); assert.equal(elements(tree, (node) => node.type === "article").length, 0);
});

test("Career creation validates fields, defaults stage, scopes ownership and preserves calendar/week", async () => {
  const writes = [], paths = [];
  const db = load("src/lib/db/index.ts", { "@/lib/prisma": { prisma: { jobApplication: {
    create: async ({ data }) => { writes.push(data); return { id: "real-job", ...data }; },
    update: async ({ where, data }) => { if (where.userId !== "foreign-user") throw new Error("Not found"); return data; },
  } } } });
  const { addJobApplication } = load("src/lib/db/actions.ts", { "@/lib/db": db, "next/cache": { revalidatePath: (route) => paths.push(route) } });
  const valid = { company: " Company ", role: " Engineer ", appliedOn: "2026-09-10" };
  for (const patch of [{ company: " " }, { role: "" }, { company: "x".repeat(201) }, { role: "x".repeat(201) }, { stage: "OTHER" }, { appliedOn: "2026-02-30" }, { appliedOn: "not-date" }, { appliedOn: "" }]) await assert.rejects(() => addJobApplication({ ...valid, ...patch }));
  assert.equal(writes.length, 0);
  const saved = await addJobApplication({ ...valid, userId: "foreign-user", notes: "Not exposed" });
  assert.equal(saved.id, "real-job"); assert.equal(saved.userId, "demo-user"); assert.equal(saved.company, "Company"); assert.equal(saved.role, "Engineer");
  assert.equal(saved.stage, "APPLIED"); assert.equal(saved.notes, undefined);
  assert.equal(saved.appliedOn.toISOString(), "2026-09-09T23:00:00.000Z");
  assert.equal(dates.localDateKey(saved.appliedOn), "2026-09-10");
  const range = dates.weekTimestampRange("2026-09-07");
  assert.ok(saved.appliedOn >= range.start && saved.appliedOn < range.endExclusive);
  for (const stage of ["APPLIED", "INTERVIEW", "OFFER", "REJECTED"]) assert.equal((await addJobApplication({ ...valid, stage })).stage, stage);
  assert.deepEqual(paths, Array.from({ length: 5 }, () => ["/career", "/"]).flat());
  await assert.rejects(() => db.updateJobStage("foreign-job", "OFFER"), /Not found/);
});

test("Career creation form guards duplicates, retains failed drafts, resets only after persistence", async () => {
  let cursor = 0, calls = 0, refreshes = 0, resolveSave, rejectSave, submitted;
  const slots = [];
  const { CareerApplicationForm } = load("src/components/domain/career-application-form.tsx", {
    react: {
      useState: (initial) => { const i = cursor++; if (!(i in slots)) slots[i] = initial; return [slots[i], (value) => { slots[i] = value; }]; },
      useRef: (initial) => { const i = cursor++; return slots[i] ??= { current: initial }; },
    },
    "next/navigation": { useRouter: () => ({ refresh: () => refreshes++ }) },
    "@/components/ui/card": { Card: "card", CardHeader: "header" },
    "@/lib/db/actions": { addJobApplication: (input) => { calls++; submitted = input; return new Promise((resolve, reject) => { resolveSave = resolve; rejectSave = reject; }); } },
  });
  let tree;
  const render = () => { cursor = 0; tree = CareerApplicationForm({ today: "2026-09-02" }); };
  const field = (name) => elements(tree, (node) => node.props.name === name)[0];
  const type = (name, value) => { field(name).props.onChange({ target: { value } }); render(); };
  const submit = () => elements(tree, (node) => node.type === "form")[0].props.onSubmit({ preventDefault() {} });
  render(); assert.equal(field("stage").props.value, "APPLIED"); assert.equal(field("appliedOn").props.value, "2026-09-02");
  await submit(); assert.equal(calls, 0);
  type("company", "x".repeat(201)); type("role", "Engineer"); await submit(); render(); assert.equal(calls, 0); assert.equal(field("company").props.value.length, 201);
  type("company", "Company"); type("stage", "INTERVIEW"); type("appliedOn", "2026-09-10");
  const failure = submit(); await submit(); render(); assert.equal(calls, 1);
  assert.equal(elements(tree, (node) => node.type === "fieldset")[0].props.disabled, true);
  rejectSave(new Error("offline")); await failure; render();
  for (const [name, value] of Object.entries({ company: "Company", role: "Engineer", stage: "INTERVIEW", appliedOn: "2026-09-10" })) assert.equal(field(name).props.value, value);
  assert.match(JSON.stringify(tree), /Could not confirm/);
  const success = submit(); await submit(); assert.equal(calls, 2);
  assert.equal(submitted.stage, "INTERVIEW"); resolveSave({ id: "real-id", company: "Company" }); await success; render();
  assert.equal(field("company").props.value, ""); assert.equal(field("stage").props.value, "APPLIED"); assert.equal(refreshes, 2);
});

test("Career direct stage action validates enum and updates only stage", async () => {
  const writes = [], paths = [];
  const db = load("src/lib/db/index.ts", { "@/lib/prisma": { prisma: { jobApplication: {
    update: async (input) => { writes.push(input); return input.data; },
  } } } });
  const { setJobStage } = load("src/lib/db/actions.ts", { "@/lib/db": db, "next/cache": { revalidatePath: (route) => paths.push(route) } });
  for (const stage of ["INVALID", "applied", "", null]) await assert.rejects(() => setJobStage({ id: "job", stage }));
  assert.equal(writes.length, 0);
  const { JobStage } = load("src/generated/prisma/enums.ts");
  for (const stage of Object.values(JobStage)) await setJobStage({ id: "job", stage, company: "Must not change" });
  assert.deepEqual(writes.map((input) => input.data.stage), Object.values(JobStage));
  assert.ok(writes.every((input) => Object.keys(input.data).join() === "stage" && input.where.id === "job" && input.where.userId === "demo-user"));
  assert.deepEqual(paths, Object.values(JobStage).flatMap(() => ["/career", "/"]));
});

test("Career select has no cycling, no-op guard, failure retention and server refresh", async () => {
  let cursor = 0, refreshes = 0, resolveSave, rejectSave;
  const slots = [], calls = [], transitions = [];
  const hooks = {
    useState: (initial) => { const i = cursor++; if (!(i in slots)) slots[i] = initial; return [slots[i], (v) => { slots[i] = v; }]; },
    useRef: (initial) => { const i = cursor++; return slots[i] ??= { current: initial }; },
    useTransition: () => [false, (fn) => transitions.push(fn())],
  };
  const { CareerBoard } = load("src/components/domain/career-board.tsx", {
    react: hooks, "next/navigation": { useRouter: () => ({ refresh: () => refreshes++ }) },
    "@/lib/db/actions": { setJobStage: (input) => { calls.push(input); return new Promise((resolve, reject) => { resolveSave = resolve; rejectSave = reject; }); } },
  });
  let applications = [{ id: "job", company: "Company", role: "Engineer", stage: "applied", appliedOn: "2026-09-01" }], tree;
  const render = () => { cursor = 0; tree = CareerBoard({ applications }); };
  const select = () => elements(tree, (node) => node.type === "select")[0];
  render();
  assert.equal(elements(tree, (node) => node.type === "article")[0].props.onClick, undefined);
  assert.equal(elements(tree, (node) => node.type === "button").length, 0);
  assert.deepEqual(elements(tree, (node) => node.type === "option").map((node) => node.props.value), ["APPLIED", "INTERVIEW", "OFFER", "REJECTED"]);
  assert.match(select().props["aria-label"], /Company/);
  select().props.onChange({ target: { value: "APPLIED" } }); assert.equal(calls.length, 0);
  select().props.onChange({ target: { value: "REJECTED" } });
  select().props.onChange({ target: { value: "OFFER" } }); render();
  assert.equal(calls.length, 1); assert.equal(calls[0].stage, "REJECTED");
  assert.equal(select().props.value, "APPLIED"); assert.match(JSON.stringify(tree), /Saving stage/);
  rejectSave(new Error("offline")); await Promise.all(transitions); render();
  assert.equal(select().props.value, "APPLIED"); assert.match(JSON.stringify(tree), /Could not save/);
  select().props.onChange({ target: { value: "OFFER" } }); resolveSave(); await Promise.all(transitions); render();
  assert.equal(refreshes, 1); assert.equal(select().props.value, "APPLIED");
  applications = [{ ...applications[0], stage: "offer" }]; render(); assert.equal(select().props.value, "OFFER");
  applications = [{ ...applications[0], stage: "rejected" }]; render();
  select().props.onChange({ target: { value: "APPLIED" } }); resolveSave(); await Promise.all(transitions);
  assert.equal(calls.at(-1).stage, "APPLIED");
});

test("manual task creation reuses server validation, owner, defaults and revalidation", async () => {
  const writes = [], paths = [];
  const prisma = { task: { create: async ({ data }) => {
    writes.push(data);
    return { id: "persisted", status: "PENDING", completedAt: null, ...data };
  } } };
  const db = load("src/lib/db/index.ts", { "@/lib/prisma": { prisma } });
  const { addTask } = load("src/lib/db/actions.ts", {
    "@/lib/db": db, "next/cache": { revalidatePath: (route) => paths.push(route) },
  });
  for (const patch of [{ title: "" }, { title: "   " }, { title: "x".repeat(201) }, { description: "x".repeat(2001) }, { priority: "INVALID" }, { dueDate: "not-a-date" }]) {
    await assert.rejects(() => addTask({ title: "Valid", priority: "MEDIUM", ...patch }));
  }
  assert.equal(writes.length, 0);
  const minimal = await addTask({ title: "  My work  ", priority: "MEDIUM" });
  assert.equal(minimal.title, "My work");
  assert.equal(minimal.userId, "demo-user");
  assert.equal(minimal.status, "PENDING");
  assert.equal(minimal.description, undefined);
  assert.equal(minimal.dueDate, undefined);
  for (const priority of ["LOW", "MEDIUM", "HIGH", "CRITICAL"]) {
    const saved = await addTask({ title: "x".repeat(200), description: "y".repeat(2000), priority, dueDate: dates.dateFromKey("2026-09-10") });
    assert.equal(saved.priority, priority);
    assert.equal(saved.description.length, 2000);
    assert.equal(saved.dueDate.toISOString(), "2026-09-10T00:00:00.000Z");
    assert.equal(dates.localDateKey(saved.dueDate), "2026-09-10");
    const { getNextAction } = load("src/lib/tasks/next-action.ts");
    assert.match(getNextAction([{ ...saved, createdAt: new Date() }], new Date("2026-09-01")).due.label, /10 Sept? 2026/);
  }
  assert.deepEqual(paths, Array.from({ length: 5 }, () => ["/", "/tasks"]).flat());
});

test("Tasks form preserves failed/invalid drafts, guards duplicate submit and uses server refresh", async () => {
  let cursor = 0, calls = 0, refreshes = 0, resolveSave, rejectSave, submitted;
  const slots = [], transitions = [], statusCalls = [];
  const hooks = {
    useState: (initial) => { const i = cursor++; if (!(i in slots)) slots[i] = initial; return [slots[i], (value) => { slots[i] = typeof value === "function" ? value(slots[i]) : value; }]; },
    useRef: (initial) => { const i = cursor++; return slots[i] ??= { current: initial }; },
    useTransition: () => [false, (fn) => transitions.push(fn())],
  };
  const { TasksClient } = load("src/components/tasks/tasks-client.tsx", {
    react: hooks, "next/navigation": { useRouter: () => ({ refresh: () => refreshes++ }) },
    "lucide-react": {}, "@/components/ui/card": { Card: "card", CardHeader: "header" },
    "@/lib/db/actions": {
      addTask: (input) => { calls++; submitted = input; return new Promise((resolve, reject) => { resolveSave = resolve; rejectSave = reject; }); },
      setTaskStatus: async (input) => { statusCalls.push(input); return { status: "DONE" }; },
    },
  });
  let tree, tasks = [];
  const render = () => { cursor = 0; tree = TasksClient({ tasks }); };
  const field = (name) => elements(tree, (node) => node.props.name === name)[0];
  const type = (name, value) => { field(name).props.onChange({ target: { value } }); render(); };
  const submit = () => elements(tree, (node) => node.type === "form")[0].props.onSubmit({ preventDefault() {} });
  render();
  assert.match(JSON.stringify(tree), /Create a task above/);
  await submit(); render(); assert.equal(calls, 0);
  type("title", "x".repeat(201)); await submit(); render(); assert.equal(calls, 0); assert.equal(field("title").props.value.length, 201);
  type("title", "My own task"); type("description", "x".repeat(2001)); await submit(); render(); assert.equal(calls, 0);
  type("description", "Keep this description"); type("dueDate", "2026-02-30"); await submit(); render(); assert.equal(calls, 0);
  type("dueDate", "2026-09-10"); type("priority", "HIGH");
  const failed = submit(); await submit(); render(); assert.equal(calls, 1);
  assert.equal(elements(tree, (node) => node.type === "fieldset")[0].props.disabled, true);
  rejectSave(new Error("offline")); await failed; render();
  assert.equal(field("title").props.value, "My own task");
  assert.equal(field("description").props.value, "Keep this description");
  assert.equal(field("priority").props.value, "HIGH");
  assert.equal(field("dueDate").props.value, "2026-09-10");
  assert.match(JSON.stringify(tree), /Could not confirm the save/);
  const saving = submit(); await submit(); assert.equal(calls, 2);
  assert.equal(submitted.dueDate.toISOString(), "2026-09-10T00:00:00.000Z");
  resolveSave({ id: "real-id", title: "My own task" }); await saving; render();
  assert.equal(field("title").props.value, ""); assert.equal(field("priority").props.value, "MEDIUM");
  assert.equal(refreshes, 2);
  assert.equal(elements(tree, (node) => node.type === "article").length, 0); // No fake optimistic record.
  tasks = [{ id: "real-id", title: "My own task", description: null, priority: "HIGH", status: "PENDING", dueDate: submitted.dueDate.toISOString() }];
  render(); assert.equal(elements(tree, (node) => node.type === "article")[0].key, "real-id");
  assert.match(JSON.stringify(tree), /Sep 10, 2026/);
  const start = elements(tree, (node) => node.type === "button" && JSON.stringify(node.props.children).includes("Start Task"))[0];
  start.props.onClick(); start.props.onClick(); await Promise.all(transitions); render();
  assert.equal(statusCalls.length, 1); assert.equal(statusCalls[0].expectedStatus, "PENDING");
  assert.match(JSON.stringify(tree), /changed elsewhere/);
  tasks = [{ ...tasks[0], status: "IN_PROGRESS" }]; render();
  elements(tree, (node) => node.type === "button" && JSON.stringify(node.props.children).includes('"Complete"'))[0].props.onClick();
  await Promise.all(transitions);
  assert.equal(statusCalls[1].expectedStatus, "IN_PROGRESS");
});

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

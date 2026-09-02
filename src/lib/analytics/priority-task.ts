// Read-side compatibility for existing generated tasks. Numeric evidence may
// change after logging activity, but the action and explanation template remain.
// Callers MUST supply only this user's active-week tasks, newest first.
// This is not provenance: a manual task copying both fields remains ambiguous;
// changed action/template wording intentionally does not match by title alone.
export function matchesPriorityTask(
  task: { title: string; description: string | null },
  title: string,
  reason: string,
) {
  const template = (text: string) => text.replace(/[+-]?\d+(?:\.\d+)?/g, "#");
  return task.title === title && task.description !== null &&
    template(task.description) === template(reason);
}

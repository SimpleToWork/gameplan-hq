// Unit tests for the Feature Branch orchestration pure logic.
//
// The SPA (public/index.html) is one self-contained, no-build file whose script can't be imported here,
// so these helpers are mirrored verbatim from the `FEATURE BRANCHES` block in index.html. Keep the two in
// sync — if you change the logic there, change it here (and vice-versa). Run with: `npm test` (node --test).
import { test } from "node:test";
import assert from "node:assert/strict";

// ── mirrored from public/index.html ──
const normRepo = u => String(u || "").replace(/\.git$/, "").replace(/\/+$/, "").toLowerCase();
const slugifyBranch = s => String(s || "").trim().toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 60);
const featureBranchName = s => { const slug = slugifyBranch(s); return slug ? "feature/" + slug : ""; };
const branchNameExists = (branches, branchName, repoId) => {
  const bn = String(branchName || "").toLowerCase();
  return (branches || []).some(b => normRepo(b.repo_id || b.repoUrl || "") === repoId && String(b.branch_name || "").toLowerCase() === bn);
};
function assignBranchError(task, branch) {
  if (!task) return "No task";
  if (!branch) return "No branch";
  if (branch.status === "merged") return "Branch already merged";
  if (!task.repoUrl) return "Assign a repo to the task first";
  if (normRepo(task.repoUrl) !== normRepo(branch.repo_id || branch.repoUrl || "")) return "Task is in a different repo";
  return null;
}
function taskBuildState(t) {
  if (t.build_state) return t.build_state;
  if (t.runStatus === "running" || t.runStatus === "queued") return "building";
  if (t.status === "Done") return "success";
  if (t.runError || t.status === "Stuck") return "failed";
  return "idle";
}
function mergePreconditions({ branch, tasks, runnerOnline, otherMerging }) {
  const reasons = [];
  if (!tasks || !tasks.length) reasons.push("No tasks assigned to this branch");
  else { const unfinished = tasks.filter(t => { const bs = taskBuildState(t); return !(bs === "success" || bs === "passed"); }); if (unfinished.length) reasons.push(unfinished.length + " task" + (unfinished.length !== 1 ? "s" : "") + " not yet finished"); }
  if (branch.checks_status !== "green") reasons.push("Checks are not green");
  if (!runnerOnline) reasons.push("Runner is offline");
  if (otherMerging) reasons.push("Another branch is mid-merge in this repo");
  return { ok: reasons.length === 0, reasons };
}

// ── create form: slugify + derived branch_name + uniqueness ──
test("slugifyBranch normalizes to a kebab slug", () => {
  assert.equal(slugifyBranch("Checkout Redesign!"), "checkout-redesign");
  assert.equal(slugifyBranch("  Fix   the BUG #42 "), "fix-the-bug-42");
  assert.equal(slugifyBranch("--leading/trailing--"), "leading-trailing");
  assert.equal(slugifyBranch(""), "");
  assert.equal(slugifyBranch("   "), "");
});

test("slugifyBranch caps length at 60 chars", () => {
  assert.equal(slugifyBranch("a".repeat(80)).length, 60);
});

test("featureBranchName prefixes feature/ and is empty for blank input", () => {
  assert.equal(featureBranchName("Checkout Redesign"), "feature/checkout-redesign");
  assert.equal(featureBranchName(""), "");
  assert.equal(featureBranchName("!!!"), "");
});

test("branchNameExists is repo-scoped and case-insensitive", () => {
  const branches = [
    { repo_id: "https://github.com/acme/web", branch_name: "feature/login" },
    { repoUrl: "https://github.com/acme/api", branch_name: "feature/cache" },
  ];
  assert.equal(branchNameExists(branches, "feature/login", normRepo("https://github.com/acme/web")), true);
  assert.equal(branchNameExists(branches, "FEATURE/LOGIN", normRepo("https://github.com/acme/web.git")), true, "ignores case + .git suffix");
  assert.equal(branchNameExists(branches, "feature/login", normRepo("https://github.com/acme/api")), false, "different repo → not a dup");
  assert.equal(branchNameExists(branches, "feature/new", normRepo("https://github.com/acme/web")), false);
  assert.equal(branchNameExists([], "feature/login", "x"), false);
});

// ── assignment constraints ──
test("assignBranchError enforces same-repo, non-merged, repo-present", () => {
  const branch = { repo_id: "https://github.com/acme/web", status: "ready" };
  assert.equal(assignBranchError({ repoUrl: "https://github.com/acme/web" }, branch), null, "same repo → allowed");
  assert.equal(assignBranchError({ repoUrl: "https://github.com/acme/web.git/" }, branch), null, "normalized match → allowed");
  assert.equal(assignBranchError({ repoUrl: "https://github.com/acme/api" }, branch), "Task is in a different repo");
  assert.equal(assignBranchError({}, branch), "Assign a repo to the task first");
  assert.equal(assignBranchError({ repoUrl: "https://github.com/acme/web" }, { ...branch, status: "merged" }), "Branch already merged");
  assert.equal(assignBranchError(null, branch), "No task");
  assert.equal(assignBranchError({ repoUrl: "x" }, null), "No branch");
});

test("taskBuildState derives from build_state then run/status", () => {
  assert.equal(taskBuildState({ build_state: "passed" }), "passed", "explicit wins");
  assert.equal(taskBuildState({ runStatus: "running" }), "building");
  assert.equal(taskBuildState({ runStatus: "queued" }), "building");
  assert.equal(taskBuildState({ status: "Done" }), "success");
  assert.equal(taskBuildState({ status: "Stuck" }), "failed");
  assert.equal(taskBuildState({ runError: "boom" }), "failed");
  assert.equal(taskBuildState({ status: "Not started" }), "idle");
});

// ── merge precondition / disabled logic ──
const greenDoneTask = { status: "Done", build_state: "success" };
const okBranch = { checks_status: "green" };

test("mergePreconditions passes only when every gate is satisfied", () => {
  const r = mergePreconditions({ branch: okBranch, tasks: [greenDoneTask, greenDoneTask], runnerOnline: true, otherMerging: false });
  assert.equal(r.ok, true);
  assert.deepEqual(r.reasons, []);
});

test("mergePreconditions blocks with no tasks", () => {
  const r = mergePreconditions({ branch: okBranch, tasks: [], runnerOnline: true, otherMerging: false });
  assert.equal(r.ok, false);
  assert.ok(r.reasons.includes("No tasks assigned to this branch"));
});

test("mergePreconditions blocks on unfinished tasks (pluralized)", () => {
  const r = mergePreconditions({ branch: okBranch, tasks: [greenDoneTask, { status: "Working on it" }, { status: "Stuck" }], runnerOnline: true, otherMerging: false });
  assert.equal(r.ok, false);
  assert.ok(r.reasons.some(x => x === "2 tasks not yet finished"));
});

test("mergePreconditions blocks on red checks, offline runner, and concurrent merge", () => {
  const r = mergePreconditions({ branch: { checks_status: "red" }, tasks: [greenDoneTask], runnerOnline: false, otherMerging: true });
  assert.equal(r.ok, false);
  assert.ok(r.reasons.includes("Checks are not green"));
  assert.ok(r.reasons.includes("Runner is offline"));
  assert.ok(r.reasons.includes("Another branch is mid-merge in this repo"));
});

test("mergePreconditions: single unfinished task is singular", () => {
  const r = mergePreconditions({ branch: okBranch, tasks: [{ status: "Working on it" }], runnerOnline: true, otherMerging: false });
  assert.ok(r.reasons.some(x => x === "1 task not yet finished"));
});

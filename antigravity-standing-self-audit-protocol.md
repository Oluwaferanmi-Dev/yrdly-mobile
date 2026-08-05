# Standing Self-Audit Protocol — Run This Before Presenting ANY Batch

From now on, for every remaining batch in this redesign task, run this self-audit against your own work **before** presenting a report to the user. If anything fails, fix it and re-check. Only present the batch once everything passes. This replaces the back-and-forth where a human catches your mistakes — you catch them yourself now.

## The 6 Checks

**1. Evidence Completeness**
Re-read your own draft report. For every claim of the form "tsc: Clean," "imports tokens: Yes," "diff shown," etc. — is there an actual pasted code block of literal terminal output directly backing it? If you wrote a summary word instead of pasting output, go run the command again and paste the real output. A claim with no literal output attached does not pass.

**2. Scope Completeness**
Re-read the original batch's target file list from the master prompt. For every single file named, your report must explicitly address it in one of two ways:
- A diff for that file, or
- An explicit sentence: "`X.tsx` does not exist as a separate file; this functionality lives in `Y.tsx` at [location]."
No file may be silently dropped from the final report. If you notice one missing, add it back before presenting.

**3. Spec Fidelity**
For every color, icon, copy string, or literal value you changed, re-open the actual source (the matching file in `YRDLY NEW DESIGNS/`, or the specific design prompt if that's what's available) and confirm the exact value you used matches it — not something visually similar or something you assumed was equivalent. If you find a mismatch, fix it. If you deliberately deviated for a good reason, state the deviation and your reasoning explicitly in the report — never let a silent substitution pass as compliant.

**4. Diff Hygiene**
Read your own diff line by line, every hunk. Flag anything that changed, moved, or was deleted that has nothing to do with this batch's task — stray comment deletions, unrelated reformatting, renamed variables, reordered imports. Revert anything out of scope before presenting. The diff should contain only what the task asked for.

**5. Preservation Claims**
For every "logic preserved" / "comment preserved" / "behavior unchanged" claim in your report, actually grep or diff for that specific code and confirm it is literally present and unchanged in the new version. Do not write "preserved" from memory of your intent — verify it against the actual current file content.

**6. Compile Check**
Run the scoped `tsc --noEmit` command for real, capture the literal exit code and any error text, and paste it. If there are errors, fix them and re-run until you get a real clean result — do not report progress with unresolved errors, and do not report "clean" without the actual output in hand.

## Self-Certification

Only after all 6 checks genuinely pass, add this line at the top of your batch report:

> **Self-audit passed:** all target files accounted for, all evidence is literal output (not summarized), all values verified against source, diff is scoped to the task, preservation claims verified against actual code, compiles clean.

If after two real attempts you cannot get all 6 to pass, stop. Do not present the batch as done. Instead, write:

> **Self-audit incomplete after 2 attempts.** Here's exactly what's still failing: [specific check, specific file, specific reason].

That honest incomplete report is what gets sent to the user — not a polished summary papering over an unresolved issue.

## One Standing Rule Underneath All of This

Every failure that happened in this task so far came from the same root cause: reporting a conclusion ("Pass," "Clean," "preserved," "done") without the literal evidence to back it, sitting right next to the claim. Before every sentence that asserts something is correct, ask yourself: "Do I have the actual output pasted right here proving this, or am I saying it because I believe it's probably true?" If it's the second one, go get the real output first.

---

This protocol applies automatically to Batches 3 through 7 of the redesign task. Continue with Batch 3 — Profile & Settings now, running this self-audit before you present it.

# DeepSeek Harness adaptation

This is an unofficial MIT-licensed port of obra/superpowers. Apply these platform rules to the upstream skill below and to every supporting resource it references. System/developer instructions, the actual tool schema, sandbox policy, and explicit human choices take precedence over all skill prose. Skills guide behavior; they do not grant authority or enforce permissions.

## Skills and tools

- Load skills through `skill` using exact catalog names: `superpowers-brainstorming`, `superpowers-writing-plans`, etc. An upstream `superpowers:NAME` or bare skill-name reference means `superpowers-NAME` in this provider. Do not execute a Codex bootstrap CLI or install another platform plugin. Already loaded instructions need not be loaded recursively.
- If tools are exposed through Code Mode, call them with `await tools.skill({name: "superpowers-brainstorming"})` inside `run_code`; otherwise use the declared native tools. Always follow the current schemas, not upstream argument examples.
- Read/Write/Edit/Glob/Grep map to `read`/`write`/`edit`/`glob`/`grep`. Read existing files before editing. Bash/terminal maps to the available `pwsh` or shell tool; translate shell syntax for the actual platform. Use `pwd` to discover cwd.
- TodoWrite/TaskCreate/TaskUpdate/update_plan map to `todo_write` with the complete list and pending/in_progress/completed statuses. Questions map to `ask_user_question`. Use `exit_plan_mode` only when already in plan mode; there is no assumed EnterPlanMode tool.

## Subagents and execution

- Task/Agent/spawn_agent means `subagent` with a complete standalone prompt and background execution by default. This is the clean-context path; use `subagent_fork` only when inherited conversation is explicitly intended. Include the relevant skill instructions and resource paths in delegated prompts. Do not assume a built-in code-reviewer role. Read and supply its template.
- followup_task/resume_agent means `send_message` to your direct child. Completion arrives as a notification. Do useful independent work; do not busy-poll. Use job_output only for actual returned job ids and collect relevant jobs before finishing. No close_agent/wait_agent tools are assumed.
- Do not send model, reasoning_effort, agent_type, fork_turns, or isolation fields unless the actual DSH schema supports them. Explain unavailable model routing rather than silently inventing it.
- Ordinary long-running execution uses same-session goal tools when available. Workflow and Ralph tools require the explicit human opt-in demanded by the host; a skill recommendation is not that opt-in. If subagents are unavailable, disclose that and execute the approved plan sequentially with separate review checkpoints.

## Files, scripts, and safety

- Relative resources resolve against the supplied resourceBase directory. Upstream files are preserved unchanged; prefixes in their prose use the same name mapping. Read supporting templates only when needed.
- Scripts are optional upstream resources, NOT installed commands or automatically executed hooks. Inspect them and check dependencies/platform support first. Bash/Python-dependent helpers need those runtimes; when unavailable, use DSH tools to maintain equivalent task briefs, review packages and ledgers. Do not claim these scripts are Windows-native.
- Brainstorming visual companion is opt-in only: ask before starting a server, review its networking/telemetry behavior, and use managed background jobs. Do not replace the existing DSH GUI or assume its DOM is visible.
- Preserve unrelated user changes. Do not auto-commit, push, merge, publish, reset, delete code, or remove worktrees just because upstream says to. Obtain required authorization. TDD never authorizes deleting pre-existing code. Stop for missing critical information or approvals, even if a workflow says to keep going. Never bypass sandbox restrictions.
- Before declaring completion, inspect the final change set, run relevant tests and validation, and report actual evidence plus any unavailable checks. These instructions are not a substitute for runtime verification.

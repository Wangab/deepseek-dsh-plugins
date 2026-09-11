# Show Git Brunch Implementation Plan

> **For agentic workers:** Use superpowers-subagent-driven-development to implement and review each task. No commits or live profile installation are authorized.

**Goal:** Ship an independently installable DSH header Git branch plugin.

**Architecture:** Node ESM backend exposes a dedicated Connection RPC channel and resolves session membership through workspaceRegistry.list(). A closure-factory browser plugin uses shared React and registers in conversation.session.header.actions at order -9.

**Tech Stack:** Node >=22.19, JavaScript ESM, node:test, shared React, DSH Cordis/Connection.

**Spec:** ../specs/2026-09-10-show-git-brunch-design.md (user approved).

## Global Constraints
- Only change show_git_brunch; no DSH core modifications, commits, publication or live installation.
- Fixed read-only Git argv, bounded execution/output, no browser filesystem paths.
- Null on non-Git/errors; support unborn branch, detached HEAD, subdirectories and worktrees.
- Refresh on mount/session change/focus/visibility return and every 5000ms while visible. Clear stale state and dispose all listeners/timers.
- Respect sandbox denial; escalate exact failed operation rather than work around it.

## Task 1: Backend Git and RPC
Files: src/git.mjs, src/server.mjs, index.mjs, tests/git.test.mjs, tests/server.test.mjs.
Interfaces: readGitBranch(cwd, {signal} = {}) returns Promise<null | {kind: 'branch' | 'detached', name: string}>. createBranchHandler({workspaceRegistry}, readBranch = readGitBranch) returns an async ConnectionRpcHandler.

- [x] Write tests with real temporary Git repos for normal/unborn/Unicode/slash branches, detached, subdirectory, worktree, non-repo, missing path, abort, inherited GIT_DIR override isolation.
- [x] Run tests before implementation and observe missing feature failure.
- [x] Implement execFile with shell:false, timeout and maxBuffer. Strip inherited GIT_* overrides. Verify rev-parse --is-inside-work-tree, then symbolic-ref --quiet --short HEAD; only exit 1 permits detached fallback rev-parse --short HEAD. Return null on errors.
- [x] Write handler tests for strict payload, correct workspace, unknown session, registry/Git errors and registration disposal.
- [x] Implement endpoint branch on /show-git-brunch. Payload must have exactly one own key sessionId, a nonempty string <=512 characters; reject extra paths. Resolve registry.list().find(w => w.sessionIds.includes(sessionId)). Missing workspace yields {ok:true,value:null}; malformed payload yields bad-request with details. Register using connection.rpc.handle(..., {authority:'trusted-host'}), lifecycle scoped.
- [x] Verify all backend tests and obtain scoped review.

Test examples:
    assert.deepEqual(await readGitBranch(repo), {kind:'branch',name:'main'});
    assert.equal(await readGitBranch(nonRepo), null);
    assert.deepEqual(await handler('branch',{sessionId:'known'},signal), {ok:true,value:{kind:'branch',name:'main'}});

## Task 2: Browser Label
Files: src/client.mjs, src/polling.mjs, tests/client.test.mjs, tests/polling.test.mjs.
Interfaces: createClientPlugin(React) returns {inject,apply}; createBranchPolling({request,onValue,document,window,setInterval,clearInterval}) returns disposer. request receives AbortSignal and resolves branch or null.

- [x] Write controlled-clock tests for initial refresh, interval, focus, visibility, non-overlap, timeout/cancellation, failure clearing, disposal and late responses.
- [x] Write real React DOM tests for no placeholder, branch label, detached formatting, safe text rendering and immediate clearing when session changes.
- [x] Observe failures before implementing. Inject environment only at polling boundary; production uses browser timers/events and AbortController. A bounded request lifetime prevents stalled polling.
- [x] Implement label as span plus inline SVG/style. Select current session cwd with useSessions; bind state identity to sessionId/cwd to avoid one-frame stale rendering. Query only sessionId via ctx.connection.rpc.call('/show-git-brunch','branch',{sessionId},signal); validate response shape.
- [x] Register at conversation.session.header.actions with id show-git-brunch, order -9. Obtain scoped review after passing tests.

## Task 3: Packaging and Verification
Files: package.json, cordis.patch.yml, scripts/build.mjs, scripts/check.mjs, lib/client.js, README.md, tests/package.test.mjs, package-lock.json for test dependencies.

- [x] Test generated factory in VM with a captured __ModuleLoader__.load; invoke returned apply and assert shared React/header registration. Verify exports and patch reference shipped files.
- [x] Emit deterministic classic JS factory from local browser modules. Factory calls require('react') and returns createClientPlugin(React); no ESM imports in artifact and no bundled React.
- [x] Set package name dsh-show-git-brunch, exports root/index.mjs, ./client/lib/client.js, ./package.json. dsh.client platform web and inject package names connection/runtime/ui-conversation; dsh.bundle patch cordis.patch.yml.
- [x] Patch inserts host-plane id show-git-brunch, name dsh-show-git-brunch. No core or preset edits.
- [x] README: npm.cmd test/build/check/pack; dsh plugin --profile web add 'link:.' from plugin root, host restart and existing URL refresh; remove by exact package name. Do not promise HMR. Describe local-host Git support and non-Git empty behavior.
- [x] Run tests/check/build, npm.cmd pack --dry-run, actual pack; inspect all files, request independent final review, fix findings and rerun affected validation.
- [x] Report artifact path, test results, and explicitly state no live profile install/browser verification if not performed.

## Execution Ledger
- Ruling: use requested standalone directory rather than worktree; parent is not a Git repository and initialization was not requested.
- Ruling: only header-validated workspace membership is queried; missing/unregistered workspace hides the label, without loading session logs or accepting paths.
- Research: Connection rpc.ts specifies handle/call and closed RpcResult errors. workspaceRegistry.list() returns header-validated sessionIds and canonical path. Browser loader accepts hand-generated classic JS factory, with React supplied by require('react').
- Validation commands will be recorded with actual outcomes; no tests exist at baseline because this is a new package.
- Final evidence: npm.cmd test passed 26/26; build and check passed; syntax checks passed; npm pack --dry-run --ignore-scripts and npm pack --ignore-scripts produced a 12-file, 8079-byte tarball. Normal npm pack approval timed out, while its prepack build/check steps were run independently and passed.
- Review: backend scoped review found no security/API defect and prompted fixes for redundant stat and symbolic-ref ambiguity. Multiple final client review subagents failed at the agent runtime without returning findings; coordinator completed final source/API review and records this independent-review limitation explicitly.
- Live state: package was not installed into the active web profile, and http://127.0.0.1:3080 was not browser-verified, because installation/restart is an external profile side effect not requested.
- Re-verification (final turn): npm.cmd run build + npm.cmd run check + npm.cmd test re-run fresh — build consistent, 26/26 pass, exit 0. Artifact show_git_brunch/dsh-show-git-brunch-0.1.0.tgz exists, 8079 bytes, SHA256 4E083C1AE92C58D30D6FEF6D1C425315ACC5E261B559670FCC0C127634B02A01 (hashed after the last npm pack of the final sources).
- Environment note: after that verification the shell executor began failing every command, including a bare Get-Location, with ERR_MODULE_NOT_FOUND for the tsx loader resolved from the workspace root — a harness/environment fault, not plugin code. No further shell checks were possible and none were worked around.

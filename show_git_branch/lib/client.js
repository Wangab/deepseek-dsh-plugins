window.__ModuleLoader__.load({
	id: "show-git-branch",
	factory: (require) => {
		var module = { exports: {} };
		var exports = module.exports;
		Object.defineProperty(exports, Symbol.toStringTag, { value: "Module" });
		let _deepseek_ai_dsh_client_store = require("@deepseek-ai/dsh-client-store");
		let react = require("react");
		let react_jsx_runtime = require("react/jsx-runtime");
		//#region src/client/GitBranchChip.tsx
		/** A minimal branch glyph drawn with primitives (circles plus a joining path). */
		function BranchGlyph() {
			return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("svg", {
				viewBox: "0 0 16 16",
				width: "13",
				height: "13",
				"aria-hidden": "true",
				fill: "none",
				stroke: "currentColor",
				strokeWidth: "1.5",
				strokeLinecap: "round",
				children: [
					/* @__PURE__ */ (0, react_jsx_runtime.jsx)("circle", {
						cx: "4.25",
						cy: "4.25",
						r: "1.9"
					}),
					/* @__PURE__ */ (0, react_jsx_runtime.jsx)("circle", {
						cx: "4.25",
						cy: "11.75",
						r: "1.9"
					}),
					/* @__PURE__ */ (0, react_jsx_runtime.jsx)("circle", {
						cx: "11.75",
						cy: "4.25",
						r: "1.9"
					}),
					/* @__PURE__ */ (0, react_jsx_runtime.jsx)("path", { d: "M4.25 6.15v3.7" }),
					/* @__PURE__ */ (0, react_jsx_runtime.jsx)("path", { d: "M11.75 6.15v.85c0 1.33-1.07 2.4-2.4 2.4H4.25" })
				]
			});
		}
		/**
		* The composer's git-branch chip: the session workspace's current branch,
		* rendered beside the mode selector. Renders nothing while the Session has no
		* workspace directory, the branch is still resolving, or the directory is not
		* inside a git repository — the seat stays visually empty instead of broken.
		* @param props - session runtime, injected controller face, and localized copy.
		* @returns the branch chip, or null when there is nothing to show.
		*/
		function GitBranchChip({ sessionId, useSessions, useGitBranches, refreshBranch, t }) {
			const cwd = useSessions((state) => state.byId[sessionId]?.cwd);
			const entry = useGitBranches((state) => cwd === void 0 || cwd === "" ? void 0 : state[cwd]);
			(0, react.useEffect)(() => {
				if (cwd !== void 0 && cwd !== "") refreshBranch(cwd);
			}, [cwd, refreshBranch]);
			if (cwd === void 0 || cwd === "") return null;
			if (entry === void 0 || entry.status !== "ok") return null;
			const title = entry.detached ? t("chip.tooltip.detached", {
				branch: entry.branch,
				path: cwd
			}) : t("chip.tooltip", {
				branch: entry.branch,
				path: cwd
			});
			return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("span", {
				className: "dsh-sgb-chip",
				title,
				"aria-label": title,
				children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
					className: "dsh-sgb-icon",
					children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)(BranchGlyph, {})
				}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
					className: "dsh-sgb-label",
					children: entry.branch
				})]
			});
		}
		//#endregion
		//#region src/client/controller.mjs
		/**
		* Browser-side git-branch state for the show-git-branch chip.
		*
		* One controller owns a single snapshot store keyed by workspace directory,
		* so every Session sharing a directory reads the same truth. The store
		* factory, HTTP carrier, and host base arrive as injected dependencies: the
		* production wiring (`index.ts`) supplies `createSnapshotStore` from the
		* module table and the page origin, while tests supply doubles. Every failure
		* — HTTP error, network error, malformed payload — collapses to the `none`
		* state, which the chip renders as nothing at all.
		*/
		/** Route path shared with the host half. */
		const BRANCH_ROUTE = "/show-git-branch/branch";
		/**
		* Fetch and fold one directory's branch answer.
		* @param {string} cwd - absolute workspace directory.
		* @param {(input: string | URL, init?: RequestInit) => Promise<Response>} fetcher - HTTP carrier.
		* @param {() => string} hostBase - origin of the serving host.
		* @returns {Promise<BranchState>} the resolved state.
		*/
		async function fetchBranchState(cwd, fetcher, hostBase) {
			try {
				const response = await fetcher(new URL(`${BRANCH_ROUTE}?path=${encodeURIComponent(cwd)}`, hostBase()), { headers: { accept: "application/json" } });
				if (!response.ok) throw new Error(`HTTP ${String(response.status)}`);
				const payload = await response.json();
				if (payload === null || typeof payload !== "object" || typeof payload.branch !== "string" || typeof payload.detached !== "boolean") throw new Error("malformed branch payload");
				return payload.branch === "" ? { status: "none" } : {
					status: "ok",
					branch: payload.branch,
					detached: payload.detached
				};
			} catch {
				return { status: "none" };
			}
		}
		/**
		* Create the git-branch controller.
		*
		* @param {object} deps - injected dependencies.
		* @param {(init: unknown) => import('@deepseek-ai/dsh-client-store').SnapshotStore<Record<string, BranchState>>} deps.createStore
		*   snapshot-store factory (production: `createSnapshotStore`).
		* @param {(input: string | URL, init?: RequestInit) => Promise<Response>} [deps.fetcher]
		*   HTTP carrier; defaults to the global `fetch`.
		* @param {() => string} [deps.hostBase] - origin resolver; defaults to the page
		*   origin with the null-origin fallback for sandboxed documents.
		* @returns {{ branches: object, refresh: (cwd: string) => Promise<void>, refreshAll: () => void }}
		*   the store plus the refresh entry points.
		*/
		function createGitBranchController(deps) {
			const fetcher = deps.fetcher ?? ((input, init) => fetch(input, init));
			const hostBase = deps.hostBase ?? (() => {
				const origin = globalThis.location?.origin;
				return origin !== void 0 && origin !== "null" ? origin : "http://dsh.internal";
			});
			const branches = deps.createStore({});
			const inflight = /* @__PURE__ */ new Map();
			/**
			* Replace one directory's state, merging into the current snapshot.
			* @param {string} cwd - directory key.
			* @param {BranchState} state - next state.
			*/
			const publish = (cwd, state) => {
				branches.set({
					...branches.getSnapshot(),
					[cwd]: state
				});
			};
			/**
			* Refresh one directory's branch; concurrent calls share a single fetch.
			* @param {string} cwd - absolute workspace directory.
			* @returns {Promise<void>} after the state is published.
			*/
			const refresh = (cwd) => {
				if (cwd === void 0 || cwd === "") return Promise.resolve();
				const pending = inflight.get(cwd);
				if (pending !== void 0) return pending;
				publish(cwd, { status: "loading" });
				const request = fetchBranchState(cwd, fetcher, hostBase).then((state) => {
					publish(cwd, state);
				}).finally(() => {
					inflight.delete(cwd);
				});
				inflight.set(cwd, request);
				return request;
			};
			/** Re-fetch every known directory (window focus and the slow interval). */
			const refreshAll = () => {
				for (const cwd of Object.keys(branches.getSnapshot())) refresh(cwd);
			};
			return {
				branches,
				refresh,
				refreshAll
			};
		}
		/**
		* One directory's branch state.
		* @typedef {'loading' | { status: 'ok', branch: string, detached: boolean } | { status: 'none' }} BranchState
		*/
		//#endregion
		//#region src/client/styles.mjs
		/**
		* Plugin-owned stylesheet, injected once as a tagged <style> element at
		* factory execution — the same delivery model the in-repo client-bundle
		* preset uses for plugin CSS. Class names carry the `dsh-sgb-` prefix so
		* they cannot collide with shell or other-plugin classes; colors ride the
		* shared `--dsw-*` semantic tokens (both have dark-theme counterparts).
		*/
		/** Tag identifying this plugin's style element. */
		const STYLE_TAG = "show-git-branch/chip.css";
		/** The chip's stylesheet. */
		const CSS = [
			".dsh-sgb-chip {",
			"  display: inline-flex;",
			"  align-items: center;",
			"  gap: 4px;",
			"  max-width: 220px;",
			"  padding: 2px 8px;",
			"  border-radius: 999px;",
			"  background: var(--dsw-alias-bg-skeleton);",
			"  color: var(--dsw-alias-label-secondary);",
			"  font-size: 13px;",
			"  font-weight: 500;",
			"  line-height: 20px;",
			"  white-space: nowrap;",
			"}",
			".dsh-sgb-icon {",
			"  display: inline-flex;",
			"  align-items: center;",
			"  flex: none;",
			"  color: currentColor;",
			"}",
			".dsh-sgb-label {",
			"  overflow: hidden;",
			"  text-overflow: ellipsis;",
			"}"
		].join("\n");
		/**
		* Install the stylesheet once per document.
		* @returns {void}
		*/
		function ensureStyles() {
			if (typeof document === "undefined") return;
			if (document.querySelector(`style[data-plugin-css="${STYLE_TAG}"]`) !== null) return;
			const tag = document.createElement("style");
			tag.dataset.plugin = "show-git-branch";
			tag.dataset.pluginCss = STYLE_TAG;
			tag.textContent = CSS;
			document.head.appendChild(tag);
		}
		//#endregion
		//#region src/client/locales.mjs
		/** `show-git-branch` namespace dictionaries (the composer chip's copy). */
		/** Dictionary namespace owned by this plugin. */
		const NS = "show-git-branch";
		/** Simplified Chinese dictionary (the key-set source of truth). */
		const zh = {
			"chip.tooltip": "当前分支：{branch} · {path}",
			"chip.tooltip.detached": "分离头指针（{branch}）· {path}"
		};
		/** English dictionary, checked complete against the zh key set. */
		const en = {
			"chip.tooltip": "Current branch: {branch} · {path}",
			"chip.tooltip.detached": "Detached HEAD ({branch}) · {path}"
		};
		//#endregion
		//#region src/client/index.ts
		/**
		* show-git-branch, browser half: one compact chip on the composer's
		* `conversation.input.left` seat — the extension point immediately right of
		* the mode selector — showing the session workspace's current git branch.
		* The branch fact is fetched from the host half's route and published through
		* one snapshot store keyed by directory, so Sessions sharing a workspace
		* share the truth. Focus events and a slow interval keep it current; the
		* component resolves a directory on first sight.
		*/
		/** How often every known directory re-reads its branch, in milliseconds. */
		const REFRESH_INTERVAL_MS = 3e4;
		/** Required services: the seat's slot registry and the locale registry. */
		const inject = [
			"slots",
			"locale",
			"timer"
		];
		/**
		* Client plugin body: install the stylesheet and dictionaries, then register
		* the chip on the composer's input-left seat.
		* @param ctx - client root context.
		*/
		function apply(ctx) {
			ensureStyles();
			const controller = createGitBranchController({ createStore: (init) => (0, _deepseek_ai_dsh_client_store.createSnapshotStore)(init) });
			ctx.effect(() => ctx.locale.register(NS, {
				zh,
				en
			}), "show-git-branch: dictionaries");
			ctx.slots.inject("conversation.input.left", () => ctx.slots.register({
				name: "conversation.input.left",
				id: "show-git-branch",
				order: 10,
				locale: NS,
				inject: () => ({
					hooks: { gitBranches: controller.branches },
					refreshBranch: controller.refresh
				})
			}, GitBranchChip));
			ctx.setInterval(() => {
				controller.refreshAll();
			}, REFRESH_INTERVAL_MS);
			const onFocus = () => {
				controller.refreshAll();
			};
			window.addEventListener("focus", onFocus);
			ctx.effect(() => () => {
				window.removeEventListener("focus", onFocus);
			}, "show-git-branch: focus refresh");
		}
		//#endregion
		exports.apply = apply;
		exports.inject = inject;
		return module.exports;
	}
});

//# sourceMappingURL=client.js.map
# DSH Show Git Brunch

在 DSH 對話頁頭部「模式」右側顯示目前對話工作區的 Git 分支。目錄名稱保留 show_git_brunch；安裝包名稱為 dsh-show-git-brunch。

## 行為

- 顯示分支圖示與分支名；長名稱截斷，滑鼠停留可查看完整名稱。
- 非 Git 工作區、沒有 Git、目錄不存在或查詢失敗時完全隱藏。
- 支援尚無提交的新倉庫、Git worktree、倉庫子目錄；detached HEAD 顯示 detached 加短 commit ID。
- 頁面可見時每 5 秒更新；切換對話、頁面取得焦點及重新可見時更新。
- 僅執行唯讀 Git 命令，不切換分支、不修改 Git 設定、索引或工作區。

## 相容性

需要 Node.js >=22.19 與主機 PATH 上的 Git。適用於具備 Connection 自訂 RPC、workspaceRegistry 與 conversation.session.header.actions 插槽的 DSH Web 版本。開發依據為本機 DSH 0.1.1-rc.2 checkout 的介面；DSH 尚在預發布階段，不保證其他版本介面一致。

查詢目標由後端 workspaceRegistry 中經對話 header 驗證的 sessionIds 決定。瀏覽器只傳 sessionId，不可傳任意路徑；未歸屬已登記工作區的對話不顯示。Git 在 DSH 主機本機執行，未提供遠端容器／E2B Git 適配。專用 RPC 沿用 DSH trusted-host 來源檢查，這不是額外的登入認證層。

## 安裝前準備

1. DSH 已可正常啟動 Web 主機（以下範例假設 profile 名為 web，頁面為 http://127.0.0.1:3080）。
2. PATH 上要有 pnpm：dsh plugin 會把安裝參數轉發給 profile 目錄中的 pnpm，缺少 pnpm 會以 127 失敗。
3. 前端產物就緒：本目錄需存在 lib/client.js。若剛取得原始碼，先在 PowerShell 執行 npm.cmd run build。

## 開發與打包（PowerShell）

在本目錄執行：

    npm.cmd run build
    npm.cmd test
    npm.cmd run check
    npm.cmd pack

本插件沒有運行時或開發套件依賴；前端使用 DSH 的共享 React，不附帶第二份 React。測試以 Node.js 內建 node:test 與輕量測試替身驗證插件邊界。

build 產生 lib/client.js 的 DSH closure-factory 產物。修改 src/client.mjs 或 src/polling.mjs 後必須重新 build；不要直接修改產物。check 檢查產物是否與來源一致。

### 打包 .tgz

`npm.cmd pack` 會先自動執行 prepack 腳本（`npm run build && npm run check`）再打包，因此即使忘了手動 build，pack 也會先構建並檢查；上面的 build／test／check 步驟仍建議先跑，測試不在 prepack 裡。

- 產出檔案為 `dsh-show-git-brunch-<version>.tgz`，版本取自 package.json；目前版本即 `dsh-show-git-brunch-0.1.0.tgz`。
- 打包內容由 package.json 的 `files` 白名單決定：`index.mjs`、`src/`、`lib/client.js`、`scripts/`、`cordis.patch.yml`、`README.md`、`LICENSE`；npm 一律會附上 `package.json`。`tests/`、`docs/` 等未列出的檔案不會進入套件；`lib/client.js` 是 build 產物，由 prepack 確保打包前為最新。
- 打包前可用 `npm.cmd pack --dry-run` 預覽將打入的檔案；打包後可用 `tar -tzf dsh-show-git-brunch-0.1.0.tgz` 檢查實際內容（Windows 10 內建 tar）。
- 產生的 `.tgz` 就是下面〈安裝 tarball（一般發布）〉一節使用的檔案。

## 安裝

安裝命令是 dsh plugin --profile web add，依來源選擇其中一種寫法。它會在 web profile 目錄內執行 pnpm 安裝依賴，並自動把套件登記為 profile 的 bundle 層（dsh.profile.bundles），不需要再手動啟用。

### 本地連結（開發用）

在 show_git_brunch 目錄中執行。dsh 會把相對路徑錨定到你執行命令的目錄，因此請在此目錄執行：

    dsh plugin --profile web add 'link:.'

### 安裝 tarball（一般發布）

先打包，再用絕對路徑安裝：

    npm.cmd pack
    dsh plugin --profile web add 'file:C:\Users\<你的帳號>\Documents\deepseek-dsh-plugins-dev\show_git_brunch\dsh-show-git-brunch-0.1.0.tgz'

兩種寫法都不需要修改 DSH 原始碼。實際使用的 profile 不是 web 時，把 --profile web 換成該名稱；安裝只影響該 profile。

## 啟用與確認

1. 重新啟動原本的 DSH Web 主機。新插件與其 package.json metadata 在啟動時讀取並會被快取。
2. 刷新原本頁面（例如 http://127.0.0.1:3080）。不要另起替代 Web/Vite 服務來更新此頁面。
3. 打開一個工作區屬於 Git 倉庫的對話，確認「模式」右側出現分支標籤。
4. 需要確認安裝層時，檢查 profile 目錄（預設 $DSH_HOME/profiles/web）的 package.json：dsh.profile.bundles 應包含 dsh-show-git-brunch。

此插件的 bundle patch 把後端掛到 host plane，前端由 DSH 模組系統依 package.json 的 dsh.client 自動探索載入。關鍵是 dsh.profile.bundles 必須含有套件名稱，用 dsh plugin 安裝會自動同步這份清單。

## 更新

- 本地連結：修改來源後執行 npm.cmd run build，再刷新頁面；改動 package.json 或 cordis.patch.yml 時必須重啟主機。
- 替換 tarball：重新 npm.cmd pack 後執行 dsh plugin --profile web add 'file:<新的絕對路徑>'，再重啟主機並刷新頁面。

## 移除

    dsh plugin --profile web remove dsh-show-git-brunch

移除後同樣重啟主機並刷新頁面。

## 疑難排解

- 完全沒有標籤：先確認該對話的工作區是 Git 倉庫——非 Git、目錄不存在、Git 不存在或查詢失敗時刻意完全不顯示，也不顯示錯誤文字。
- 訊息 pnpm failed in profile directory：代表 pnpm 在 profile 目錄中失敗，通常是 pnpm 版本或依賴腳本允許清單；請依 DSH 提示在該 profile 處理；profile 由 pnpm 管理，不要用 npm 在該目錄安裝。
- 標籤停在舊分支：切換對話或讓頁面重新取得焦點會立即重查；頁面隱藏期間不輪詢，回到前台即更新。
- 剛安裝卻沒效果：多半尚未重啟主機或瀏覽器仍用舊快取；重啟並重新整理後再確認。

## 進階：dsh plugin 的底層等價（手動 pnpm，一般不需要）

以下僅供排障或完全離開 dsh 工具鏈時使用。dsh plugin 做的事是「必要時初始化 profile → 在 profile 目錄執行 pnpm → 依已安裝狀態同步 dsh.profile.bundles」；你可以自己跑前兩步，但第三步不能省——只 pnpm add 不會讓插件成為 profile 層，因此不會被載入。

1. 確認 profile 已初始化（沒初始化過時這條會建立目錄並寫好 pnpm-workspace.yaml；已初始化時是安全的 no-op）：

       dsh plugin --profile web ls

2. 進入 profile 目錄安裝。手動 pnpm 沒有人幫你錨定相對路徑（相對路徑如 . 會在 profile 目錄內解析成把 profile 自己連結進去），所以一律用絕對路徑：

       cd "$env:DSH_HOME\profiles\web"     # 未設定 DSH_HOME 時為 $HOME\.dsh\profiles\web，例如 C:\Users\<你的帳號>\.dsh\profiles\web
       pnpm add link:C:\Users\<你的帳號>\Documents\deepseek-dsh-plugins-dev\show_git_brunch
       # 或裝 tarball：
       pnpm add file:C:\Users\<你的帳號>\Documents\deepseek-dsh-plugins-dev\show_git_brunch\dsh-show-git-brunch-0.1.0.tgz

3. 登記 bundle 層。任何一次成功的 dsh plugin 呼叫都會重新同步清單，最省事的是：

       dsh plugin --profile web ls

   或自行編輯該目錄 package.json，在 dsh.profile.bundles 陣列加入 "dsh-show-git-brunch"。

4. 移除時同樣要補同步：

       pnpm remove dsh-show-git-brunch
       dsh plugin --profile web ls

注意事項：

- 只在 profile 目錄用 pnpm 管理插件；在插件目錄執行 pnpm add 只會改動本專案自己的依賴，與 DSH 載入無關（本插件沒有任何運行時依賴）。
- 保留 profile 的 pnpm-workspace.yaml（packages: [.]、nodeLinker: hoisted、autoInstallPeers: false）與 in-box 層（@deepseek-ai/dsh-base、@deepseek-ai/dsh-web-app）。hoisted 設定讓外部插件與主機共用同一份 cordis；改動可能出現 duplicate cordis。
- pnpm ≥10 的設定讀自 pnpm-workspace.yaml，不是 .npmrc。
- 若 pnpm 因依賴的 prepare 腳本停住，依它印出的 key 加入該檔的 allowBuilds 後重試；本插件是純檔案依賴，正常不會觸發。

## 人工驗收

1. 打開屬於 Git 工作區的對話，確認模式右側出現分支名。
2. 在外部終端切換分支，確認 5 秒內更新；回到頁面時立即更新。
3. 切換至非 Git 工作區的對話，確認沒有標籤或佔位文字，亦不短暫顯示上一個分支。
4. 測試 detached HEAD、新建空倉庫與 worktree。
5. 隱藏頁面時不再發出週期請求；卸載插件後沒有殘留。

本專案的自動化測試與產物檢查不等同於已安裝到你目前使用中的 GUI；實際安裝及瀏覽器驗證狀態以交付說明為準。

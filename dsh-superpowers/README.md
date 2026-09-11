# Superpowers for DeepSeek Harness

非官方 DSH 移植版，沿用 [obra/superpowers](https://github.com/obra/superpowers) 的 14 個技能與完整 skills/ 配套資源。上游採 MIT 授權；版權與授權保留於 LICENSE 及 upstream/LICENSE。固定版本：b36e0829c6d0140e93cfef2ca599b1b07d4a7797。UPSTREAM.json 記錄每個檔案的 Git blob id 與 SHA-256。

## 功能

這是一個獨立、無第三方執行期依賴的 ESM Cordis 插件與 DSH profile bundle，不需要改 Harness 核心或 Web。啟用後註冊 provider superpowers，使用 bundled rank 600，讓同名的使用者／專案技能可優先。模型與使用者都可以載入技能。

- 14 個技能：brainstorming、writing-plans、executing-plans、subagent-driven-development、dispatching-parallel-agents、test-driven-development、systematic-debugging、requesting-code-review、receiving-code-review、verification-before-completion、using-git-worktrees、finishing-a-development-branch、writing-skills、using-superpowers。
- DSH 名稱加上 superpowers- 前綴，例如 superpowers-systematic-debugging。
- 每次載入先附上 adapter.md，再附上去除 frontmatter、替換 superpowers: 前綴的上游正文；upstream/ 本身不修改。輔助文件的名稱對應由 adapter.md 說明。
- 啟動引導使用 systemPrompt.context，由既有 host 以 durable context 機制呈現，提醒先載入 superpowers-using-superpowers；不把所有技能一次塞進提示，不自行修改 session history 或 agent-loop。卸載會清除 provider 與提示貢獻。

## 打包 .tgz

在 `dsh-superpowers` 插件目錄執行：

```powershell
npm.cmd pack
```

已安裝 pnpm 時也可用 `pnpm pack`（PowerShell 執行原則阻擋時改用 `pnpm.cmd pack`），兩者對本插件產出內容相同的套件。

- 產出檔案為 `dsh-superpowers-<version>.tgz`，版本取自 package.json；目前版本即 `dsh-superpowers-0.1.0.tgz`。
- 本插件沒有第三方依賴、不需要編譯，package.json 也沒有 prepack 腳本，因此打包前不必 `npm install`／`pnpm install`，也不必先執行任何 build，直接 pack 即可。
- 打包內容由 package.json 的 `files` 白名單決定：`index.mjs`、`adapter.md`、`catalog.json`、`cordis.patch.yml`、`upstream/`、`UPSTREAM.json`、`README.md`、`LICENSE`、`tests/`、`scripts/`；npm 一律會附上 `package.json`，未列出的檔案（如 `.gitignore`）不會進入套件。
- 打包前可用 `npm.cmd pack --dry-run` 預覽將打入的檔案（pnpm 沒有對應選項）；打包後可用 `tar -tzf dsh-superpowers-0.1.0.tgz` 檢查實際內容（Windows 10 內建 tar）。
- 產生的 `.tgz` 就是下面〈安裝〉一節 `dsh plugin --profile web add` 使用的檔案。

## 安裝

需求：Node.js 22+，以及提供 skills、systemPrompt、skill 工具的 DSH；目前的 web/base profile 已提供。此版本以本機已建置的 DSH checkout 驗證。這份交付不會自動修改你現有的 profile。

### 使用 npm

在插件目錄執行：

```powershell
npm.cmd pack
dsh plugin --profile web add ./dsh-superpowers-0.1.0.tgz
dsh --profile web --dump-config
```

### 使用 pnpm

已安裝 pnpm 時，在 `dsh-superpowers` 插件目錄執行以下命令，以 pnpm 打包本機原始碼，再透過 DSH CLI 安裝至 `web` profile（與上面的 npm 方式二選一）：

```powershell
pnpm pack
dsh plugin --profile web add ./dsh-superpowers-0.1.0.tgz
dsh --profile web --dump-config
```

Windows PowerShell 若因執行原則無法執行 `pnpm`，可改用 `pnpm.cmd pack`。套件版本變更時，請將安裝命令中的 `.tgz` 檔名換成實際產生的檔名；若使用其他 profile，請將兩處 `web` 一併替換。

本插件沒有第三方依賴，也不需要編譯，因此打包前不必先執行 `pnpm install`。僅在開發目錄執行 `pnpm install` 或在其他專案執行 `pnpm add`，不等同於把插件註冊到 DSH profile；請保留上述 `dsh plugin ... add` 步驟。

本套件宣告 dsh.bundle.patch，支援 bundle reconciliation 的 DSH CLI 會把它加入 profile layer；dump-config 應有 id: skill-superpowers、name: dsh-superpowers。不要再手動插入第二個同名 provider。若套件管理／啟動方式不同，先確認實際 profile，而不是新增另一個 GUI server。

安裝後讓既有 DSH 程序重新載入 profile；必要時正常重啟原本程序，刷新原本的 http://127.0.0.1:3080 並在新對話的技能清單確認 superpowers-using-superpowers。本插件沒有 client bundle 或 Web shell 改動，無需另啟 Vite 或承諾自動 HMR。

若只想手動掛載未安裝的本機檔案，可在既有 profile patch 加入以下內容（與 bundle 安裝二選一），將路徑改為你自己的位置：

```yaml
- insert:
    - id: skill-superpowers
      name: file:///C:/path/to/dsh-superpowers/index.mjs
```

卸載已安裝的 bundle：dsh plugin --profile web remove dsh-superpowers，然後確認 dump-config；若使用手動 patch，則只移除自己新增的那一列。

## 使用

直接說「幫我設計並實作這個功能」或「用 Superpowers 系統化調查這個錯誤」。也可以要求「載入 superpowers-writing-plans」。在 Code Mode，模型使用 run_code 裡的 await tools.skill({name: "superpowers-writing-plans"})。這是模型工作流指引，不是強制執行的安全機制，不能保證每次模型都遵循。

## 驗證

```powershell
node --check index.mjs
node --test tests/*.test.mjs
$env:DSH_CHECKOUT = "C:/path/to/deepseek-harness"
node tests/integration.mjs
node scripts/provenance.mjs
```

單元測試驗證 14 個名稱、正文保留／映射、資源位置、取消、未知技能及 bootstrap。整合測試以真正 built app-boot、Cordis Loader 和 cordis.yml + 套件 patch 載入，檢查目錄、正文、提示組裝、override 優先序及卸載清除；它不啟動 Web 或呼叫 LLM。provenance 腳本需要 GitHub 網路，逐一比對 52 個檔案的 Git blob。Windows 沙箱可能阻擋 Node 隔離測試程序的管線；應批准所需測試權限，不停用測試。

## 限制與安全

- 未移植其他平台的 hooks、市場安裝器、模型路由設定或平台 API。DSH 原生機制替代其技能探索與啟動引導。
- Bash/Python helper 與視覺輔助 server 作為原始資源保留，不自動执行，也不宣稱已完成 Windows 相容性測試。使用前必須閱讀、確認依賴及權限。無法使用 helper 時，以 DSH 工具保存等價任務／審查記錄。
- 視覺輔助需明確同意才能啟動；未對上游 server 的安全與 telemetry 行為作全面審核。
- 不會因技能要求而自動提交、推送、合併、刪除程式碼／工作樹或繞過 sandbox。使用者選擇與系統指令優先。
- relative resourceBase 只表示資源位置，不增加檔案存取權限。
- 未做真实 LLM 工作流品質評測，也不把 Loader 整合測試稱作已在你的 GUI 啟用。
- catalog 摘要與小型 bootstrap 會增加上下文；只有載入技能時才增加全文，無網路啟動或自動背景任務。

## 維護

不要隨啟動抓取 main。更新時選定新 commit，調整 scripts/fetch-upstream.mjs 與 scripts/provenance.mjs，審核上游授權／內容，重新保存 upstream/、catalog.json、UPSTREAM.json 並執行驗證。fetch-upstream 只輸出 JSON，不執行上游腳本或覆寫本地檔案。adapter.md 是獨立適配規則，升級時必須重新確認工具語義。

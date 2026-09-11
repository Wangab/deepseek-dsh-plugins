# show-git-branch

DSH web plugin that displays the current Git branch beside the mode selector in the chat input bar.

## Build and test

From the plugin directory:

```sh
pnpm install
pnpm run bundle
pnpm test
```

The bundle command produces `lib/client.js` and its source map. The host module remains `index.mjs`.

## Install into the web profile

From the DSH checkout or any shell with the DSH CLI available:

```sh
node /home/jason/deepseek-harness/apps/cli/lib/bin.js \
  plugin --profile web add /mnt/c/Users/jason.wang/Documents/deepseek-dsh-plugins-dev/show_git_branch
```

Then restart the existing DSH web server. The plugin bundle declaration includes `cordis.patch.yml`, so it is loaded on the next profile boot.

## Behavior

- Reads Git metadata for the session working directory through a protected host route.
- Supports ordinary repositories, nested working directories, Git worktrees, and detached HEADs.
- Shows nothing when the working directory is not inside a Git repository.
- Refreshes when the session directory changes, every 30 seconds, and when the browser window regains focus.

The branch endpoint is protected by the DSH host/origin and browser-authentication fence.

/** `show-git-branch` namespace dictionaries (the composer chip's copy). */

/** Dictionary namespace owned by this plugin. */
export const NS = 'show-git-branch'

/** Simplified Chinese dictionary (the key-set source of truth). */
export const zh = {
  'chip.tooltip': '当前分支：{branch} · {path}',
  'chip.tooltip.detached': '分离头指针（{branch}）· {path}',
}

/** English dictionary, checked complete against the zh key set. */
export const en = {
  'chip.tooltip': 'Current branch: {branch} · {path}',
  'chip.tooltip.detached': 'Detached HEAD ({branch}) · {path}',
}

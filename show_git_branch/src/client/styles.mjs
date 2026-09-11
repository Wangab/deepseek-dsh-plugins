/**
 * Plugin-owned stylesheet, injected once as a tagged <style> element at
 * factory execution — the same delivery model the in-repo client-bundle
 * preset uses for plugin CSS. Class names carry the `dsh-sgb-` prefix so
 * they cannot collide with shell or other-plugin classes; colors ride the
 * shared `--dsw-*` semantic tokens (both have dark-theme counterparts).
 */

/** Tag identifying this plugin's style element. */
const STYLE_TAG = 'show-git-branch/chip.css'

/** The chip's stylesheet. */
const CSS = [
  '.dsh-sgb-chip {',
  '  display: inline-flex;',
  '  align-items: center;',
  '  gap: 4px;',
  '  max-width: 220px;',
  '  padding: 2px 8px;',
  '  border-radius: 999px;',
  '  background: var(--dsw-alias-bg-skeleton);',
  '  color: var(--dsw-alias-label-secondary);',
  '  font-size: 13px;',
  '  font-weight: 500;',
  '  line-height: 20px;',
  '  white-space: nowrap;',
  '}',
  '.dsh-sgb-icon {',
  '  display: inline-flex;',
  '  align-items: center;',
  '  flex: none;',
  '  color: currentColor;',
  '}',
  '.dsh-sgb-label {',
  '  overflow: hidden;',
  '  text-overflow: ellipsis;',
  '}',
].join('\n')

/**
 * Install the stylesheet once per document.
 * @returns {void}
 */
export function ensureStyles() {
  if (typeof document === 'undefined') return
  if (document.querySelector(`style[data-plugin-css="${STYLE_TAG}"]`) !== null) return
  const tag = document.createElement('style')
  tag.dataset.plugin = 'show-git-branch'
  tag.dataset.pluginCss = STYLE_TAG
  tag.textContent = CSS
  document.head.appendChild(tag)
}

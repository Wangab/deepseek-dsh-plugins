/**
 * show-git-branch, host half: one webserver route serving the git branch of
 * an absolute workspace directory, for the browser chip
 * (`lib/client.js`) beside the composer mode selector.
 *
 * Security follows the open-in-app precedent: every request asks the
 * composition's `connection` service for a rejection first — its Host/Origin
 * fence defeats DNS rebinding and cross-site calls, and the login-token
 * cookie gates the caller — before the path is validated at the wire (an
 * absolute path naming an existing directory). Branch resolution reads
 * `.git/HEAD` directly; no subprocess, no writes, no repository mutation.
 */

import { stat } from 'node:fs/promises'
import { isAbsolute } from 'node:path'
import { resolveGitBranch } from './host/git-branch.mjs'

/** Route path shared with the browser half. */
const BRANCH_ROUTE = '/show-git-branch/branch'

/** Cordis plugin name. */
export const name = 'show-git-branch'

/** The route carrier and the trust fence guarding it. */
export const inject = ['webServer', 'connection']

/** Trust surface consumed here; the browser-side connection package owns the full type. */
function connectionOf(ctx) {
  return Reflect.get(ctx, 'connection')
}

/** JSON response (no-store: the branch is a live fact). */
function sendJson(res, status, payload) {
  res.statusCode = status
  res.setHeader('content-type', 'application/json; charset=utf-8')
  res.setHeader('cache-control', 'no-store')
  res.end(JSON.stringify(payload))
}

/**
 * Mount the branch route behind the connection trust fence.
 * @param {import('@deepseek-ai/cordis').Context} ctx - host plugin context.
 */
export function apply(ctx) {
  /** Answer an untrusted/unauthenticated request; true when it was rejected. */
  const rejected = (req, res) => {
    const rejection = connectionOf(ctx).requestRejection(req)
    if (rejection === undefined) return false
    res.statusCode = rejection
    res.end()
    return true
  }

  ctx.effect(() => ctx.webServer.register({
    kind: 'exact',
    path: BRANCH_ROUTE,
    handler: async (req, res) => {
      if (rejected(req, res)) return
      if (req.method !== 'GET') {
        res.statusCode = 405
        res.setHeader('allow', 'GET')
        res.end()
        return
      }
      const path = new URL(String(req.url), 'http://localhost').searchParams.get('path')
      if (path === null || path === '') {
        sendJson(res, 400, { code: 'bad-request', message: 'query parameter "path" is required' })
        return
      }
      if (!isAbsolute(path)) {
        sendJson(res, 400, { code: 'bad-request', message: '"path" must be an absolute directory path' })
        return
      }
      let directory
      try {
        directory = (await stat(path)).isDirectory()
      } catch {
        // ENOENT/EACCES and friends all mean: there is no such directory.
        directory = false
      }
      if (!directory) {
        sendJson(res, 404, { code: 'not-found', message: `directory does not exist: ${path}` })
        return
      }
      sendJson(res, 200, await resolveGitBranch(path))
    },
  }), `show-git-branch: GET ${BRANCH_ROUTE}`)
}

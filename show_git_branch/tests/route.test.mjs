import { test } from 'node:test'
import assert from 'node:assert/strict'
import { mkdtemp, mkdir, writeFile, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { name, inject, apply } from '../index.mjs'

const ROUTE = '/show-git-branch/branch'

/** Build a fake cordis context capturing webServer routes behind ctx.effect. */
function fakeCtx({ rejection } = {}) {
  const registrations = []
  const effects = []
  const ctx = {
    webServer: {
      register: (route) => {
        registrations.push(route)
        return () => {
          const at = registrations.indexOf(route)
          if (at >= 0) registrations.splice(at, 1)
        }
      },
    },
    effect: (run) => {
      effects.push(run())
    },
    connection: { requestRejection: () => rejection },
  }
  return { ctx, registrations, effects }
}

/** A fake ServerResponse capturing status, headers, and body. */
function fakeRes() {
  const res = {
    statusCode: 200,
    headers: {},
    body: undefined,
    setHeader: (name, value) => { res.headers[name.toLowerCase()] = value },
    end: (data) => { res.body = data ?? '' },
  }
  return res
}

/** A fake GET request for one path value. */
function requestFor(path) {
  const url = path === undefined ? ROUTE : `${ROUTE}?path=${encodeURIComponent(path)}`
  return { method: 'GET', url, headers: {} }
}

/** Create a temp repository fixture and return its directory path. */
async function repo() {
  const dir = await mkdtemp(join(tmpdir(), 'show-git-branch-route-'))
  await mkdir(join(dir, '.git'), { recursive: true })
  await writeFile(join(dir, '.git', 'HEAD'), 'ref: refs/heads/main\n')
  return dir
}

test('plugin declares its name and host service requirements', () => {
  assert.equal(name, 'show-git-branch')
  assert.deepEqual(inject, ['webServer', 'connection'])
})

test('apply mounts exactly one exact route through ctx.effect', async () => {
  const { ctx, registrations, effects } = fakeCtx()
  const dir = await repo()
  try {
    apply(ctx)
    assert.equal(registrations.length, 1)
    assert.equal(effects.length, 1)
    assert.equal(registrations[0].kind, 'exact')
    assert.equal(registrations[0].path, ROUTE)
  } finally {
    await rm(dir, { recursive: true, force: true })
  }
})

test('GET answers the branch of a repository directory as no-store JSON', async () => {
  const { ctx, registrations } = fakeCtx()
  const dir = await repo()
  try {
    apply(ctx)
    const res = fakeRes()
    await registrations[0].handler(requestFor(dir), res)
    assert.equal(res.statusCode, 200)
    assert.match(res.headers['content-type'], /application\/json/)
    assert.equal(res.headers['cache-control'], 'no-store')
    assert.deepEqual(JSON.parse(res.body), { branch: 'main', detached: false })
  } finally {
    await rm(dir, { recursive: true, force: true })
  }
})

test('GET without a path parameter is a bad request', async () => {
  const { ctx, registrations } = fakeCtx()
  apply(ctx)
  const res = fakeRes()
  await registrations[0].handler(requestFor(undefined), res)
  assert.equal(res.statusCode, 400)
  assert.deepEqual(JSON.parse(res.body).code, 'bad-request')
})

test('GET with a relative path is a bad request', async () => {
  const { ctx, registrations } = fakeCtx()
  apply(ctx)
  const res = fakeRes()
  await registrations[0].handler(requestFor('relative/dir'), res)
  assert.equal(res.statusCode, 400)
})

test('GET for a missing directory is not found', async () => {
  const { ctx, registrations } = fakeCtx()
  apply(ctx)
  const res = fakeRes()
  await registrations[0].handler(requestFor('/definitely/not/here'), res)
  assert.equal(res.statusCode, 404)
  assert.deepEqual(JSON.parse(res.body).code, 'not-found')
})

test('non-GET methods are rejected with 405 and an allow header', async () => {
  const { ctx, registrations } = fakeCtx()
  const dir = await repo()
  try {
    apply(ctx)
    const res = fakeRes()
    await registrations[0].handler({ method: 'POST', url: ROUTE, headers: {} }, res)
    assert.equal(res.statusCode, 405)
    assert.equal(res.headers.allow, 'GET')
  } finally {
    await rm(dir, { recursive: true, force: true })
  }
})

test('a rejected request short-circuits before any branch resolution', async () => {
  const { ctx, registrations } = fakeCtx({ rejection: 401 })
  const dir = await repo()
  try {
    apply(ctx)
    const res = fakeRes()
    await registrations[0].handler(requestFor(dir), res)
    assert.equal(res.statusCode, 401)
    assert.equal(res.body, '')
  } finally {
    await rm(dir, { recursive: true, force: true })
  }
})

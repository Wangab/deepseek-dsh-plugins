import { test } from 'node:test'
import assert from 'node:assert/strict'
import { createGitBranchController } from '../src/client/controller.mjs'

const BASE = 'http://dsh.test'

/** Minimal SnapshotStore double: same face createSnapshotStore exposes. */
function fakeStoreFactory() {
  const created = []
  const createStore = (init) => {
    const listeners = new Set()
    const store = {
      state: init,
      getSnapshot: () => store.state,
      subscribe: (fn) => { listeners.add(fn); return () => { listeners.delete(fn) } },
      set: (next) => {
        store.state = next
        for (const fn of [...listeners]) fn()
      },
    }
    created.push(store)
    return store
  }
  return { createStore, created }
}

/** Fetch double recording every call and replaying queued results. */
function fakeFetch(results) {
  const calls = []
  const fetcher = (input, init) => {
    calls.push({ url: String(input), init })
    const next = results.shift()
    if (next instanceof Error) return Promise.reject(next)
    return Promise.resolve(next)
  }
  return { fetcher, calls }
}

const okResponse = (payload) => ({ ok: true, json: async () => payload })

function controllerWith(results) {
  const { createStore, created } = fakeStoreFactory()
  const { fetcher, calls } = fakeFetch(results)
  const controller = createGitBranchController({ createStore, fetcher, hostBase: () => BASE })
  return { controller, store: created[0], calls }
}

test('refresh publishes loading immediately, then the resolved branch', async () => {
  const { controller, store, calls } = controllerWith([okResponse({ branch: 'main', detached: false })])
  const pending = controller.refresh('/repo')
  assert.deepEqual(store.getSnapshot()['/repo'], { status: 'loading' })
  await pending
  assert.deepEqual(store.getSnapshot()['/repo'], { status: 'ok', branch: 'main', detached: false })
  assert.equal(calls.length, 1)
  assert.equal(calls[0].url, `${BASE}/show-git-branch/branch?path=${encodeURIComponent('/repo')}`)
  assert.deepEqual(calls[0].init.headers, { accept: 'application/json' })
})

test('a null branch resolves to the none state', async () => {
  const { controller, store } = controllerWith([okResponse({ branch: null, detached: false })])
  await controller.refresh('/repo')
  assert.deepEqual(store.getSnapshot()['/repo'], { status: 'none' })
})

test('a detached head keeps its flag', async () => {
  const { controller, store } = controllerWith([okResponse({ branch: '0123456', detached: true })])
  await controller.refresh('/repo')
  assert.deepEqual(store.getSnapshot()['/repo'], { status: 'ok', branch: '0123456', detached: true })
})

test('an HTTP failure resolves to the none state', async () => {
  const { controller, store } = controllerWith([{ ok: false }])
  await controller.refresh('/repo')
  assert.deepEqual(store.getSnapshot()['/repo'], { status: 'none' })
})

test('a network failure resolves to the none state', async () => {
  const { controller, store } = controllerWith([new Error('offline')])
  await controller.refresh('/repo')
  assert.deepEqual(store.getSnapshot()['/repo'], { status: 'none' })
})

test('a malformed payload resolves to the none state', async () => {
  const { controller, store } = controllerWith([okResponse({ branch: 123 })])
  await controller.refresh('/repo')
  assert.deepEqual(store.getSnapshot()['/repo'], { status: 'none' })
})

test('concurrent refreshes of one directory share a single fetch', async () => {
  const { controller, calls } = controllerWith([okResponse({ branch: 'main', detached: false })])
  await Promise.all([controller.refresh('/repo'), controller.refresh('/repo')])
  assert.equal(calls.length, 1)
})

test('a settled directory refreshes again on demand', async () => {
  const { controller, calls } = controllerWith([
    okResponse({ branch: 'main', detached: false }),
    okResponse({ branch: 'next', detached: false }),
  ])
  await controller.refresh('/repo')
  await controller.refresh('/repo')
  assert.equal(calls.length, 2)
})

test('concurrent refreshes of different directories keep both states', async () => {
  const { controller, store } = controllerWith([
    okResponse({ branch: 'one', detached: false }),
    okResponse({ branch: 'two', detached: false }),
  ])
  await Promise.all([controller.refresh('/one'), controller.refresh('/two')])
  const snapshot = store.getSnapshot()
  assert.deepEqual(snapshot['/one'], { status: 'ok', branch: 'one', detached: false })
  assert.deepEqual(snapshot['/two'], { status: 'ok', branch: 'two', detached: false })
})

test('refreshAll re-fetches every known directory', async () => {
  const { controller, calls } = controllerWith([
    okResponse({ branch: 'one', detached: false }),
    okResponse({ branch: 'two', detached: false }),
    okResponse({ branch: 'one', detached: false }),
    okResponse({ branch: 'two', detached: false }),
  ])
  await controller.refresh('/one')
  await controller.refresh('/two')
  controller.refreshAll()
  await new Promise((resolve) => { setTimeout(resolve, 0) })
  assert.equal(calls.length, 4)
})

test('refreshing an empty path is a no-op', async () => {
  const { controller, store, calls } = controllerWith([])
  await controller.refresh('')
  assert.equal(calls.length, 0)
  assert.deepEqual(store.getSnapshot(), {})
})

// ============================================
// CodeCollab — CRDT Convergence Integration Tests
// ============================================
// Proves that Yjs CRDT guarantees eventual consistency
// between multiple simulated peers.
//
// Run: node tests/crdt-convergence.test.js
// Dependencies: yjs (already installed in client/)
// ============================================

import * as Y from 'yjs'
import assert from 'assert'

let passed = 0
let failed = 0

function test(name, fn) {
  try {
    fn()
    console.log(`  ✅ ${name}`)
    passed++
  } catch (err) {
    console.log(`  ❌ ${name}`)
    console.log(`     ${err.message}`)
    failed++
  }
}

/**
 * Sync two Y.Docs by exchanging their full state vectors.
 * This simulates what y-websocket does over the network.
 */
function syncDocs(doc1, doc2) {
  const sv1 = Y.encodeStateAsUpdate(doc1, Y.encodeStateVector(doc2))
  const sv2 = Y.encodeStateAsUpdate(doc2, Y.encodeStateVector(doc1))
  Y.applyUpdate(doc1, sv2)
  Y.applyUpdate(doc2, sv1)
}

console.log('\n🔬 CRDT Convergence Tests\n')

// ============================================
// Test 1: Concurrent inserts at the same position
// ============================================
test('Two peers insert at position 0 concurrently → both converge to same string', () => {
  const doc1 = new Y.Doc()
  const doc2 = new Y.Doc()

  const text1 = doc1.getText('code')
  const text2 = doc2.getText('code')

  // Both peers independently insert at position 0
  text1.insert(0, 'Hello')
  text2.insert(0, 'World')

  // Before sync: they differ
  assert.notStrictEqual(text1.toString(), text2.toString())

  // Sync
  syncDocs(doc1, doc2)

  // After sync: they MUST be identical
  assert.strictEqual(text1.toString(), text2.toString())
  // Both strings should be present (order depends on clientID tiebreaker)
  assert.ok(text1.toString().includes('Hello'))
  assert.ok(text1.toString().includes('World'))
})

// ============================================
// Test 2: Concurrent insert and delete
// ============================================
test('Peer A deletes while Peer B inserts at the same position → both converge', () => {
  const doc1 = new Y.Doc()
  const doc2 = new Y.Doc()

  const text1 = doc1.getText('code')
  const text2 = doc2.getText('code')

  // Setup: both start with "ABCDE"
  text1.insert(0, 'ABCDE')
  syncDocs(doc1, doc2)
  assert.strictEqual(text2.toString(), 'ABCDE')

  // Peer 1 deletes "BCD" (index 1, length 3)
  text1.delete(1, 3)
  // Peer 2 inserts "XYZ" at index 2 (inside the range that Peer 1 is deleting)
  text2.insert(2, 'XYZ')

  // Sync
  syncDocs(doc1, doc2)

  // Both must converge to the same result
  assert.strictEqual(text1.toString(), text2.toString())
  // "XYZ" should survive (CRDT preserves inserts)
  assert.ok(text1.toString().includes('XYZ'))
  // "A" and "E" should survive (they weren't deleted)
  assert.ok(text1.toString().startsWith('A'))
  assert.ok(text1.toString().endsWith('E'))
})

// ============================================
// Test 3: Edits at different positions
// ============================================
test('Concurrent edits at different positions → both preserved in both peers', () => {
  const doc1 = new Y.Doc()
  const doc2 = new Y.Doc()

  const text1 = doc1.getText('code')
  const text2 = doc2.getText('code')

  // Setup
  text1.insert(0, 'function hello() {}')
  syncDocs(doc1, doc2)

  // Peer 1 edits the beginning
  text1.insert(0, '// comment\n')
  // Peer 2 edits the end
  text2.insert(text2.length, '\nhello()')

  // Sync
  syncDocs(doc1, doc2)

  assert.strictEqual(text1.toString(), text2.toString())
  assert.ok(text1.toString().includes('// comment'))
  assert.ok(text1.toString().includes('function hello() {}'))
  assert.ok(text1.toString().includes('hello()'))
})

// ============================================
// Test 4: Three-peer convergence
// ============================================
test('Three peers editing simultaneously → all three converge', () => {
  const doc1 = new Y.Doc()
  const doc2 = new Y.Doc()
  const doc3 = new Y.Doc()

  const text1 = doc1.getText('code')
  const text2 = doc2.getText('code')
  const text3 = doc3.getText('code')

  // Each peer independently inserts
  text1.insert(0, 'AAA')
  text2.insert(0, 'BBB')
  text3.insert(0, 'CCC')

  // Sync all pairs
  syncDocs(doc1, doc2)
  syncDocs(doc2, doc3)
  syncDocs(doc1, doc3)

  // All three must be identical
  assert.strictEqual(text1.toString(), text2.toString())
  assert.strictEqual(text2.toString(), text3.toString())
  assert.ok(text1.toString().includes('AAA'))
  assert.ok(text1.toString().includes('BBB'))
  assert.ok(text1.toString().includes('CCC'))
})

// ============================================
// Test 5: State vector correctness
// ============================================
test('State vectors correctly track operations per client', () => {
  const doc1 = new Y.Doc()
  const doc2 = new Y.Doc()

  const text1 = doc1.getText('code')
  const text2 = doc2.getText('code')

  // Peer 1 makes 3 edits
  text1.insert(0, 'A')
  text1.insert(1, 'B')
  text1.insert(2, 'C')

  // Peer 2 makes 2 edits
  text2.insert(0, 'X')
  text2.insert(1, 'Y')

  // Before sync, each doc only knows its own client
  const sv1Before = Array.from(doc1.store.clients.keys())
  assert.strictEqual(sv1Before.length, 1)

  syncDocs(doc1, doc2)

  // After sync, each doc knows both clients
  const sv1After = Array.from(doc1.store.clients.keys())
  assert.strictEqual(sv1After.length, 2)
  
  const sv2After = Array.from(doc2.store.clients.keys())
  assert.strictEqual(sv2After.length, 2)
})

// ============================================
// Test 6: Idempotent updates
// ============================================
test('Applying the same update twice is idempotent (no duplication)', () => {
  const doc1 = new Y.Doc()
  const doc2 = new Y.Doc()

  const text1 = doc1.getText('code')
  text1.insert(0, 'Hello World')

  const update = Y.encodeStateAsUpdate(doc1)
  
  // Apply the same update multiple times
  Y.applyUpdate(doc2, update)
  Y.applyUpdate(doc2, update)
  Y.applyUpdate(doc2, update)

  const text2 = doc2.getText('code')
  assert.strictEqual(text2.toString(), 'Hello World')
})

// ============================================
// Results
// ============================================
console.log(`\n${passed + failed} tests: ${passed} passed, ${failed} failed\n`)

if (failed > 0) {
  process.exit(1)
}

/**
 * Runnable checks for the pure logic that guards the live quiz.
 * No framework: `npm test` runs this file and it throws on the first failure.
 * Anything needing a database or Redis is deliberately out of scope here.
 */
import assert from 'assert';
import { canManageEvent } from './src/utils/eventAccess';
import { toCsv } from './src/utils/csv';

// --- authorization truth table -------------------------------------------
// Every protected handler routes its decision through this one function.
{
  const owner = { id: 'u1', role: 'HOST' };
  const other = { id: 'u2', role: 'HOST' };
  const admin = { id: 'u3', role: 'ADMIN' };
  const event = { hostId: 'u1' };

  assert.strictEqual(canManageEvent(owner, event), true, 'host manages own event');
  assert.strictEqual(canManageEvent(other, event), false, 'host cannot manage another host\'s event');
  assert.strictEqual(canManageEvent(admin, event), true, 'admin manages any event');
  assert.strictEqual(canManageEvent({ id: 'u2', role: 'admin' }, event), false, 'role check is case sensitive');
}

// --- CSV export escaping --------------------------------------------------
// Question text is user-authored, so commas, quotes and newlines all reach here.
{
  const csv = toCsv([
    { Name: 'Aagam', 'Q1 (Is 1,2 ok?)': 'Yes', Score: 3 },
    { Name: 'He said "hi"', 'Q1 (Is 1,2 ok?)': 'line\nbreak', Score: 0 },
  ]);
  const lines = csv.split('\r\n');

  assert.strictEqual(lines[0], '"Name","Q1 (Is 1,2 ok?)","Score"', 'header quoted');
  assert.strictEqual(lines[1], '"Aagam","Yes","3"', 'plain row');
  assert.ok(csv.includes('"He said ""hi"""'), 'inner quotes doubled');
  assert.ok(csv.includes('"line\nbreak"'), 'newline stays inside its quoted field');
  assert.strictEqual(toCsv([]), '', 'empty input');
}

console.log('checks passed');

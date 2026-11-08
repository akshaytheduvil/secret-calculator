import test from 'node:test';
import assert from 'node:assert/strict';

// Logic mirror of frontend/src/utils/smartPasteParser.ts
function parseSingleLine(line) {
  const results = [];
  const trimmed = line.trim();
  if (!trimmed) return results;

  // Pattern A: Number followed by explicit category, then counts
  const explicitCategoryMatch = trimmed.match(/^(\d{1,3})\s*([A-Za-z]+)[\s.,+=]+(\d+)(?:[\s.,+=]+(\d+))?$/i);
  if (explicitCategoryMatch) {
    const num = explicitCategoryMatch[1];
    const cat = explicitCategoryMatch[2].toUpperCase();
    const count1 = parseInt(explicitCategoryMatch[3], 10);
    const count2 = explicitCategoryMatch[4] ? parseInt(explicitCategoryMatch[4], 10) : count1;

    if (cat === 'BOX') {
      if (num.length !== 3) throw new Error('BOX category requires a 3-digit number');
      results.push({ lskCategory: 'BOX', bookedNumber: num, count: count1 });
      return results;
    }
    if (cat === 'SUPER' || cat === 'STRAIGHT') {
      if (num.length !== 3) throw new Error('SUPER category requires a 3-digit number');
      results.push({ lskCategory: 'SUPER', bookedNumber: num, count: count1 });
      return results;
    }
    if (cat === 'BOTH') {
      if (num.length !== 3) throw new Error('BOTH category requires a 3-digit number');
      results.push({ lskCategory: 'SUPER', bookedNumber: num, count: count1 });
      results.push({ lskCategory: 'BOX', bookedNumber: num, count: count2 });
      return results;
    }
    if (['AB', 'BC', 'AC'].includes(cat)) {
      if (num.length !== 2) throw new Error(`${cat} category requires a 2-digit number`);
      results.push({ lskCategory: cat, bookedNumber: num, count: count1 });
      return results;
    }
    if (['A', 'B', 'C'].includes(cat)) {
      if (num.length !== 1) throw new Error(`${cat} category requires a 1-digit number`);
      results.push({ lskCategory: cat, bookedNumber: num, count: count1 });
      return results;
    }
  }

  // Pattern B: Multi-delimiter "532+1+1", "532,1,1", "532.1.1"
  const multiCountMatch = trimmed.match(/^(\d{3})[+,.\s]+(\d+)[+,.\s]+(\d+)$/);
  if (multiCountMatch) {
    const num = multiCountMatch[1];
    results.push({ lskCategory: 'SUPER', bookedNumber: num, count: parseInt(multiCountMatch[2], 10) });
    results.push({ lskCategory: 'BOX', bookedNumber: num, count: parseInt(multiCountMatch[3], 10) });
    return results;
  }

  // Pattern C: Dot double count notation "532.11"
  const dotDoubleCountMatch = trimmed.match(/^(\d{3})\.(\d)(\d)$/);
  if (dotDoubleCountMatch) {
    const num = dotDoubleCountMatch[1];
    const superCount = parseInt(dotDoubleCountMatch[2], 10);
    const boxCount = parseInt(dotDoubleCountMatch[3], 10);
    if (superCount > 0) results.push({ lskCategory: 'SUPER', bookedNumber: num, count: superCount });
    if (boxCount > 0) results.push({ lskCategory: 'BOX', bookedNumber: num, count: boxCount });
    return results;
  }

  // Pattern D: Single count "952.1", "952+1", "952,1"
  const singleCountMatch = trimmed.match(/^(\d{1,3})[+,.\s]+(\d+)$/);
  if (singleCountMatch) {
    const num = singleCountMatch[1];
    const countVal = parseInt(singleCountMatch[2], 10);
    if (num.length === 3) {
      results.push({ lskCategory: 'SUPER', bookedNumber: num, count: countVal });
      return results;
    } else if (num.length === 2) {
      results.push({ lskCategory: 'AB', bookedNumber: num, count: countVal });
      return results;
    } else if (num.length === 1) {
      results.push({ lskCategory: 'A', bookedNumber: num, count: countVal });
      return results;
    }
  }

  throw new Error(`Unrecognized booking format: "${trimmed}"`);
}

function parseBookingMessage(text) {
  const lines = text.split(/[\r\n]+/);
  const entries = [];
  const errors = [];
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed) continue;
    try {
      entries.push(...parseSingleLine(trimmed));
    } catch (err) {
      errors.push(err.message);
    }
  }
  return { entries, errors };
}

test('Milestone 3: Smart Paste Parser - Example A (532.11 -> SUPER 1, BOX 1)', () => {
  const res = parseBookingMessage('532.11');
  assert.equal(res.errors.length, 0);
  assert.equal(res.entries.length, 2);
  assert.deepEqual(res.entries[0], { lskCategory: 'SUPER', bookedNumber: '532', count: 1 });
  assert.deepEqual(res.entries[1], { lskCategory: 'BOX', bookedNumber: '532', count: 1 });
});

test('Milestone 3: Smart Paste Parser - Example B (532+1+1 -> SUPER 1, BOX 1)', () => {
  const res = parseBookingMessage('532+1+1');
  assert.equal(res.errors.length, 0);
  assert.equal(res.entries.length, 2);
  assert.deepEqual(res.entries[0], { lskCategory: 'SUPER', bookedNumber: '532', count: 1 });
  assert.deepEqual(res.entries[1], { lskCategory: 'BOX', bookedNumber: '532', count: 1 });
});

test('Milestone 3: Smart Paste Parser - Example C (532,1,1 -> SUPER 1, BOX 1)', () => {
  const res = parseBookingMessage('532,1,1');
  assert.equal(res.errors.length, 0);
  assert.equal(res.entries.length, 2);
  assert.deepEqual(res.entries[0], { lskCategory: 'SUPER', bookedNumber: '532', count: 1 });
  assert.deepEqual(res.entries[1], { lskCategory: 'BOX', bookedNumber: '532', count: 1 });
});

test('Milestone 3: Smart Paste Parser - Example D (952.1 -> SUPER 1)', () => {
  const res = parseBookingMessage('952.1');
  assert.equal(res.errors.length, 0);
  assert.equal(res.entries.length, 1);
  assert.deepEqual(res.entries[0], { lskCategory: 'SUPER', bookedNumber: '952', count: 1 });
});

test('Milestone 3: Smart Paste Parser - Example E (952 Box.1 -> BOX 1)', () => {
  const res = parseBookingMessage('952 Box.1');
  assert.equal(res.errors.length, 0);
  assert.equal(res.entries.length, 1);
  assert.deepEqual(res.entries[0], { lskCategory: 'BOX', bookedNumber: '952', count: 1 });
});

test('Milestone 3: Smart Paste Parser - Example F (952 Super.1 -> SUPER 1)', () => {
  const res = parseBookingMessage('952 Super.1');
  assert.equal(res.errors.length, 0);
  assert.equal(res.entries.length, 1);
  assert.deepEqual(res.entries[0], { lskCategory: 'SUPER', bookedNumber: '952', count: 1 });
});

test('Milestone 3: Smart Paste Parser - Example G (12 AC.1 -> AC 1)', () => {
  const res = parseBookingMessage('12 AC.1');
  assert.equal(res.errors.length, 0);
  assert.equal(res.entries.length, 1);
  assert.deepEqual(res.entries[0], { lskCategory: 'AC', bookedNumber: '12', count: 1 });
});

test('Milestone 3: Smart Paste Parser - Multi-Line WhatsApp Message Parsing', () => {
  const message = `
    532.11
    952 Box.1
    12 AC.1
    777+2+3
    888.1
  `;
  const res = parseBookingMessage(message);
  assert.equal(res.errors.length, 0);
  assert.equal(res.entries.length, 7);
  assert.deepEqual(res.entries[0], { lskCategory: 'SUPER', bookedNumber: '532', count: 1 });
  assert.deepEqual(res.entries[1], { lskCategory: 'BOX', bookedNumber: '532', count: 1 });
  assert.deepEqual(res.entries[2], { lskCategory: 'BOX', bookedNumber: '952', count: 1 });
  assert.deepEqual(res.entries[3], { lskCategory: 'AC', bookedNumber: '12', count: 1 });
  assert.deepEqual(res.entries[4], { lskCategory: 'SUPER', bookedNumber: '777', count: 2 });
  assert.deepEqual(res.entries[5], { lskCategory: 'BOX', bookedNumber: '777', count: 3 });
  assert.deepEqual(res.entries[6], { lskCategory: 'SUPER', bookedNumber: '888', count: 1 });
});

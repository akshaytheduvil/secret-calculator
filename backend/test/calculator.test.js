import test from 'node:test';
import assert from 'node:assert/strict';

// Logic mirror of Calculator.tsx evaluateExpression & secret trigger
function evaluateExpression(expr) {
  const sanitized = expr.replace(/[+\-*/]+$/, '');
  if (!sanitized) return { success: true, result: 0 };

  const tokens = [];
  let i = 0;
  while (i < sanitized.length) {
    const char = sanitized[i];
    if (char === '+' || char === '*' || char === '/') {
      tokens.push(char);
      i++;
    } else if (char === '-') {
      const prev = tokens[tokens.length - 1];
      if (tokens.length === 0 || prev === '+' || prev === '-' || prev === '*' || prev === '/') {
        i++;
        let numStr = '-';
        while (i < sanitized.length && /[0-9.]/.test(sanitized[i])) {
          numStr += sanitized[i];
          i++;
        }
        if (numStr === '-') return { success: false, error: 'Format Error' };
        tokens.push(parseFloat(numStr));
      } else {
        tokens.push('-');
        i++;
      }
    } else if (/[0-9.]/.test(char)) {
      let numStr = '';
      while (i < sanitized.length && /[0-9.]/.test(sanitized[i])) {
        numStr += sanitized[i];
        i++;
      }
      tokens.push(parseFloat(numStr));
    } else {
      return { success: false, error: 'Invalid Character' };
    }
  }

  const pass1 = [];
  let idx = 0;
  while (idx < tokens.length) {
    const token = tokens[idx];
    if (token === '*' || token === '/') {
      const prev = pass1.pop();
      const next = tokens[idx + 1];
      if (typeof prev !== 'number' || typeof next !== 'number') {
        return { success: false, error: 'Syntax Error' };
      }
      if (token === '/' && next === 0) {
        return { success: false, error: 'Cannot divide by 0' };
      }
      pass1.push(token === '*' ? prev * next : prev / next);
      idx += 2;
    } else {
      pass1.push(token);
      idx++;
    }
  }

  if (pass1.length === 0) return { success: true, result: 0 };
  let finalResult = pass1[0];
  if (typeof finalResult !== 'number') return { success: false, error: 'Syntax Error' };

  let j = 1;
  while (j < pass1.length) {
    const op = pass1[j];
    const next = pass1[j + 1];
    if (typeof next !== 'number') return { success: false, error: 'Syntax Error' };
    if (op === '+') finalResult += next;
    else if (op === '-') finalResult -= next;
    else return { success: false, error: 'Syntax Error' };
    j += 2;
  }

  const rounded = Math.round(finalResult * 1e12) / 1e12;
  return { success: true, result: rounded };
}

function handleEquals(expr) {
  const normalized = expr.replace(/\s+/g, '');
  if (normalized === '11+22') {
    return { isSecretUnlock: true };
  }
  const evalResult = evaluateExpression(expr);
  return { isSecretUnlock: false, ...evalResult };
}

test('Milestone 1: Secret Calculator - Normal Calculations', () => {
  assert.equal(evaluateExpression('2+3').result, 5);
  assert.equal(evaluateExpression('10-4').result, 6);
  assert.equal(evaluateExpression('7*8').result, 56);
  assert.equal(evaluateExpression('100/4').result, 25);
  assert.equal(evaluateExpression('2+3*4').result, 14, 'Must follow BODMAS order of operations');
  assert.equal(evaluateExpression('0.1+0.2').result, 0.3, 'Decimal precision rounded cleanly');
  assert.equal(evaluateExpression('10/0').error, 'Cannot divide by 0');
});

test('Milestone 1: Secret Calculator - Secret Expression Trigger', () => {
  assert.deepEqual(handleEquals('11+22'), { isSecretUnlock: true });
  assert.deepEqual(handleEquals('11 + 22'), { isSecretUnlock: true });
  assert.deepEqual(handleEquals(' 11 + 22 '), { isSecretUnlock: true });
});

test('Milestone 1: Secret Calculator - Non-Secret Calculations Must Never Trigger', () => {
  const r1 = handleEquals('11+20');
  assert.equal(r1.isSecretUnlock, false);
  assert.equal(r1.result, 31);

  const r2 = handleEquals('11+22+5');
  assert.equal(r2.isSecretUnlock, false);
  assert.equal(r2.result, 38);

  const r3 = handleEquals('22+11');
  assert.equal(r3.isSecretUnlock, false);
  assert.equal(r3.result, 33);

  const r4 = handleEquals('111+22');
  assert.equal(r4.isSecretUnlock, false);
  assert.equal(r4.result, 133);
});

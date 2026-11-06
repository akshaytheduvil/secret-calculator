import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Delete, RotateCcw } from 'lucide-react';

interface CalculatorProps {
  onUnlock: () => void;
}

export const Calculator: React.FC<CalculatorProps> = ({ onUnlock }) => {
  const [expression, setExpression] = useState<string>('');
  const [displayValue, setDisplayValue] = useState<string>('0');
  const [isEvaluated, setIsEvaluated] = useState<boolean>(false);
  const [hasError, setHasError] = useState<boolean>(false);
  const displayEndRef = useRef<HTMLDivElement>(null);

  // Auto scroll display right
  useEffect(() => {
    if (displayEndRef.current) {
      displayEndRef.current.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'end' });
    }
  }, [expression, displayValue]);

  // Safe arithmetic evaluator
  const calculateResult = (expr: string): { success: boolean; result?: number; error?: string } => {
    try {
      // Clean trailing operators
      const sanitized = expr.replace(/[+\-*/]+$/, '');
      if (!sanitized) return { success: true, result: 0 };

      // Tokenize
      const tokens: (number | string)[] = [];
      let i = 0;
      while (i < sanitized.length) {
        const char = sanitized[i];
        if (char === '+' || char === '*' || char === '/') {
          tokens.push(char);
          i++;
        } else if (char === '-') {
          const prev = tokens[tokens.length - 1];
          if (tokens.length === 0 || prev === '+' || prev === '-' || prev === '*' || prev === '/') {
            // Negative number
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

      // Multiplication and Division pass (Left to Right)
      const pass1: (number | string)[] = [];
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

      // Addition and Subtraction pass
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

      // Precision rounding
      const rounded = Math.round(finalResult * 1e12) / 1e12;
      return { success: true, result: rounded };
    } catch {
      return { success: false, error: 'Error' };
    }
  };

  const handleInput = useCallback((val: string) => {
    if (hasError) {
      setHasError(false);
      setExpression(val);
      setDisplayValue(val);
      setIsEvaluated(false);
      return;
    }

    if (isEvaluated) {
      if (['+', '-', '*', '/'].includes(val)) {
        setExpression(displayValue + val);
        setDisplayValue(displayValue + val);
      } else {
        setExpression(val);
        setDisplayValue(val);
      }
      setIsEvaluated(false);
      return;
    }

    // Prevent multiple decimals in same number block
    if (val === '.') {
      const parts = expression.split(/[+\-*/]/);
      const currentPart = parts[parts.length - 1];
      if (currentPart.includes('.')) return;
      if (!currentPart) {
        const nextExpr = expression + '0.';
        setExpression(nextExpr);
        setDisplayValue(nextExpr);
        return;
      }
    }

    // Prevent duplicate operators (replace last operator or allow negative)
    if (['+', '-', '*', '/'].includes(val)) {
      if (!expression) {
        if (val === '-') {
          setExpression('-');
          setDisplayValue('-');
        }
        return;
      }
      if (/[+\-*/]$/.test(expression)) {
        if (val === '-' && (expression.endsWith('*') || expression.endsWith('/'))) {
          const nextExpr = expression + '-';
          setExpression(nextExpr);
          setDisplayValue(nextExpr);
          return;
        }
        const nextExpr = expression.replace(/[+\-*/]+$/, val);
        setExpression(nextExpr);
        setDisplayValue(nextExpr);
        return;
      }
    }

    const nextExpr = expression + val;
    setExpression(nextExpr);
    setDisplayValue(nextExpr);
  }, [expression, displayValue, isEvaluated, hasError]);

  const handleClear = useCallback(() => {
    setExpression('');
    setDisplayValue('0');
    setIsEvaluated(false);
    setHasError(false);
  }, []);

  const handleDelete = useCallback(() => {
    if (hasError || isEvaluated) {
      handleClear();
      return;
    }
    if (expression.length <= 1) {
      handleClear();
      return;
    }
    const nextExpr = expression.slice(0, -1);
    setExpression(nextExpr);
    setDisplayValue(nextExpr);
  }, [expression, hasError, isEvaluated, handleClear]);

  const handleEquals = useCallback(() => {
    if (!expression || hasError) return;

    // Check strict secret expression: exactly "11+22" (ignoring whitespace)
    const normalized = expression.replace(/\s+/g, '');
    if (normalized === '11+22') {
      handleClear();
      onUnlock();
      return;
    }

    // Normal calculation
    const res = calculateResult(expression);
    if (!res.success || res.result === undefined) {
      setHasError(true);
      setDisplayValue(res.error || 'Error');
    } else {
      setDisplayValue(String(res.result));
      setExpression(String(res.result));
      setIsEvaluated(true);
    }
  }, [expression, hasError, handleClear, onUnlock]);

  const handlePercentage = useCallback(() => {
    if (!expression || hasError) return;
    const match = expression.match(/([0-9.]+)$/);
    if (!match) return;
    const num = parseFloat(match[1]);
    if (isNaN(num)) return;
    const pct = Math.round((num / 100) * 1e12) / 1e12;
    const nextExpr = expression.slice(0, -match[1].length) + String(pct);
    setExpression(nextExpr);
    setDisplayValue(nextExpr);
  }, [expression, hasError]);

  // Physical keyboard support
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ignore if user is inside a form input elsewhere
      if (['INPUT', 'TEXTAREA'].includes((e.target as HTMLElement)?.tagName)) {
        return;
      }

      if (e.key >= '0' && e.key <= '9') {
        e.preventDefault();
        handleInput(e.key);
      } else if (e.key === '.') {
        e.preventDefault();
        handleInput('.');
      } else if (['+', '-', '*', '/'].includes(e.key)) {
        e.preventDefault();
        handleInput(e.key);
      } else if (e.key === 'Enter' || e.key === '=') {
        e.preventDefault();
        handleEquals();
      } else if (e.key === 'Backspace') {
        e.preventDefault();
        handleDelete();
      } else if (e.key === 'Escape' || e.key.toLowerCase() === 'c') {
        e.preventDefault();
        handleClear();
      } else if (e.key === '%') {
        e.preventDefault();
        handlePercentage();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleInput, handleEquals, handleDelete, handleClear, handlePercentage]);

  // Formatting display text with pleasant operator spacing
  const formatDisplay = (expr: string) => {
    if (hasError) return expr;
    return expr
      .replace(/\*/g, ' × ')
      .replace(/\//g, ' ÷ ')
      .replace(/\+/g, ' + ')
      .replace(/(?<=\d)-(?=\d)/g, ' − ');
  };

  return (
    <div className="min-h-screen bg-[#0d0e12] flex items-center justify-center p-0 sm:p-4 select-none">
      <div className="w-full max-w-sm sm:max-w-md h-screen sm:h-auto sm:min-h-[640px] bg-[#14161d] sm:rounded-3xl shadow-2xl flex flex-col justify-between border border-zinc-800/80 p-5 sm:p-6 overflow-hidden">
        
        {/* Top Header / App Brand */}
        <div className="flex items-center justify-between pb-2 pt-1 border-b border-zinc-800/40">
          <span className="text-xs font-medium tracking-widest text-zinc-400 uppercase">Calculator</span>
          <span className="w-2 h-2 rounded-full bg-emerald-500/80 animate-pulse"></span>
        </div>

        {/* Display Area */}
        <div className="flex-1 flex flex-col justify-end items-end py-6 px-2 overflow-hidden">
          <div className="w-full text-right text-sm text-zinc-400 font-mono tracking-wider min-h-[24px] truncate">
            {isEvaluated ? '' : formatDisplay(expression)}
          </div>
          <div className="w-full overflow-x-auto text-right no-scrollbar py-2">
            <span
              className={`font-light font-mono tracking-tight text-white transition-all duration-150 inline-block ${
                displayValue.length > 12
                  ? 'text-3xl'
                  : displayValue.length > 8
                  ? 'text-4xl'
                  : 'text-5xl sm:text-6xl'
              } ${hasError ? 'text-rose-400 font-normal text-3xl' : ''}`}
            >
              {hasError ? displayValue : formatDisplay(displayValue)}
            </span>
            <div ref={displayEndRef} />
          </div>
        </div>

        {/* Keypad Grid */}
        <div className="grid grid-cols-4 gap-3 sm:gap-3.5 pb-2">
          {/* Row 1 */}
          <button
            type="button"
            onClick={handleClear}
            className="h-16 sm:h-16 rounded-2xl bg-zinc-800/90 text-amber-400 text-lg font-semibold active:scale-95 transition-transform hover:bg-zinc-700/80 shadow-md flex items-center justify-center"
            aria-label="All Clear"
          >
            AC
          </button>
          <button
            type="button"
            onClick={handleDelete}
            className="h-16 sm:h-16 rounded-2xl bg-zinc-800/90 text-zinc-300 text-lg font-medium active:scale-95 transition-transform hover:bg-zinc-700/80 shadow-md flex items-center justify-center"
            aria-label="Delete"
          >
            <Delete className="w-5 h-5" />
          </button>
          <button
            type="button"
            onClick={handlePercentage}
            className="h-16 sm:h-16 rounded-2xl bg-zinc-800/90 text-zinc-300 text-xl font-medium active:scale-95 transition-transform hover:bg-zinc-700/80 shadow-md flex items-center justify-center"
            aria-label="Percent"
          >
            %
          </button>
          <button
            type="button"
            onClick={() => handleInput('/')}
            className="h-16 sm:h-16 rounded-2xl bg-amber-600 text-white text-2xl font-medium active:scale-95 transition-transform hover:bg-amber-500 shadow-lg shadow-amber-600/20 flex items-center justify-center"
            aria-label="Divide"
          >
            ÷
          </button>

          {/* Row 2 */}
          <button
            type="button"
            onClick={() => handleInput('7')}
            className="h-16 sm:h-16 rounded-2xl bg-zinc-850 bg-zinc-800/60 text-white text-2xl font-normal active:scale-95 transition-transform hover:bg-zinc-700/60 shadow-md flex items-center justify-center"
          >
            7
          </button>
          <button
            type="button"
            onClick={() => handleInput('8')}
            className="h-16 sm:h-16 rounded-2xl bg-zinc-800/60 text-white text-2xl font-normal active:scale-95 transition-transform hover:bg-zinc-700/60 shadow-md flex items-center justify-center"
          >
            8
          </button>
          <button
            type="button"
            onClick={() => handleInput('9')}
            className="h-16 sm:h-16 rounded-2xl bg-zinc-800/60 text-white text-2xl font-normal active:scale-95 transition-transform hover:bg-zinc-700/60 shadow-md flex items-center justify-center"
          >
            9
          </button>
          <button
            type="button"
            onClick={() => handleInput('*')}
            className="h-16 sm:h-16 rounded-2xl bg-amber-600 text-white text-2xl font-medium active:scale-95 transition-transform hover:bg-amber-500 shadow-lg shadow-amber-600/20 flex items-center justify-center"
            aria-label="Multiply"
          >
            ×
          </button>

          {/* Row 3 */}
          <button
            type="button"
            onClick={() => handleInput('4')}
            className="h-16 sm:h-16 rounded-2xl bg-zinc-800/60 text-white text-2xl font-normal active:scale-95 transition-transform hover:bg-zinc-700/60 shadow-md flex items-center justify-center"
          >
            4
          </button>
          <button
            type="button"
            onClick={() => handleInput('5')}
            className="h-16 sm:h-16 rounded-2xl bg-zinc-800/60 text-white text-2xl font-normal active:scale-95 transition-transform hover:bg-zinc-700/60 shadow-md flex items-center justify-center"
          >
            5
          </button>
          <button
            type="button"
            onClick={() => handleInput('6')}
            className="h-16 sm:h-16 rounded-2xl bg-zinc-800/60 text-white text-2xl font-normal active:scale-95 transition-transform hover:bg-zinc-700/60 shadow-md flex items-center justify-center"
          >
            6
          </button>
          <button
            type="button"
            onClick={() => handleInput('-')}
            className="h-16 sm:h-16 rounded-2xl bg-amber-600 text-white text-2xl font-medium active:scale-95 transition-transform hover:bg-amber-500 shadow-lg shadow-amber-600/20 flex items-center justify-center"
            aria-label="Subtract"
          >
            −
          </button>

          {/* Row 4 */}
          <button
            type="button"
            onClick={() => handleInput('1')}
            className="h-16 sm:h-16 rounded-2xl bg-zinc-800/60 text-white text-2xl font-normal active:scale-95 transition-transform hover:bg-zinc-700/60 shadow-md flex items-center justify-center"
          >
            1
          </button>
          <button
            type="button"
            onClick={() => handleInput('2')}
            className="h-16 sm:h-16 rounded-2xl bg-zinc-800/60 text-white text-2xl font-normal active:scale-95 transition-transform hover:bg-zinc-700/60 shadow-md flex items-center justify-center"
          >
            2
          </button>
          <button
            type="button"
            onClick={() => handleInput('3')}
            className="h-16 sm:h-16 rounded-2xl bg-zinc-800/60 text-white text-2xl font-normal active:scale-95 transition-transform hover:bg-zinc-700/60 shadow-md flex items-center justify-center"
          >
            3
          </button>
          <button
            type="button"
            onClick={() => handleInput('+')}
            className="h-16 sm:h-16 rounded-2xl bg-amber-600 text-white text-2xl font-medium active:scale-95 transition-transform hover:bg-amber-500 shadow-lg shadow-amber-600/20 flex items-center justify-center"
            aria-label="Add"
          >
            +
          </button>

          {/* Row 5 */}
          <button
            type="button"
            onClick={handleClear}
            className="h-16 sm:h-16 rounded-2xl bg-zinc-800/40 text-zinc-400 text-sm font-medium active:scale-95 transition-transform hover:bg-zinc-700/50 shadow-md flex items-center justify-center"
            aria-label="Reset"
          >
            <RotateCcw className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={() => handleInput('0')}
            className="h-16 sm:h-16 rounded-2xl bg-zinc-800/60 text-white text-2xl font-normal active:scale-95 transition-transform hover:bg-zinc-700/60 shadow-md flex items-center justify-center"
          >
            0
          </button>
          <button
            type="button"
            onClick={() => handleInput('.')}
            className="h-16 sm:h-16 rounded-2xl bg-zinc-800/60 text-white text-2xl font-normal active:scale-95 transition-transform hover:bg-zinc-700/60 shadow-md flex items-center justify-center"
            aria-label="Decimal point"
          >
            .
          </button>
          <button
            type="button"
            onClick={handleEquals}
            className="h-16 sm:h-16 rounded-2xl bg-emerald-600 text-white text-2xl font-medium active:scale-95 transition-transform hover:bg-emerald-500 shadow-lg shadow-emerald-600/20 flex items-center justify-center"
            aria-label="Equals"
          >
            =
          </button>
        </div>
      </div>
    </div>
  );
};

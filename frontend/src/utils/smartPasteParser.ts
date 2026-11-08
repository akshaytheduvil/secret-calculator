export interface ParsedBookingEntry {
  id: string;
  lskCategory: 'SUPER' | 'BOX' | 'AB' | 'BC' | 'AC' | 'A' | 'B' | 'C';
  bookedNumber: string;
  count: number;
  originalText: string;
}

export interface ParseResult {
  entries: ParsedBookingEntry[];
  errors: string[];
  rawText: string;
}

/**
 * Smart Paste Parser for WhatsApp Customer Booking Messages
 * Supports:
 * - 532.11 -> 532 SUPER 1, 532 BOX 1
 * - 532+1+1 -> 532 SUPER 1, 532 BOX 1
 * - 532,1,1 -> 532 SUPER 1, 532 BOX 1
 * - 952.1 -> 952 SUPER 1
 * - 952 Box.1 / 952 box 1 -> 952 BOX 1
 * - 952 Super.1 / 952 super 1 / 952 straight 1 -> 952 SUPER 1
 * - 952 Both.1.1 / 952 both 1 1 -> 952 SUPER 1, 952 BOX 1
 * - 12 AC.1 / 12 ac 1 -> 12 AC 1
 * - 12 AB.1 / 12 ab 1 -> 12 AB 1
 * - 12 BC.1 / 12 bc 1 -> 12 BC 1
 * - 5 A.1 / 5 a 1 -> 5 A 1
 * - Multi-line messages with mixed formats
 */
export function parseBookingMessage(text: string): ParseResult {
  const lines = text.split(/[\r\n]+/);
  const entries: ParsedBookingEntry[] = [];
  const errors: string[] = [];

  for (let lineIdx = 0; lineIdx < lines.length; lineIdx++) {
    const rawLine = lines[lineIdx].trim();
    if (!rawLine) continue;

    // Check if line contains multiple entries separated by semicolons or commas (if not standard comma format)
    // E.g. "532.11; 952 Box.1"
    const subSegments = rawLine.includes(';') ? rawLine.split(';') : [rawLine];

    for (const segment of subSegments) {
      const line = segment.trim();
      if (!line) continue;

      try {
        const parsed = parseSingleLine(line);
        if (parsed.length > 0) {
          entries.push(...parsed);
        } else {
          errors.push(`Could not interpret entry: "${line}". Please check format.`);
        }
      } catch (err: any) {
        errors.push(`Error in "${line}": ${err.message}`);
      }
    }
  }

  return {
    entries,
    errors,
    rawText: text
  };
}

function parseSingleLine(line: string): ParsedBookingEntry[] {
  const results: ParsedBookingEntry[] = [];

  // 1. Detect explicit category keyword in line (case-insensitive)
  // Categories: SUPER, BOX, STRAIGHT, BOTH, AB, BC, AC, A, B, C

  // Pattern A: Number followed by explicit category, then counts
  // e.g., "952 Box.1", "952 Super.1", "952 Straight.1", "12 AC.1", "12 AC 1", "952 BOTH 1 1", "952 both.1.1"
  const explicitCategoryMatch = line.match(/^(\d{1,3})\s*([A-Za-z]+)[\s.,+=]+(\d+)(?:[\s.,+=]+(\d+))?$/i);
  if (explicitCategoryMatch) {
    const num = explicitCategoryMatch[1];
    const cat = explicitCategoryMatch[2].toUpperCase();
    const count1 = parseInt(explicitCategoryMatch[3], 10);
    const count2 = explicitCategoryMatch[4] ? parseInt(explicitCategoryMatch[4], 10) : count1;

    if (cat === 'BOX') {
      if (num.length !== 3) throw new Error('BOX category requires a 3-digit number');
      results.push({
        id: Math.random().toString(36).substring(7),
        lskCategory: 'BOX',
        bookedNumber: num,
        count: count1,
        originalText: line
      });
      return results;
    }

    if (cat === 'SUPER' || cat === 'STRAIGHT') {
      if (num.length !== 3) throw new Error('SUPER category requires a 3-digit number');
      results.push({
        id: Math.random().toString(36).substring(7),
        lskCategory: 'SUPER',
        bookedNumber: num,
        count: count1,
        originalText: line
      });
      return results;
    }

    if (cat === 'BOTH') {
      if (num.length !== 3) throw new Error('BOTH category requires a 3-digit number');
      results.push({
        id: Math.random().toString(36).substring(7),
        lskCategory: 'SUPER',
        bookedNumber: num,
        count: count1,
        originalText: line
      });
      results.push({
        id: Math.random().toString(36).substring(7),
        lskCategory: 'BOX',
        bookedNumber: num,
        count: count2,
        originalText: line
      });
      return results;
    }

    if (['AB', 'BC', 'AC'].includes(cat)) {
      if (num.length !== 2) throw new Error(`${cat} category requires a 2-digit number`);
      results.push({
        id: Math.random().toString(36).substring(7),
        lskCategory: cat as any,
        bookedNumber: num,
        count: count1,
        originalText: line
      });
      return results;
    }

    if (['A', 'B', 'C'].includes(cat)) {
      if (num.length !== 1) throw new Error(`${cat} category requires a 1-digit number`);
      results.push({
        id: Math.random().toString(36).substring(7),
        lskCategory: cat as any,
        bookedNumber: num,
        count: count1,
        originalText: line
      });
      return results;
    }
  }

  // Pattern B: Delimited two counts with symbols +, ,, or .
  // Examples: "532+1+1", "532,1,1", "532.1.1", "532 1 1"
  const multiCountMatch = line.match(/^(\d{3})[+,.\s]+(\d+)[+,.\s]+(\d+)$/);
  if (multiCountMatch) {
    const num = multiCountMatch[1];
    const superCount = parseInt(multiCountMatch[2], 10);
    const boxCount = parseInt(multiCountMatch[3], 10);

    results.push({
      id: Math.random().toString(36).substring(7),
      lskCategory: 'SUPER',
      bookedNumber: num,
      count: superCount,
      originalText: line
    });
    results.push({
      id: Math.random().toString(36).substring(7),
      lskCategory: 'BOX',
      bookedNumber: num,
      count: boxCount,
      originalText: line
    });
    return results;
  }

  // Pattern C: Indian Pick 3 dot notation: "532.11"
  // Here ".11" means Super Count = 1, Box Count = 1
  // ".22" means Super Count = 2, Box Count = 2
  // ".12" means Super Count = 1, Box Count = 2
  const dotDoubleCountMatch = line.match(/^(\d{3})\.(\d)(\d)$/);
  if (dotDoubleCountMatch) {
    const num = dotDoubleCountMatch[1];
    const superCount = parseInt(dotDoubleCountMatch[2], 10);
    const boxCount = parseInt(dotDoubleCountMatch[3], 10);

    if (superCount > 0) {
      results.push({
        id: Math.random().toString(36).substring(7),
        lskCategory: 'SUPER',
        bookedNumber: num,
        count: superCount,
        originalText: line
      });
    }
    if (boxCount > 0) {
      results.push({
        id: Math.random().toString(36).substring(7),
        lskCategory: 'BOX',
        bookedNumber: num,
        count: boxCount,
        originalText: line
      });
    }
    return results;
  }

  // Pattern D: Single count notation with delimiter: "952.1", "952+1", "952,1", "952 1"
  const singleCountMatch = line.match(/^(\d{1,3})[+,.\s]+(\d+)$/);
  if (singleCountMatch) {
    const num = singleCountMatch[1];
    const countVal = parseInt(singleCountMatch[2], 10);

    if (num.length === 3) {
      // 3-digit defaults to SUPER
      results.push({
        id: Math.random().toString(36).substring(7),
        lskCategory: 'SUPER',
        bookedNumber: num,
        count: countVal,
        originalText: line
      });
      return results;
    } else if (num.length === 2) {
      // 2-digit defaults to AB
      results.push({
        id: Math.random().toString(36).substring(7),
        lskCategory: 'AB',
        bookedNumber: num,
        count: countVal,
        originalText: line
      });
      return results;
    } else if (num.length === 1) {
      // 1-digit defaults to A
      results.push({
        id: Math.random().toString(36).substring(7),
        lskCategory: 'A',
        bookedNumber: num,
        count: countVal,
        originalText: line
      });
      return results;
    }
  }

  // If no pattern matched, throw descriptive error
  throw new Error(`Unrecognized booking format. Use e.g. 532.11, 532+1+1, 952 Box.1, 12 AC.1`);
}

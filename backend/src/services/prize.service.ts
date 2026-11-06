import { db } from '../database/db.js';

export interface PublishedResultInput {
  firstPrize?: string | null;
  secondPrize?: string | null;
  thirdPrize?: string | null;
  fourthPrize?: string | null;
  fifthPrize?: string | null;
  complementaryNumbers?: string[];
  isPublished?: boolean;
}

export class PrizeService {
  // Helper to generate all unique permutations of a 3-digit string for BOX matching
  static getBoxPermutations(numberStr: string): string[] {
    if (numberStr.length !== 3) return [numberStr];
    const chars = numberStr.split('');
    const perms = new Set<string>();

    const permute = (arr: string[], m: string[] = []) => {
      if (arr.length === 0) {
        perms.add(m.join(''));
      } else {
        for (let i = 0; i < arr.length; i++) {
          const curr = arr.slice();
          const next = curr.splice(i, 1);
          permute(curr.slice(), m.concat(next));
        }
      }
    };

    permute(chars);
    return Array.from(perms);
  }

  // Get active prize configuration
  static async getPrizeConfig(): Promise<{
    superPrize: number;
    boxPrize: number;
    oneDigitPrize: number;
    twoDigitPrize: number;
    complementaryPrize: number;
  }> {
    const res = await db.query(`SELECT * FROM prize_configs ORDER BY updated_at DESC LIMIT 1`);
    if (res.rows.length === 0) {
      return {
        superPrize: 5000,
        boxPrize: 3000,
        oneDigitPrize: 100,
        twoDigitPrize: 700,
        complementaryPrize: 20
      };
    }
    const r = res.rows[0];
    return {
      superPrize: Number(r.super_prize),
      boxPrize: Number(r.box_prize),
      oneDigitPrize: Number(r.one_digit_prize),
      twoDigitPrize: Number(r.two_digit_prize),
      complementaryPrize: Number(r.complementary_prize)
    };
  }

  // Authoritative Prize Evaluation for a Bill Item against Declared Draw Results
  static evaluateItem(
    item: { id: string; lskCategory: string; bookedNumber: string; count: number; unitDPrice: number },
    drawResult: {
      firstPrize?: string | null;
      secondPrize?: string | null;
      thirdPrize?: string | null;
      fourthPrize?: string | null;
      fifthPrize?: string | null;
      complementaryNumbers?: string[];
    },
    prizeConfig: {
      superPrize: number;
      boxPrize: number;
      oneDigitPrize: number;
      twoDigitPrize: number;
      complementaryPrize: number;
    },
    dealerWinningCommissionRate: number
  ): { category: string; matchedNumber: string; matchCount: number; prizeAmount: number; dealerCommission: number }[] {
    const wins: { category: string; matchedNumber: string; matchCount: number; prizeAmount: number; dealerCommission: number }[] = [];
    const firstPrize = drawResult.firstPrize?.trim() || null;
    const allPrizes = [
      firstPrize,
      drawResult.secondPrize?.trim() || null,
      drawResult.thirdPrize?.trim() || null,
      drawResult.fourthPrize?.trim() || null,
      drawResult.fifthPrize?.trim() || null
    ].filter(Boolean) as string[];

    const compNumbers = (drawResult.complementaryNumbers || []).map(n => n.trim());

    // 1. SUPER straight exact match against First through Fifth Prize
    if (item.lskCategory === 'SUPER') {
      for (let pIdx = 0; pIdx < allPrizes.length; pIdx++) {
        const prizeNum = allPrizes[pIdx];
        if (item.bookedNumber === prizeNum) {
          const prizePerCount = prizeConfig.superPrize;
          const totalPrize = prizePerCount * item.count;
          const totalDC = dealerWinningCommissionRate * item.count;
          wins.push({
            category: `SUPER Prize #${pIdx + 1}`,
            matchedNumber: prizeNum,
            matchCount: item.count,
            prizeAmount: totalPrize,
            dealerCommission: totalDC
          });
          break; // Single win per prize tier
        }
      }
    }

    // 2. BOX permutation match against First Prize only
    if (item.lskCategory === 'BOX' && firstPrize && firstPrize.length === 3) {
      const boxPermutations = this.getBoxPermutations(item.bookedNumber);
      if (boxPermutations.includes(firstPrize)) {
        const prizePerCount = prizeConfig.boxPrize;
        const totalPrize = prizePerCount * item.count;
        const totalDC = dealerWinningCommissionRate * item.count;
        wins.push({
          category: 'BOX 1st Prize',
          matchedNumber: firstPrize,
          matchCount: item.count,
          prizeAmount: totalPrize,
          dealerCommission: totalDC
        });
      }
    }

    // 3. One-Digit match (A, B, C) against First Prize only
    if (['A', 'B', 'C'].includes(item.lskCategory) && firstPrize && firstPrize.length === 3) {
      const charA = firstPrize[0];
      const charB = firstPrize[1];
      const charC = firstPrize[2];

      let isMatch = false;
      let posLabel = '';
      if (item.lskCategory === 'A' && item.bookedNumber === charA) {
        isMatch = true;
        posLabel = 'Pos A';
      } else if (item.lskCategory === 'B' && item.bookedNumber === charB) {
        isMatch = true;
        posLabel = 'Pos B';
      } else if (item.lskCategory === 'C' && item.bookedNumber === charC) {
        isMatch = true;
        posLabel = 'Pos C';
      }

      if (isMatch) {
        const totalPrize = prizeConfig.oneDigitPrize * item.count;
        const totalDC = (dealerWinningCommissionRate > 0 ? (dealerWinningCommissionRate / 10) : 0) * item.count;
        wins.push({
          category: `One-Digit (${posLabel})`,
          matchedNumber: item.bookedNumber,
          matchCount: item.count,
          prizeAmount: totalPrize,
          dealerCommission: totalDC
        });
      }
    }

    // 4. Two-Digit match (AB, BC, AC) against First Prize only
    if (['AB', 'BC', 'AC'].includes(item.lskCategory) && firstPrize && firstPrize.length === 3) {
      const pairAB = firstPrize.slice(0, 2);
      const pairBC = firstPrize.slice(1, 3);
      const pairAC = firstPrize[0] + firstPrize[2];

      let isMatch = false;
      let pairLabel = '';
      if (item.lskCategory === 'AB' && item.bookedNumber === pairAB) {
        isMatch = true;
        pairLabel = 'Pair AB';
      } else if (item.lskCategory === 'BC' && item.bookedNumber === pairBC) {
        isMatch = true;
        pairLabel = 'Pair BC';
      } else if (item.lskCategory === 'AC' && item.bookedNumber === pairAC) {
        isMatch = true;
        pairLabel = 'Pair AC';
      }

      if (isMatch) {
        const totalPrize = prizeConfig.twoDigitPrize * item.count;
        const totalDC = (dealerWinningCommissionRate > 0 ? (dealerWinningCommissionRate / 5) : 0) * item.count;
        wins.push({
          category: `Two-Digit (${pairLabel})`,
          matchedNumber: item.bookedNumber,
          matchCount: item.count,
          prizeAmount: totalPrize,
          dealerCommission: totalDC
        });
      }
    }

    // 5. Complementary match
    if (compNumbers.length > 0 && compNumbers.includes(item.bookedNumber)) {
      const totalPrize = prizeConfig.complementaryPrize * item.count;
      wins.push({
        category: 'Complementary Prize',
        matchedNumber: item.bookedNumber,
        matchCount: item.count,
        prizeAmount: totalPrize,
        dealerCommission: 0
      });
    }

    return wins;
  }

  // Reconcile and calculate winning records for a given draw after results are published or updated
  static async reconcileDrawWins(drawId: string): Promise<number> {
    const drawRes = await db.query(
      `SELECT d.id, d.game_code, d.draw_date, r.first_prize, r.second_prize, r.third_prize, 
              r.fourth_prize, r.fifth_prize, r.complementary_numbers, r.is_published
       FROM draw_schedules d
       JOIN draw_results r ON d.id = r.draw_id
       WHERE d.id = $1`,
      [drawId]
    );

    if (drawRes.rows.length === 0) return 0;
    const drawData = drawRes.rows[0];

    const prizeConfig = await this.getPrizeConfig();

    return await db.transaction(async (client) => {
      // 1. Wipe existing winning records for this draw to ensure clean re-calculation
      await client.query(`DELETE FROM winning_records WHERE draw_id = $1`, [drawId]);

      // 2. Fetch all active bill items for this draw along with dealer config
      const itemsRes = await client.query(
        `SELECT bi.id AS bill_item_id, bi.bill_id, bi.lsk_category, bi.booked_number, bi.count, bi.unit_d_price,
                b.user_id, COALESCE(dc.winning_commission_dc, 0) AS dealer_dc
         FROM bill_items bi
         JOIN bills b ON bi.bill_id = b.id
         LEFT JOIN dealer_configs dc ON b.user_id = dc.user_id
         WHERE b.draw_id = $1 AND b.status = 'ACTIVE'`,
        [drawId]
      );

      let insertCount = 0;

      for (const item of itemsRes.rows) {
        const itemWins = this.evaluateItem(
          {
            id: item.bill_item_id,
            lskCategory: item.lsk_category,
            bookedNumber: item.bookedNumber || item.booked_number,
            count: Number(item.count),
            unitDPrice: Number(item.unit_d_price)
          },
          {
            firstPrize: drawData.first_prize,
            secondPrize: drawData.second_prize,
            thirdPrize: drawData.third_prize,
            fourthPrize: drawData.fourth_prize,
            fifthPrize: drawData.fifth_prize,
            complementaryNumbers: drawData.complementary_numbers || []
          },
          prizeConfig,
          Number(item.dealer_dc)
        );

        for (const w of itemWins) {
          await client.query(
            `INSERT INTO winning_records (
              draw_id, bill_id, bill_item_id, winning_category,
              matched_number, match_count, prize_amount, dealer_commission
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
            [
              drawId,
              item.bill_id,
              item.bill_item_id,
              w.category,
              w.matchedNumber,
              w.matchCount,
              w.prizeAmount,
              w.dealerCommission
            ]
          );
          insertCount++;
        }
      }

      return insertCount;
    });
  }
}

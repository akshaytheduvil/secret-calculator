// Client-side simulation fallback engine for static hosting (e.g. GitHub Pages) or offline mode

export interface MockUser {
  id: string;
  username: string;
  role: 'ADMIN' | 'AGENT' | 'SUBDEALER';
  parent_id?: string | null;
  is_active: boolean;
  sales_commission?: number;
}

export class MockFallback {
  private static currentUser: MockUser | null = null;

  private static getStorage<T>(key: string, defaultValue: T): T {
    try {
      const data = localStorage.getItem(`sc_${key}`);
      return data ? JSON.parse(data) : defaultValue;
    } catch {
      return defaultValue;
    }
  }

  private static setStorage(key: string, value: any): void {
    try {
      localStorage.setItem(`sc_${key}`, JSON.stringify(value));
    } catch {}
  }

  static async handle(endpoint: string, options: RequestInit = {}, _headers: Record<string, string> = {}): Promise<any> {
    const method = (options.method || 'GET').toUpperCase();
    const url = new URL(`http://dummy${endpoint}`);
    const pathname = url.pathname;
    const body = options.body ? JSON.parse(options.body as string) : {};

    // 1. Auth Login
    if (pathname === '/auth/login' && method === 'POST') {
      const { username, password } = body;
      const cleanUser = (username || '').trim().toLowerCase();

      if (cleanUser === 'admin' && password === 'admin123') {
        const user: MockUser = { id: 'mock-admin', username: 'admin', role: 'ADMIN', is_active: true };
        this.currentUser = user;
        this.setStorage('current_user', user);
        return { token: 'mock-token-admin', user };
      }

      if (cleanUser === 'agent' && password === 'agent123') {
        const user: MockUser = { id: 'mock-agent', username: 'agent', role: 'AGENT', is_active: true };
        this.currentUser = user;
        this.setStorage('current_user', user);
        return {
          token: 'mock-token-agent',
          user,
          dealerConfig: {
            sales_commission: 0.5,
            winning_commission_dc: 0,
            daily_sale_limit: 500000,
            allocated_games: ['DR1', 'KL', 'DR6', 'DR8']
          }
        };
      }

      if (cleanUser === 'test' && password === 'test') {
        const user: MockUser = { id: 'mock-subdealer', username: 'test', role: 'SUBDEALER', is_active: true };
        this.currentUser = user;
        this.setStorage('current_user', user);
        return {
          token: 'mock-token-subdealer',
          user,
          dealerConfig: {
            sales_commission: 1.0,
            winning_commission_dc: 50.0,
            daily_sale_limit: 50000,
            max_number_count: 100,
            blocked_numbers: [],
            allocated_games: ['DR1', 'KL', 'DR6', 'DR8'],
            custom_prices: {
              three_digit: { c: 10, d: 10 },
              two_digit: { c: 10, d: 10 },
              one_digit: { c: 12, d: 12 }
            }
          }
        };
      }

      // Check dynamically created sub-dealers
      const subDealers = this.getStorage<any[]>('subdealers', []);
      const matched = subDealers.find(s => s.username.toLowerCase() === cleanUser);
      if (matched && matched.passwordPlain === password && matched.is_active) {
        const user: MockUser = { id: matched.id, username: matched.username, role: 'SUBDEALER', is_active: true };
        this.currentUser = user;
        this.setStorage('current_user', user);
        return {
          token: `mock-token-${matched.id}`,
          user,
          dealerConfig: matched.dealerConfig || {}
        };
      }

      throw new Error('Invalid username or password');
    }

    // 2. Auth Logout
    if (pathname === '/auth/logout') {
      this.currentUser = null;
      localStorage.removeItem('sc_current_user');
      return { success: true };
    }

    // 3. Auth Me
    if (pathname === '/auth/me') {
      const user = this.currentUser || this.getStorage<MockUser | null>('current_user', null);
      if (!user) throw new Error('Unauthenticated');
      return { user };
    }

    // 4. Booking Submit
    if (pathname === '/booking/submit' && method === 'POST') {
      const bills = this.getStorage<any[]>('bills', []);
      const billId = `bill_${Date.now()}`;
      const billNumber = `BILL-${new Date().toISOString().slice(0, 10).replace(/-/g, '')}-${String(bills.length + 1).padStart(4, '0')}`;

      let totalAmount = 0;
      const items = (body.items || []).map((it: any) => {
        const unitPrice = it.lskCategory === 'One-Digit' ? 12 : 10;
        const subTotal = unitPrice * it.count;
        totalAmount += subTotal;
        return {
          ...it,
          unitCPrice: unitPrice,
          unitDPrice: unitPrice,
          totalCAmount: subTotal,
          totalDAmount: subTotal
        };
      });

      const newBill = {
        id: billId,
        billNumber,
        customerName: body.customerName || 'Walk-in',
        gameCode: body.gameCode,
        drawDate: new Date().toISOString().slice(0, 10),
        items,
        totalCAmount: totalAmount,
        totalDAmount: totalAmount,
        username_snapshot: this.currentUser?.username || 'test',
        createdAt: new Date().toISOString(),
        status: 'ACTIVE'
      };

      bills.unshift(newBill);
      this.setStorage('bills', bills);

      return {
        billId,
        billNumber,
        totalCAmount: totalAmount,
        message: 'Booking successfully placed'
      };
    }

    // 5. Booking Last Sale
    if (pathname.startsWith('/booking/last-sale/')) {
      const gameCode = pathname.split('/').pop() || '';
      const bills = this.getStorage<any[]>('bills', []);
      const records = bills.filter(b => b.gameCode === gameCode && b.status === 'ACTIVE').slice(0, 10);
      return { records };
    }

    // 6. Draws Overview / Schedule
    if (pathname === '/draws/overview') {
      const today = new Date().toISOString().slice(0, 10);
      const todayDraws = [
        { id: 'draw-dr1', game_code: 'DR1', draw_date: today, scheduled_close_time: '13:00', status: 'OPEN' },
        { id: 'draw-kl', game_code: 'KL', draw_date: today, scheduled_close_time: '15:00', status: 'OPEN' },
        { id: 'draw-dr6', game_code: 'DR6', draw_date: today, scheduled_close_time: '18:00', status: 'OPEN' },
        { id: 'draw-dr8', game_code: 'DR8', draw_date: today, scheduled_close_time: '20:00', status: 'OPEN' }
      ];
      return { today: todayDraws, tomorrow: [] };
    }

    // 7. Results
    if (pathname === '/draws/results') {
      const results = this.getStorage<any[]>('results', [
        {
          id: 'res-1',
          game_code: 'KL',
          draw_date: new Date().toISOString().slice(0, 10),
          first_prize: '782',
          second_prize: '345',
          third_prize: '912',
          fourth_prize: '118',
          fifth_prize: '556',
          complementary_numbers: ['42', '18', '77', '90', '33'],
          is_published: true
        }
      ]);
      return { date: new Date().toISOString().slice(0, 10), results };
    }

    // 8. Publish Results (Admin)
    if (pathname === '/draws/results/publish' && method === 'POST') {
      const results = this.getStorage<any[]>('results', []);
      const existingIdx = results.findIndex(r => r.game_code === body.gameCode);
      const newRes = {
        id: `res_${Date.now()}`,
        game_code: body.gameCode,
        draw_date: new Date().toISOString().slice(0, 10),
        first_prize: body.firstPrize,
        second_prize: body.secondPrize || '',
        third_prize: body.thirdPrize || '',
        fourth_prize: body.fourthPrize || '',
        fifth_prize: body.fifthPrize || '',
        complementary_numbers: body.complementaryNumbers || [],
        is_published: true
      };

      if (existingIdx >= 0) results[existingIdx] = newRes;
      else results.push(newRes);

      this.setStorage('results', results);
      return { message: 'Result published successfully', matchCount: 0 };
    }

    // 9. Reports
    if (pathname === '/reports/sales') {
      const bills = this.getStorage<any[]>('bills', []);
      const totalAmount = bills.reduce((acc, b) => acc + (b.totalCAmount || 0), 0);
      return {
        summary: [{ game_code: 'KL', ticket_count: bills.length, total_amount: totalAmount }],
        details: bills.map(b => ({
          bill_number: b.billNumber,
          customer_name: b.customerName,
          game_code: b.gameCode,
          booked_number: b.items?.[0]?.bookedNumber || '123',
          lsk_category: b.items?.[0]?.lskCategory || 'SUPER',
          count: b.items?.[0]?.count || 1,
          total_c_amount: b.totalCAmount,
          total_d_amount: b.totalDAmount,
          created_at: b.createdAt
        }))
      };
    }

    if (pathname === '/reports/winning') {
      return {
        summary: [],
        details: []
      };
    }

    if (pathname === '/reports/daily') {
      const bills = this.getStorage<any[]>('bills', []);
      const totalSale = bills.reduce((acc, b) => acc + (b.totalCAmount || 0), 0);
      return {
        summary: [{ date: new Date().toISOString().slice(0, 10), game_code: 'KL', total_sale: totalSale, total_winning: 0, balance: -totalSale }],
        details: []
      };
    }

    if (pathname === '/reports/commission') {
      const bills = this.getStorage<any[]>('bills', []);
      const totalSale = bills.reduce((acc, b) => acc + (b.totalCAmount || 0), 0);
      const commission = totalSale * 0.1;
      return {
        summary: [{ game_code: 'KL', total_sale: totalSale, sales_commission: commission, winning_commission: 0, total_commission: commission }],
        details: []
      };
    }

    // 10. Admin Dashboard
    if (pathname === '/admin/dashboard') {
      const bills = this.getStorage<any[]>('bills', []);
      const agents = this.getStorage<any[]>('agents', [{ id: 'ag-1', username: 'agent' }]);
      const subDealers = this.getStorage<any[]>('subdealers', [{ id: 'sub-1', username: 'test' }]);
      const totalSale = bills.reduce((acc, b) => acc + (b.totalCAmount || 0), 0);

      return {
        totalAgents: agents.length,
        totalSubDealers: subDealers.length,
        todaySale: totalSale,
        todayWinning: 0
      };
    }

    // 11. Admin Agents
    if (pathname === '/admin/agents') {
      if (method === 'GET') {
        const agents = this.getStorage<any[]>('agents', [
          { id: 'ag-1', username: 'agent', role: 'AGENT', is_active: true, sales_commission: 0.5, created_at: new Date().toISOString() }
        ]);
        return { agents };
      }
      if (method === 'POST') {
        const agents = this.getStorage<any[]>('agents', []);
        const newAgent = {
          id: `ag_${Date.now()}`,
          username: body.username,
          role: 'AGENT',
          is_active: true,
          sales_commission: body.salesCommission || 0.5,
          created_at: new Date().toISOString()
        };
        agents.push(newAgent);
        this.setStorage('agents', agents);
        return newAgent;
      }
    }

    // 12. Sub-dealers
    if (pathname === '/users/subdealers') {
      if (method === 'GET') {
        const subDealers = this.getStorage<any[]>('subdealers', [
          {
            id: 'mock-subdealer',
            username: 'test',
            role: 'SUBDEALER',
            is_active: true,
            sales_commission: 1.0,
            winning_commission_dc: 50.0,
            daily_sale_limit: 50000,
            max_number_count: 100,
            blocked_numbers: [],
            allocated_games: ['DR1', 'KL', 'DR6', 'DR8'],
            custom_prices: {
              three_digit: { c: 10, d: 10 },
              two_digit: { c: 10, d: 10 },
              one_digit: { c: 12, d: 12 }
            },
            permissions: { can_book: true, can_view_reports: true, can_view_last_sale: true },
            created_at: new Date().toISOString()
          }
        ]);
        return { subDealers };
      }
      if (method === 'POST') {
        const subDealers = this.getStorage<any[]>('subdealers', []);
        const newSub = {
          id: `sub_${Date.now()}`,
          username: body.username,
          passwordPlain: body.passwordPlain,
          role: 'SUBDEALER',
          is_active: true,
          sales_commission: body.salesCommission || 1.0,
          winning_commission_dc: body.dc || 50.0,
          daily_sale_limit: body.saleLimit || 50000,
          max_number_count: body.maxNumberCount || 100,
          blocked_numbers: body.blockedNumbers || [],
          allocated_games: body.allocatedGames || ['DR1', 'KL', 'DR6', 'DR8'],
          custom_prices: body.customPrices || {
            three_digit: { c: 10, d: 10 },
            two_digit: { c: 10, d: 10 },
            one_digit: { c: 12, d: 12 }
          },
          permissions: body.permissions || { can_book: true, can_view_reports: true, can_view_last_sale: true },
          created_at: new Date().toISOString()
        };
        subDealers.push(newSub);
        this.setStorage('subdealers', subDealers);
        return newSub;
      }
    }

    if (pathname === '/admin/prizes') {
      if (method === 'GET') {
        return this.getStorage('prize_config', {
          super_prize: 5000,
          box_prize: 3000,
          one_digit_prize: 100,
          two_digit_prize: 700,
          complementary_prize: 20
        });
      }
      if (method === 'PUT') {
        this.setStorage('prize_config', body);
        return { message: 'Prize configuration updated' };
      }
    }

    return { success: true };
  }
}

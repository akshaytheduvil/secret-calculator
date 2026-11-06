const API_BASE = (import.meta as any).env?.VITE_API_URL || '/api';

export class ApiClient {
  private static token: string | null = null;

  static setToken(t: string | null) {
    this.token = t;
  }

  static getToken(): string | null {
    return this.token;
  }

  static clearToken() {
    this.token = null;
  }

  static async request<T = any>(endpoint: string, options: RequestInit = {}): Promise<T> {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      ...(options.headers as Record<string, string> || {})
    };

    if (this.token) {
      headers['Authorization'] = `Bearer ${this.token}`;
    }

    const response = await fetch(`${API_BASE}${endpoint}`, {
      ...options,
      headers
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error || 'Request failed');
    }

    return data as T;
  }

  // Auth
  static login(credentials: { username: string; password: stringPlain }) {
    return this.request<{ token: string; user: any; dealerConfig?: any }>('/auth/login', {
      method: 'POST',
      body: JSON.stringify(credentials)
    });
  }

  static logout() {
    return this.request('/auth/logout', { method: 'POST' });
  }

  static me() {
    return this.request<{ user: any; dealerConfig?: any }>('/auth/me');
  }

  // Booking
  static submitBooking(payload: any) {
    return this.request('/booking/submit', {
      method: 'POST',
      body: JSON.stringify(payload)
    });
  }

  static cancelBill(billId: string) {
    return this.request(`/booking/cancel/${billId}`, { method: 'POST' });
  }

  static getLastSale(gameCode: string) {
    return this.request<{ records: any[] }>(`/booking/last-sale/${gameCode}`);
  }

  // Draws & Results
  static getDrawOverview() {
    return this.request<{ today: any[]; tomorrow: any[] }>('/draws/overview');
  }

  static getResults(date?: string, gameCode?: string) {
    const q = new URLSearchParams();
    if (date) q.append('date', date);
    if (gameCode) q.append('gameCode', gameCode);
    return this.request<{ date: string; results: any[] }>(`/draws/results?${q.toString()}`);
  }

  static publishResult(payload: any) {
    return this.request('/draws/results/publish', {
      method: 'POST',
      body: JSON.stringify(payload)
    });
  }

  static setManualDrawStatus(drawId: string, status: 'OPEN' | 'CLOSED') {
    return this.request('/draws/manual-status', {
      method: 'POST',
      body: JSON.stringify({ drawId, status })
    });
  }

  static updateDrawTiming(drawId: string, closeTime: string) {
    return this.request('/draws/update-timing', {
      method: 'POST',
      body: JSON.stringify({ drawId, closeTime })
    });
  }

  // Reports
  static getSalesReport(params: Record<string, any>) {
    const q = new URLSearchParams();
    Object.keys(params).forEach(k => {
      if (params[k] !== undefined && params[k] !== null) q.append(k, String(params[k]));
    });
    return this.request(`/reports/sales?${q.toString()}`);
  }

  static getWinningReport(params: Record<string, any>) {
    const q = new URLSearchParams();
    Object.keys(params).forEach(k => {
      if (params[k] !== undefined && params[k] !== null) q.append(k, String(params[k]));
    });
    return this.request(`/reports/winning?${q.toString()}`);
  }

  static getDailyReport(params: Record<string, any>) {
    const q = new URLSearchParams();
    Object.keys(params).forEach(k => {
      if (params[k] !== undefined && params[k] !== null) q.append(k, String(params[k]));
    });
    return this.request(`/reports/daily?${q.toString()}`);
  }

  static getCommissionReport(params: Record<string, any>) {
    const q = new URLSearchParams();
    Object.keys(params).forEach(k => {
      if (params[k] !== undefined && params[k] !== null) q.append(k, String(params[k]));
    });
    return this.request(`/reports/commission?${q.toString()}`);
  }

  // Sub-dealers
  static createSubDealer(data: any) {
    return this.request('/users/subdealers', {
      method: 'POST',
      body: JSON.stringify(data)
    });
  }

  static updateSubDealer(id: string, data: any) {
    return this.request(`/users/subdealers/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data)
    });
  }

  static deleteSubDealer(id: string) {
    return this.request(`/users/subdealers/${id}`, { method: 'DELETE' });
  }

  static listSubDealers() {
    return this.request<{ subDealers: any[] }>('/users/subdealers');
  }

  // Admin
  static getAdminDashboard() {
    return this.request<{
      totalAgents: number;
      totalSubDealers: number;
      todaySale: number;
      todayWinning: number;
    }>('/admin/dashboard');
  }

  static createAgent(data: any) {
    return this.request('/admin/agents', {
      method: 'POST',
      body: JSON.stringify(data)
    });
  }

  static listAgents() {
    return this.request<{ agents: any[] }>('/admin/agents');
  }

  static updateAgent(id: string, data: any) {
    return this.request(`/admin/agents/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data)
    });
  }

  static resetAgentPassword(id: string, newPassword: stringPlain) {
    return this.request(`/admin/agents/${id}/reset-password`, {
      method: 'POST',
      body: JSON.stringify({ newPassword })
    });
  }

  static deleteUser(id: string) {
    return this.request(`/admin/users/${id}`, { method: 'DELETE' });
  }

  static getPrizeConfig() {
    return this.request('/admin/prizes');
  }

  static updatePrizeConfig(data: any) {
    return this.request('/admin/prizes', {
      method: 'PUT',
      body: JSON.stringify(data)
    });
  }
}

type stringPlain = string;

const DEFAULT_CLOUD_API = 'https://associates-reputation-monsters-supported.trycloudflare.com/api';

let customApiBase: string | null = null;

const getApiBase = (): string => {
  if (customApiBase) return customApiBase;

  // 1. Environment variable configured at build or deployment time
  const envUrl = (import.meta as any).env?.VITE_API_URL;
  if (envUrl && envUrl.trim()) return envUrl.trim().replace(/\/+$/, '');

  // 2. If running on a hosted domain in the browser or WebView, automatically use its origin
  if (typeof window !== 'undefined' && window.location) {
    if (window.location.protocol.startsWith('http') && window.location.host && !window.location.host.includes('localhost')) {
      return `${window.location.origin}/api`;
    }

    // 3. Native mobile Capacitor environment (origin is localhost)
    const isCapacitor =
      window.location.protocol === 'capacitor:' ||
      (window.location.hostname === 'localhost' && window.location.protocol === 'https:');
    if (isCapacitor) {
      return DEFAULT_CLOUD_API;
    }
  }

  // 4. Default relative endpoint
  return '/api';
};

export class ApiClient {
  private static token: string | null = null;

  static setBaseUrl(url: string | null) {
    customApiBase = url ? url.trim().replace(/\/+$/, '') : null;
  }

  static getBaseUrl(): string {
    return getApiBase();
  }

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

    const apiBase = getApiBase();

    try {
      const response = await fetch(`${apiBase}${endpoint}`, {
        ...options,
        headers
      });

      const contentType = response.headers.get('content-type') || '';
      if (response.ok && contentType.includes('application/json')) {
        return await response.json();
      }

      if (!response.ok && contentType.includes('application/json')) {
        const data = await response.json();
        throw new Error(data.error || 'Request failed');
      }

      if (contentType.includes('text/html')) {
        throw new Error('Unable to connect to the central service. Please try again.');
      }

      if (!response.ok) {
        throw new Error(`Central backend returned error (HTTP ${response.status})`);
      }

      throw new Error('Unexpected response from central backend server');
    } catch (err: any) {
      if (err.message && (err.message.includes('fetch') || err.message.includes('NetworkError') || err.name === 'TypeError' || err.message.includes('Failed to fetch'))) {
        throw new Error('Unable to connect to the central service. Please check your connection and try again.');
      }
      throw err;
    }
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

  static getTodayReport(gameCode: string, drawDate?: string) {
    const q = new URLSearchParams();
    q.append('gameCode', gameCode);
    if (drawDate) q.append('drawDate', drawDate);
    return this.request<{ date: string; gameCode: string; records: { booked_number: string; total_count: number }[] }>(`/reports/today?${q.toString()}`);
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

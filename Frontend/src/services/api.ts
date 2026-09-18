import {
  Transaction,
  GraphData,
  SecurityAlert,
  SystemStats,
  TransactionAnalysisRequest,
  TransactionAnalysisResponse,
  DecisionType
} from '../types';
import {
  INITIAL_TRANSACTIONS,
  INITIAL_GRAPH,
  INITIAL_ALERTS,
  INITIAL_STATS
} from './mockData';

// Support both Vite standard VITE_API_URL and NEXT_PUBLIC_API_URL specified in prompt
const API_BASE_URL =
  (import.meta as unknown as { env?: Record<string, string> }).env?.NEXT_PUBLIC_API_URL ||
  (import.meta as unknown as { env?: Record<string, string> }).env?.VITE_API_URL ||
  'http://127.0.0.1:5000';

class FraudinateApiService {
  private baseUrl: string = API_BASE_URL;
  private backendAvailable: boolean = false;
  private hasCheckedHealth: boolean = false;

  // In-memory simulation state when standalone
  private transactions: Transaction[] = [...INITIAL_TRANSACTIONS];
  private graphData: GraphData = JSON.parse(JSON.stringify(INITIAL_GRAPH));
  private alerts: SecurityAlert[] = [...INITIAL_ALERTS];
  private stats: SystemStats = { ...INITIAL_STATS };

  constructor() {
    this.checkHealth().catch(() => {
      this.backendAvailable = false;
    });
  }

  public getBaseUrl(): string {
    return this.baseUrl;
  }

  public isUsingBackend(): boolean {
    return this.backendAvailable;
  }

  /**
   * Health Check: GET /api/health
   */
  public async checkHealth(): Promise<{ status: string; backend: boolean; latency_ms?: number }> {
    const startTime = performance.now();
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 1800);

      const response = await fetch(`${this.baseUrl}/api/health`, {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' },
        signal: controller.signal
      });
      clearTimeout(timeoutId);

      if (response.ok) {
        this.backendAvailable = true;
        this.hasCheckedHealth = true;
        const data = await response.json();
        return {
          status: data.status || 'ok',
          backend: true,
          latency_ms: Math.round(performance.now() - startTime)
        };
      }
      throw new Error(`HTTP ${response.status}`);
    } catch {
      this.backendAvailable = false;
      this.hasCheckedHealth = true;
      return {
        status: 'simulated',
        backend: false,
        latency_ms: 12
      };
    }
  }

  /**
   * Fetch Transactions: GET /api/transactions
   */
  public async getTransactions(params?: {
    limit?: number;
    decision?: DecisionType;
    search?: string;
  }): Promise<Transaction[]> {
    if (this.backendAvailable) {
      try {
        const query = new URLSearchParams();
        if (params?.limit) query.append('limit', String(params.limit));
        if (params?.decision) query.append('decision', params.decision);
        if (params?.search) query.append('search', params.search);

        const res = await fetch(`${this.baseUrl}/api/transactions?${query.toString()}`);
        if (res.ok) {
          return await res.json();
        }
      } catch (err) {
        console.warn('Backend /api/transactions failed, falling back to local simulation:', err);
      }
    }

    // Local simulation fallback
    let list = [...this.transactions];
    if (params?.decision) {
      list = list.filter((t) => t.decision === params.decision);
    }
    if (params?.search) {
      const q = params.search.toLowerCase();
      list = list.filter(
        (t) =>
          t.id.toString().includes(q) ||
          t.sender_account.toLowerCase().includes(q) ||
          t.receiver_account.toLowerCase().includes(q) ||
          t.sender_bank.toLowerCase().includes(q) ||
          t.receiver_bank.toLowerCase().includes(q)
      );
    }
    if (params?.limit) {
      list = list.slice(0, params.limit);
    }
    return list;
  }

  /**
   * Fetch Single Transaction: GET /api/transactions/:id
   */
  public async getTransactionById(id: number): Promise<Transaction | null> {
    if (this.backendAvailable) {
      try {
        const res = await fetch(`${this.baseUrl}/api/transactions/${id}`);
        if (res.ok) return await res.json();
      } catch {
        // fallback
      }
    }
    return this.transactions.find((t) => t.id === id) || null;
  }

  /**
   * Analyze Transaction in real-time: POST /api/transactions/analyze
   */
  public async analyzeTransaction(
    payload: TransactionAnalysisRequest
  ): Promise<TransactionAnalysisResponse> {
    if (this.backendAvailable) {
      try {
        const res = await fetch(`${this.baseUrl}/api/transactions/analyze`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });
        if (res.ok) return await res.json();
      } catch (err) {
        console.warn('Backend analyze call failed, using rule engine:', err);
      }
    }

    // High-fidelity heuristic risk score engine
    const signals: string[] = [];
    let score = 5;

    if (payload.amount > 25000) {
      score += 35;
      signals.push('HIGH TRANSACTION VALUE');
    } else if (payload.amount > 10000) {
      score += 20;
      signals.push('ELEVATED VALUE');
    }

    const velocity = payload.velocity || Math.random() * 8;
    if (velocity > 6.0) {
      score += 25;
      signals.push('HIGH VELOCITY');
    }

    const accountAge = payload.account_age !== undefined ? payload.account_age : 14;
    if (accountAge < 30) {
      score += 15;
      signals.push('NEW ACCOUNT');
    }

    const recipients = payload.recipients || 1;
    if (recipients >= 4) {
      score += 20;
      signals.push('MANY RECIPIENTS');
      signals.push('HIGH NETWORK FAN-OUT');
    }

    if (payload.sender_bank !== payload.receiver_bank) {
      score += 10;
      signals.push('MULTI-BANK CONNECTION');
    }

    // Mule account detection
    if (payload.receiver_account.toLowerCase().includes('mule') || recipients >= 5) {
      score += 20;
      signals.push('HIGH NETWORK RISK');
      signals.push('RAPID FUND MOVEMENT');
    }

    score = Math.min(Math.max(score, 2), 99);

    let decision: DecisionType = 'ALLOW';
    if (score >= 80) decision = 'BLOCK';
    else if (score >= 60) decision = 'HOLD';

    return {
      risk_score: score,
      decision,
      signals: signals.length ? signals : ['NORMAL BEHAVIORAL PROFILE'],
      network_mule_probability: score > 75 ? 0.92 : 0.08,
      explanation:
        decision === 'BLOCK'
          ? `Coordinated mule network indicators detected: ${signals.slice(0, 3).join(', ')}.`
          : decision === 'HOLD'
          ? `Elevated risk threshold reached: flagged for verification.`
          : 'Low behavioral anomaly score. Transaction cleared firewall.',
      latency_ms: 8
    };
  }

  /**
   * Fetch Graph Data: GET /api/graph
   */
  public async getGraph(filterBank?: string, minRisk?: number): Promise<GraphData> {
    if (this.backendAvailable) {
      try {
        const query = new URLSearchParams();
        if (filterBank) query.append('bank', filterBank);
        if (minRisk) query.append('min_risk', String(minRisk));
        const res = await fetch(`${this.baseUrl}/api/graph?${query.toString()}`);
        if (res.ok) return await res.json();
      } catch {
        // fallback
      }
    }

    let filteredNodes = [...this.graphData.nodes];
    if (filterBank && filterBank !== 'ALL') {
      filteredNodes = filteredNodes.filter((n) => n.bank === filterBank);
    }
    if (minRisk !== undefined) {
      filteredNodes = filteredNodes.filter((n) => n.risk_score >= minRisk);
    }

    const validNodeIds = new Set(filteredNodes.map((n) => n.id));
    const filteredEdges = this.graphData.edges.filter(
      (e) => validNodeIds.has(e.source) && validNodeIds.has(e.target)
    );

    return {
      nodes: filteredNodes,
      edges: filteredEdges
    };
  }

  /**
   * Fetch Alerts: GET /api/alerts
   */
  public async getAlerts(): Promise<SecurityAlert[]> {
    if (this.backendAvailable) {
      try {
        const res = await fetch(`${this.baseUrl}/api/alerts`);
        if (res.ok) return await res.json();
      } catch {
        // fallback
      }
    }
    return [...this.alerts];
  }

  /**
   * Fetch System Stats: GET /api/stats
   */
  public async getStats(): Promise<SystemStats> {
    if (this.backendAvailable) {
      try {
        const res = await fetch(`${this.baseUrl}/api/stats`);
        if (res.ok) return await res.json();
      } catch {
        // fallback
      }
    }
    return { ...this.stats };
  }

  /**
   * Inject a new simulated transaction into live stream (for hackathon demo)
   */
  public injectSimulatedTransaction(custom?: Partial<Transaction>): Transaction {
    const isSuspicious = custom?.risk_score ? custom.risk_score > 70 : Math.random() > 0.65;
    const banks = ['JPMorgan Chase', 'Wells Fargo', 'Citibank', 'Barclays', 'Revolut Neo', 'HSBC Global'];
    const sBank = custom?.sender_bank || banks[Math.floor(Math.random() * banks.length)];
    let rBank = custom?.receiver_bank || banks[Math.floor(Math.random() * banks.length)];
    if (rBank === sBank && banks.length > 1) {
      rBank = banks.find((b) => b !== sBank) || 'Wells Fargo';
    }

    const amount = custom?.amount || (isSuspicious ? Math.floor(25000 + Math.random() * 45000) : Math.floor(400 + Math.random() * 4500));
    const velocity = custom?.velocity || (isSuspicious ? Number((5.5 + Math.random() * 4).toFixed(1)) : Number((0.5 + Math.random() * 2).toFixed(1)));
    const accountAge = custom?.account_age ?? (isSuspicious ? Math.floor(5 + Math.random() * 20) : Math.floor(200 + Math.random() * 800));
    const recipients = custom?.recipients ?? (isSuspicious ? Math.floor(4 + Math.random() * 5) : 1);

    let risk_score = custom?.risk_score ?? (isSuspicious ? Math.floor(78 + Math.random() * 20) : Math.floor(4 + Math.random() * 30));
    let decision: DecisionType = custom?.decision || (risk_score >= 80 ? 'BLOCK' : risk_score >= 60 ? 'HOLD' : 'ALLOW');

    let signals = custom?.signals;
    if (!signals) {
      if (decision === 'BLOCK') {
        signals = ['HIGH TRANSACTION VALUE', 'HIGH VELOCITY', 'NEW ACCOUNT', 'HIGH NETWORK RISK', 'RAPID FUND MOVEMENT'];
      } else if (decision === 'HOLD') {
        signals = ['ELEVATED VELOCITY', 'MULTI-BANK CONNECTION', 'SUSPICIOUS CONNECTION CLUSTER'];
      } else {
        signals = ['NORMAL BEHAVIORAL PROFILE', 'VERIFIED COUNTERPARTY'];
      }
    }

    const newTx: Transaction = {
      id: custom?.id || Math.floor(10500 + Math.random() * 9000),
      sender_bank: sBank,
      sender_account: custom?.sender_account || `US-${sBank.slice(0, 4).toUpperCase()}-${Math.floor(10000 + Math.random() * 89999)}`,
      receiver_bank: rBank,
      receiver_account: custom?.receiver_account || (isSuspicious ? 'US-WF-44219 (Mule Node)' : `US-${rBank.slice(0, 4).toUpperCase()}-${Math.floor(10000 + Math.random() * 89999)}`),
      amount,
      velocity,
      account_age: accountAge,
      recipients,
      risk_score,
      decision,
      signals,
      created_at: new Date().toISOString()
    };

    this.transactions.unshift(newTx);
    if (this.transactions.length > 50) this.transactions.pop();

    // Update stats
    this.stats.transactions_processed += 1;
    if (decision === 'BLOCK') {
      this.stats.transactions_blocked += 1;
      this.stats.blocked_volume_usd += amount;
    }
    if (risk_score > 70) {
      this.stats.high_risk_transactions += 1;
    }

    return newTx;
  }

  /**
   * Reset simulation state
   */
  public resetToBaseline() {
    this.transactions = [...INITIAL_TRANSACTIONS];
    this.graphData = JSON.parse(JSON.stringify(INITIAL_GRAPH));
    this.alerts = [...INITIAL_ALERTS];
    this.stats = { ...INITIAL_STATS };
  }
}

export const api = new FraudinateApiService();

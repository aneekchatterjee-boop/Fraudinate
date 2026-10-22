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
  public async injectSimulatedTransaction(
  custom?: Partial<Transaction>
): Promise<Transaction> {
  const response = await fetch(`${this.baseUrl}/api/transactions/simulate`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(custom ?? {}),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(
      `Simulation failed (${response.status}): ${errorText}`
    );
  }

  const data = await response.json();
  const newTx: Transaction = data.transaction;

  // Keep the local state synchronized immediately.
  this.transactions.unshift(newTx);

  if (this.transactions.length > 50) {
    this.transactions.pop();
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

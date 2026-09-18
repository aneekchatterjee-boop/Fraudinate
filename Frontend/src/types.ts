export type DecisionType = 'ALLOW' | 'HOLD' | 'BLOCK';

export interface Transaction {
  id: number;
  sender_bank: string;
  sender_account: string;
  receiver_bank: string;
  receiver_account: string;
  amount: number;
  velocity: number;
  account_age: number;
  recipients: number;
  risk_score: number;
  decision: DecisionType;
  signals: string[];
  created_at: string;
}

export type NodeType = 'account' | 'bank';

export interface GraphNode {
  id: string;
  label: string;
  bank: string;
  risk_score: number;
  type: NodeType;
  // Visual & Network layout properties
  x?: number;
  y?: number;
  vx?: number;
  vy?: number;
  incoming_count?: number;
  outgoing_count?: number;
  connected_accounts?: string[];
  signals?: string[];
  is_mule?: boolean;
  status?: 'active' | 'flagged' | 'frozen';
  total_volume?: number;
}

export interface GraphEdge {
  id: string;
  source: string;
  target: string;
  amount: number;
  risk_score: number;
  decision?: DecisionType;
  timestamp?: string;
  is_mule_route?: boolean;
}

export interface GraphData {
  nodes: GraphNode[];
  edges: GraphEdge[];
}

export type AlertSeverity = 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW';
export type AlertStatus = 'ACTIVE' | 'INVESTIGATING' | 'RESOLVED';

export interface SecurityAlert {
  id: string;
  severity: AlertSeverity;
  alert_type: string;
  title: string;
  description: string;
  accounts_count: number;
  banks_count: number;
  amount_involved: number;
  risk_score: number;
  timestamp: string;
  status: AlertStatus;
  signals: string[];
  primary_account_id?: string;
  transaction_id?: number;
  affected_nodes?: string[];
}

export interface SystemStats {
  transactions_processed: number;
  transactions_blocked: number;
  high_risk_transactions: number;
  suspicious_networks: number;
  system_status: 'ONLINE' | 'DEGRADED' | 'OFFLINE';
  firewall_latency_ms: number;
  mule_detection_rate: number;
  blocked_volume_usd: number;
}

export interface TransactionAnalysisRequest {
  sender_bank: string;
  sender_account: string;
  receiver_bank: string;
  receiver_account: string;
  amount: number;
  velocity?: number;
  account_age?: number;
  recipients?: number;
}

export interface TransactionAnalysisResponse {
  risk_score: number;
  decision: DecisionType;
  signals: string[];
  network_mule_probability: number;
  explanation: string;
  latency_ms: number;
}

export type ActiveView = 'landing' | 'overview' | 'transactions' | 'network' | 'alerts';

export interface DemoStep {
  step: number;
  title: string;
  description: string;
  actionHint: string;
  targetView: ActiveView;
  highlightId?: string;
  narration: string;
}

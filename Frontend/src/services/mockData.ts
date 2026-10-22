import { Transaction, GraphData, SecurityAlert, SystemStats } from '../types';

export const INITIAL_TRANSACTIONS: Transaction[] = [
  {
    id: 10492,
    sender_bank: 'JPMorgan Chase',
    sender_account: 'US-CHASE-88912',
    receiver_bank: 'Wells Fargo',
    receiver_account: 'US-WF-44219 (Mule Node)',
    amount: 48500,
    velocity: 8.4,
    account_age: 14,
    recipients: 7,
    risk_score: 94,
    decision: 'BLOCK',
    signals: [
      'HIGH TRANSACTION VALUE',
      'HIGH VELOCITY',
      'NEW ACCOUNT',
      'MANY RECIPIENTS',
      'HIGH NETWORK RISK',
      'RAPID FUND MOVEMENT',
      'MULTI-BANK CONNECTION'
    ],
    created_at: new Date(Date.now() - 1000 * 35).toISOString()
  },
  {
    id: 10491,
    sender_bank: 'Wells Fargo',
    sender_account: 'US-WF-44219 (Mule Node)',
    receiver_bank: 'Citibank',
    receiver_account: 'US-CITI-31084',
    amount: 24200,
    velocity: 7.2,
    account_age: 19,
    recipients: 5,
    risk_score: 88,
    decision: 'BLOCK',
    signals: [
      'HIGH VELOCITY',
      'RAPID FUND MOVEMENT',
      'HIGH NETWORK FAN-OUT',
      'SUSPICIOUS CONNECTION CLUSTER'
    ],
    created_at: new Date(Date.now() - 1000 * 95).toISOString()
  },
  {
    id: 10490,
    sender_bank: 'Wells Fargo',
    sender_account: 'US-WF-44219 (Mule Node)',
    receiver_bank: 'Revolut Neo',
    receiver_account: 'UK-REV-88321',
    amount: 19800,
    velocity: 6.9,
    account_age: 22,
    recipients: 4,
    risk_score: 82,
    decision: 'HOLD',
    signals: [
      'RAPID FUND MOVEMENT',
      'CROSS-BORDER HOPPING',
      'HIGH NETWORK RISK'
    ],
    created_at: new Date(Date.now() - 1000 * 160).toISOString()
  },
  {
    id: 10489,
    sender_bank: 'Bank of America',
    sender_account: 'US-BOA-99201',
    receiver_bank: 'JPMorgan Chase',
    receiver_account: 'US-CHASE-11409',
    amount: 3200,
    velocity: 1.1,
    account_age: 840,
    recipients: 1,
    risk_score: 14,
    decision: 'ALLOW',
    signals: ['NORMAL BEHAVIORAL PROFILE'],
    created_at: new Date(Date.now() - 1000 * 240).toISOString()
  },
  {
    id: 10488,
    sender_bank: 'Barclays Private',
    sender_account: 'UK-BARC-77312',
    receiver_bank: 'HSBC Global',
    receiver_account: 'UK-HSBC-45091',
    amount: 14500,
    velocity: 4.8,
    account_age: 45,
    recipients: 3,
    risk_score: 68,
    decision: 'HOLD',
    signals: [
      'HIGH TRANSACTION VALUE',
      'UNUSUAL VELOCITY',
      'MULTI-BANK CONNECTION'
    ],
    created_at: new Date(Date.now() - 1000 * 320).toISOString()
  },
  {
    id: 10487,
    sender_bank: 'Citibank',
    sender_account: 'US-CITI-12093',
    receiver_bank: 'Bank of America',
    receiver_account: 'US-BOA-77401',
    amount: 1250,
    velocity: 0.9,
    account_age: 1200,
    recipients: 1,
    risk_score: 6,
    decision: 'ALLOW',
    signals: ['VERIFIED REPUTATION', 'CONSISTENT COUNTERPARTY'],
    created_at: new Date(Date.now() - 1000 * 420).toISOString()
  },
  {
    id: 10486,
    sender_bank: 'JPMorgan Chase',
    sender_account: 'US-CHASE-55102',
    receiver_bank: 'Wells Fargo',
    receiver_account: 'US-WF-99403',
    amount: 780,
    velocity: 0.5,
    account_age: 950,
    recipients: 1,
    risk_score: 4,
    decision: 'ALLOW',
    signals: ['DOMESTIC RETAIL PROFILE'],
    created_at: new Date(Date.now() - 1000 * 510).toISOString()
  },
  {
    id: 10485,
    sender_bank: 'Standard Chartered',
    sender_account: 'SG-SCB-66201',
    receiver_bank: 'Wells Fargo',
    receiver_account: 'US-WF-44219 (Mule Node)',
    amount: 35000,
    velocity: 8.9,
    account_age: 8,
    recipients: 6,
    risk_score: 96,
    decision: 'BLOCK',
    signals: [
      'HIGH TRANSACTION VALUE',
      'NEW ACCOUNT',
      'HIGH VELOCITY',
      'HIGH NETWORK RISK',
      'SUSPICIOUS CONNECTION CLUSTER'
    ],
    created_at: new Date(Date.now() - 1000 * 620).toISOString()
  }
];

export const INITIAL_GRAPH: GraphData = {
  nodes: [
    // Institutions
    { id: 'bank-chase', label: 'JPMorgan Chase', bank: 'JPMorgan Chase', risk_score: 22, type: 'bank', x: 260, y: 120 },
    { id: 'bank-wf', label: 'Wells Fargo', bank: 'Wells Fargo', risk_score: 48, type: 'bank', x: 540, y: 120 },
    { id: 'bank-citi', label: 'Citibank', bank: 'Citibank', risk_score: 35, type: 'bank', x: 820, y: 120 },
    { id: 'bank-barclays', label: 'Barclays', bank: 'Barclays', risk_score: 30, type: 'bank', x: 180, y: 460 },
    { id: 'bank-revolut', label: 'Revolut Neo', bank: 'Revolut Neo', risk_score: 55, type: 'bank', x: 860, y: 460 },

    // Primary Origin Account
    {
      id: 'acc-origin-1',
      label: 'US-CHASE-88912',
      bank: 'JPMorgan Chase',
      risk_score: 89,
      type: 'account',
      x: 290,
      y: 250,
      incoming_count: 2,
      outgoing_count: 5,
      signals: ['HIGH VELOCITY', 'NEW ACCOUNT', 'RAPID FUND HOPPING'],
      is_mule: true,
      status: 'flagged',
      total_volume: 84000
    },

    // Central Mule Transit Node
    {
      id: 'acc-mule-central',
      label: 'US-WF-44219 (Mule)',
      bank: 'Wells Fargo',
      risk_score: 96,
      type: 'account',
      x: 540,
      y: 280,
      incoming_count: 4,
      outgoing_count: 6,
      signals: [
        'HIGH NETWORK FAN-OUT',
        'RAPID FUND MOVEMENT',
        'MULTI-BANK CONNECTION',
        'SUSPICIOUS CONNECTION CLUSTER'
      ],
      is_mule: true,
      status: 'frozen',
      total_volume: 148500
    },

    // Destination Mule Leaf 1
    {
      id: 'acc-mule-leaf1',
      label: 'US-CITI-31084',
      bank: 'Citibank',
      risk_score: 86,
      type: 'account',
      x: 740,
      y: 270,
      incoming_count: 3,
      outgoing_count: 1,
      signals: ['HIGH NETWORK RISK', 'RAPID FUND DISPERSAL'],
      is_mule: true,
      status: 'flagged',
      total_volume: 38200
    },

    // Destination Mule Leaf 2
    {
      id: 'acc-mule-leaf2',
      label: 'UK-REV-88321',
      bank: 'Revolut Neo',
      risk_score: 84,
      type: 'account',
      x: 720,
      y: 390,
      incoming_count: 2,
      outgoing_count: 2,
      signals: ['CROSS-BORDER HOPPING', 'NEW DIGITAL WALLET'],
      is_mule: true,
      status: 'flagged',
      total_volume: 24500
    },

    // Destination Mule Leaf 3
    {
      id: 'acc-mule-leaf3',
      label: 'US-WF-59210',
      bank: 'Wells Fargo',
      risk_score: 81,
      type: 'account',
      x: 480,
      y: 430,
      incoming_count: 2,
      outgoing_count: 1,
      signals: ['RAPID CASH EXTRACTION ATTEMPT'],
      is_mule: true,
      status: 'flagged',
      total_volume: 18900
    },

    // Legitimate account nodes for contrast
    {
      id: 'acc-legit-1',
      label: 'US-CHASE-11409',
      bank: 'JPMorgan Chase',
      risk_score: 11,
      type: 'account',
      x: 160,
      y: 280,
      incoming_count: 12,
      outgoing_count: 14,
      signals: ['NORMAL BEHAVIORAL PROFILE'],
      is_mule: false,
      status: 'active',
      total_volume: 12400
    },
    {
      id: 'acc-legit-2',
      label: 'UK-BARC-77312',
      bank: 'Barclays',
      risk_score: 18,
      type: 'account',
      x: 340,
      y: 450,
      incoming_count: 8,
      outgoing_count: 5,
      signals: ['CORPORATE PAYROLL HUB'],
      is_mule: false,
      status: 'active',
      total_volume: 45000
    }
  ],
  edges: [
    // Bank to Origin account
    { id: 'e1', source: 'bank-chase', target: 'acc-origin-1', amount: 84000, risk_score: 45, decision: 'ALLOW' },
    // Primary Origin -> Central Mule (Coordinated Inflow)
    { id: 'e2', source: 'acc-origin-1', target: 'acc-mule-central', amount: 48500, risk_score: 94, decision: 'BLOCK', is_mule_route: true },
    // Central Mule -> Leaf 1 (Fan out)
    { id: 'e3', source: 'acc-mule-central', target: 'acc-mule-leaf1', amount: 24200, risk_score: 88, decision: 'BLOCK', is_mule_route: true },
    // Central Mule -> Leaf 2 (Cross-border fan out)
    { id: 'e4', source: 'acc-mule-central', target: 'acc-mule-leaf2', amount: 19800, risk_score: 82, decision: 'HOLD', is_mule_route: true },
    // Central Mule -> Leaf 3
    { id: 'e5', source: 'acc-mule-central', target: 'acc-mule-leaf3', amount: 18900, risk_score: 81, decision: 'HOLD', is_mule_route: true },
    // Leaf to Bank destinations
    { id: 'e6', source: 'acc-mule-leaf1', target: 'bank-citi', amount: 24200, risk_score: 65, decision: 'BLOCK' },
    { id: 'e7', source: 'acc-mule-leaf2', target: 'bank-revolut', amount: 19800, risk_score: 72, decision: 'HOLD' },
    // Bank to central mule (additional inflow)
    { id: 'e8', source: 'bank-wf', target: 'acc-mule-central', amount: 35000, risk_score: 75, decision: 'BLOCK' },
    // Legitimate transactions
    { id: 'e9', source: 'bank-chase', target: 'acc-legit-1', amount: 5000, risk_score: 10, decision: 'ALLOW' },
    { id: 'e10', source: 'acc-legit-1', target: 'acc-legit-2', amount: 3200, risk_score: 14, decision: 'ALLOW' },
    { id: 'e11', source: 'acc-legit-2', target: 'bank-barclays', amount: 14500, risk_score: 19, decision: 'ALLOW' }
  ]
};

export const INITIAL_ALERTS: SecurityAlert[] = [
  {
    id: 'ALT-8091',
    severity: 'CRITICAL',
    alert_type: 'Mule Network Detected',
    title: 'Coordinated Multi-Bank Mule Ring Active',
    description: 'Rapid fan-out distribution from US-WF-44219 to 4 newly activated synthetic accounts across 3 international payment rails.',
    accounts_count: 6,
    banks_count: 4,
    amount_involved: 148500,
    risk_score: 94,
    timestamp: new Date(Date.now() - 1000 * 50).toISOString(),
    status: 'ACTIVE',
    signals: [
      'HIGH NETWORK FAN-OUT',
      'RAPID FUND MOVEMENT',
      'MULTI-BANK CONNECTION',
      'SUSPICIOUS CONNECTION CLUSTER'
    ],
    primary_account_id: 'acc-mule-central',
    transaction_id: 10492,
    affected_nodes: ['acc-origin-1', 'acc-mule-central', 'acc-mule-leaf1', 'acc-mule-leaf2', 'acc-mule-leaf3']
  },
  {
    id: 'ALT-8090',
    severity: 'HIGH',
    alert_type: 'Suspicious Transaction Cluster',
    title: 'Burst Velocity Exceeded Threshold (6 tx / 2 mins)',
    description: 'Account US-CITI-31084 received multiple high-value transfers immediately following dormant account activation.',
    accounts_count: 3,
    banks_count: 2,
    amount_involved: 48400,
    risk_score: 88,
    timestamp: new Date(Date.now() - 1000 * 180).toISOString(),
    status: 'ACTIVE',
    signals: ['HIGH VELOCITY', 'NEW ACCOUNT', 'MANY RECIPIENTS'],
    primary_account_id: 'acc-mule-leaf1',
    transaction_id: 10491,
    affected_nodes: ['acc-mule-central', 'acc-mule-leaf1']
  },
  {
    id: 'ALT-8089',
    severity: 'MEDIUM',
    alert_type: 'Unusual Transaction Velocity',
    title: 'Cross-Border Fast-Hop Anomaly',
    description: 'Funds cleared through domestic settlement and routed to neo-bank endpoint UK-REV-88321 within 45 seconds.',
    accounts_count: 2,
    banks_count: 2,
    amount_involved: 19800,
    risk_score: 74,
    timestamp: new Date(Date.now() - 1000 * 360).toISOString(),
    status: 'INVESTIGATING',
    signals: ['CROSS-BORDER HOPPING', 'UNUSUAL VELOCITY'],
    primary_account_id: 'acc-mule-leaf2',
    transaction_id: 10490,
    affected_nodes: ['acc-mule-central', 'acc-mule-leaf2']
  },
  {
    id: 'ALT-8088',
    severity: 'LOW',
    alert_type: 'Structural Volume Shift',
    title: 'Off-Hours High Net-Worth Transfer',
    description: 'Corporate client initiated wire transfer 2.4x above 30-day baseline during weekend batch window.',
    accounts_count: 2,
    banks_count: 2,
    amount_involved: 14500,
    risk_score: 42,
    timestamp: new Date(Date.now() - 1000 * 920).toISOString(),
    status: 'RESOLVED',
    signals: ['HIGH TRANSACTION VALUE'],
    primary_account_id: 'acc-legit-2',
    transaction_id: 10488
  }
];

export const INITIAL_STATS: SystemStats = {
  transactions_processed: 142850,
  transactions_blocked: 1240,
  high_risk_transactions: 3180,
  suspicious_networks: 14,
  system_status: 'ONLINE',
  firewall_latency_ms: 12,
  mule_detection_rate: 99.4,
  blocked_volume_usd: 8492000
};

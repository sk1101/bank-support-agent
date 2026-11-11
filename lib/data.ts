// Mock bank data. Kept separate (no imports) so the browser can load it too.

export type Account = { id: string; type: "Current" | "Savings"; currency: "AED"; balance: number };
export type Card = { id: string; last4: string; accountId: string; kind: "Debit" | "Credit"; status: "active" | "frozen" };
export type Txn = { id: string; date: string; accountId: string; description: string; category: string; amount: number };
export type BankState = { customerName: string; accounts: Account[]; cards: Card[]; transactions: Txn[] };

export const initialState: BankState = {
  customerName: "Demo Customer",
  accounts: [
    { id: "ACC-001", type: "Current", currency: "AED", balance: 12450.75 },
    { id: "ACC-002", type: "Savings", currency: "AED", balance: 48200.0 },
  ],
  cards: [
    { id: "CARD-1", last4: "4417", accountId: "ACC-001", kind: "Debit", status: "active" },
    { id: "CARD-2", last4: "9032", accountId: "ACC-001", kind: "Credit", status: "active" },
  ],
  transactions: [
    { id: "T01", date: "2026-10-01", accountId: "ACC-001", description: "Salary - Acme LLC", category: "Income", amount: 25000 },
    { id: "T02", date: "2026-10-02", accountId: "ACC-001", description: "Rent transfer", category: "Housing", amount: -8500 },
    { id: "T03", date: "2026-10-04", accountId: "ACC-001", description: "Carrefour", category: "Groceries", amount: -412.3 },
    { id: "T04", date: "2026-10-06", accountId: "ACC-001", description: "Talabat", category: "Food Delivery", amount: -86.5 },
    { id: "T05", date: "2026-10-09", accountId: "ACC-001", description: "DEWA", category: "Utilities", amount: -640 },
    { id: "T06", date: "2026-10-12", accountId: "ACC-001", description: "Netflix", category: "Subscriptions", amount: -56 },
    { id: "T07", date: "2026-10-14", accountId: "ACC-001", description: "Deliveroo", category: "Food Delivery", amount: -112 },
    { id: "T08", date: "2026-10-18", accountId: "ACC-001", description: "Salik top-up", category: "Transport", amount: -200 },
    { id: "T09", date: "2026-10-21", accountId: "ACC-001", description: "Spotify", category: "Subscriptions", amount: -21.99 },
    { id: "T10", date: "2026-10-25", accountId: "ACC-001", description: "Talabat", category: "Food Delivery", amount: -64.25 },
    { id: "T11", date: "2026-10-28", accountId: "ACC-001", description: "Transfer to savings", category: "Transfer", amount: -3000 },
    { id: "T12", date: "2026-10-28", accountId: "ACC-002", description: "Transfer from current", category: "Transfer", amount: 3000 },
    { id: "T13", date: "2026-11-01", accountId: "ACC-001", description: "Salary - Acme LLC", category: "Income", amount: 25000 },
    { id: "T14", date: "2026-11-02", accountId: "ACC-001", description: "Rent transfer", category: "Housing", amount: -8500 },
    { id: "T15", date: "2026-11-05", accountId: "ACC-001", description: "Lulu Hypermarket", category: "Groceries", amount: -365.8 },
    { id: "T16", date: "2026-11-07", accountId: "ACC-001", description: "Talabat", category: "Food Delivery", amount: -98 },
    { id: "T17", date: "2026-11-09", accountId: "ACC-001", description: "Unknown merchant - ONLINE", category: "Shopping", amount: -1249 },
  ],
};


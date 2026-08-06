/**
 * Tipos do banco.
 * Escritos à mão a partir de supabase/schema.sql para o projeto compilar antes
 * de existir um Supabase de verdade. Depois que o schema estiver aplicado, dá
 * para regenerar com:
 *
 *   npx supabase gen types typescript --project-id <ref> > src/lib/database.types.ts
 */

export type AccountType = "banco" | "cartao" | "dinheiro" | "investimento";
export type CategoryKind = "receita" | "despesa";
export type TxType = "receita" | "despesa" | "transferencia";
export type SplitMode = "none" | "equal" | "income" | "custom";
export type BudgetScope = "casal" | "pessoal";
export type ImportSource = "ofx" | "csv" | "pdf" | "manual";
export type ImportStatus = "revisando" | "concluido" | "cancelado";
export type RecurrenceKind = "fixa" | "variavel";
export type RuleMatch = "contains" | "regex";
export type VehicleStatus = "estoque" | "vendido" | "cancelado";
export type VehicleLinkRole = "compra" | "custo" | "entrada" | "parcela" | "ajuste";
export type CounterpartyKind =
  | "pessoa"
  | "familiar"
  | "amigo"
  | "cliente"
  | "vendedor"
  | "senhorio"
  | "empregador"
  | "conta_propria"
  | "estabelecimento"
  | "desconhecido";

export type Profile = {
  id: string;
  display_name: string;
  avatar_emoji: string;
  created_at: string;
  updated_at: string;
}

export type Couple = {
  id: string;
  name: string;
  invite_code: string;
  primary_currency: string;
  created_by: string;
  created_at: string;
  updated_at: string;
}

export type ExchangeRate = {
  base: string;
  quote: string;
  day: string;
  rate: number;
  created_at: string;
}

export type CoupleMember = {
  couple_id: string;
  profile_id: string;
  role: string;
  income_cents: number;
  joined_at: string;
}

export type Account = {
  id: string;
  couple_id: string;
  owner_profile_id: string | null;
  name: string;
  type: AccountType;
  currency: string;
  initial_balance_cents: number;
  color: string;
  is_private: boolean;
  archived: boolean;
  closing_day: number | null;
  due_day: number | null;
  credit_limit_cents: number | null;
  payment_account_id: string | null;
  created_at: string;
  updated_at: string;
}

export type Category = {
  id: string;
  couple_id: string;
  name: string;
  kind: CategoryKind;
  icon: string;
  color: string;
  parent_id: string | null;
  archived: boolean;
  created_at: string;
}

export type Transaction = {
  id: string;
  couple_id: string;
  account_id: string;
  category_id: string | null;
  created_by: string;
  payer_profile_id: string | null;
  type: TxType;
  amount_cents: number;
  rate_to_primary: number;
  amount_primary_cents: number;
  description: string;
  occurred_on: string;
  invoice_month: string | null;
  transfer_account_id: string | null;
  split_mode: SplitMode;
  installment_group_id: string | null;
  installment_no: number | null;
  installment_total: number | null;
  recurrence_id: string | null;
  import_id: string | null;
  external_id: string | null;
  fingerprint: string | null;
  needs_review: boolean;
  created_at: string;
  updated_at: string;
}

export type Vehicle = { id:string; couple_id:string; status:VehicleStatus; make:string; model:string; year:number|null; color:string; mileage:number|null; plate:string; purchase_price_cents:number; purchase_date:string; desired_sale_price_cents:number|null; sale_price_cents:number|null; sale_date:string|null; buyer_name:string; buyer_counterparty_id:string|null; notes:string; photo_url:string|null; created_at:string; updated_at:string; };
export type VehicleCost = { id:string; couple_id:string; vehicle_id:string; category:string; description:string; amount_cents:number; occurred_on:string; created_at:string; };
export type VehicleInstallment = { id:string; couple_id:string; vehicle_id:string; installment_no:number; due_on:string; amount_cents:number; paid_on:string|null; created_at:string; };
export type VehicleTransactionLink = { id:string; couple_id:string; vehicle_id:string; transaction_id:string; role:VehicleLinkRole; created_at:string; };

export type LoanDirection = "emprestei" | "peguei_emprestado";
export type LoanLinkRole = "desembolso" | "pagamento";
export type Loan = { id:string; couple_id:string; counterparty_id:string|null; direction:LoanDirection; description:string; principal_cents:number; occurred_on:string; expected_return_date:string|null; notes:string; archived:boolean; created_at:string; updated_at:string; };
export type LoanTransactionLink = { id:string; couple_id:string; loan_id:string; transaction_id:string; role:LoanLinkRole; created_at:string; };

export type TransactionSplit = {
  transaction_id: string;
  profile_id: string;
  share_cents: number;
}

export type Settlement = {
  id: string;
  couple_id: string;
  from_profile: string;
  to_profile: string;
  amount_cents: number;
  settled_on: string;
  note: string;
  created_by: string;
  created_at: string;
  /** Transação real que pagou esse acerto — opcional, preenchida ao clicar numa sugestão. */
  transaction_id: string | null;
}

export type Recurrence = {
  id: string;
  couple_id: string;
  account_id: string | null;
  category_id: string | null;
  counterparty_id: string | null;
  description: string;
  amount_cents: number;
  type: TxType;
  day_of_month: number;
  kind: RecurrenceKind;
  split_mode: SplitMode;
  /** Só quando split_mode = 'custom': profile_id -> percentual (0..100), soma 100. */
  custom_split: Record<string, number> | null;
  active: boolean;
  created_at: string;
  updated_at: string;
}

export type Budget = {
  id: string;
  couple_id: string;
  category_id: string;
  month: string;
  scope: BudgetScope;
  profile_id: string | null;
  limit_cents: number;
  created_at: string;
  updated_at: string;
}

export type Goal = {
  id: string;
  couple_id: string;
  name: string;
  target_cents: number;
  deadline: string | null;
  icon: string;
  color: string;
  completed: boolean;
  archived: boolean;
  created_at: string;
  updated_at: string;
}

export type GoalContribution = {
  id: string;
  goal_id: string;
  profile_id: string;
  account_id: string | null;
  amount_cents: number;
  occurred_on: string;
  note: string;
  created_at: string;
}

export type ImportBatch = {
  id: string;
  couple_id: string;
  account_id: string | null;
  file_name: string;
  file_hash: string;
  source: ImportSource;
  rows_total: number;
  rows_imported: number;
  status: ImportStatus;
  created_by: string;
  created_at: string;
}

export type ImportRule = {
  id: string;
  couple_id: string;
  match_type: RuleMatch;
  pattern: string;
  category_id: string | null;
  set_payer: string | null;
  set_split: SplitMode | null;
  hits: number;
  created_at: string;
}

export type NetWorthSnapshot = {
  id: string;
  couple_id: string;
  month: string;
  total_cents: number;
  created_at: string;
}

export type AccountBalance = {
  account_id: string;
  couple_id: string;
  currency: string;
  balance_cents: number;
  balance_primary_cents: number;
}

export type SplitLedgerRow = {
  couple_id: string;
  transaction_id: string;
  occurred_on: string;
  category_id: string | null;
  payer_profile_id: string;
  debtor_profile_id: string;
  share_cents: number;
}

export type Counterparty = {
  id: string;
  couple_id: string;
  name: string;
  kind: CounterpartyKind;
  notes: string;
  archived: boolean;
  created_at: string;
  updated_at: string;
}

export type CounterpartyAlias = {
  id: string;
  counterparty_id: string;
  pattern: string;
  created_at: string;
}

export type ProjectKind = "pessoal" | "negocio";

export type Project = {
  id: string;
  couple_id: string;
  name: string;
  icon: string;
  kind: ProjectKind;
  planned_amount_cents: number | null;
  archived: boolean;
  created_at: string;
  updated_at: string;
}

export type ProjectTransaction = {
  project_id: string;
  transaction_id: string;
}

export type InvestmentHolding = {
  id: string;
  couple_id: string;
  ticker: string;
  quantity: number;
  /** Preço médio de compra manual, em centavos — null quando não informado. */
  avg_price_cents: number | null;
  notes: string | null;
  archived: boolean;
  updated_at: string;
}

export type InvestmentDividend = {
  id: string;
  couple_id: string;
  ticker: string;
  amount_cents: number;
  paid_on: string;
  notes: string | null;
  created_at: string;
}

/** Colunas com default no banco ficam opcionais no insert. */
type Insertable<T, Required extends keyof T> = Partial<T> & Pick<T, Required>;

type Table<Row, Ins, Upd = Partial<Ins>> = {
  Row: Row;
  Insert: Ins;
  Update: Upd;
  Relationships: [];
};

type ViewTable<Row> = {
  Row: Row;
  Relationships: [];
}

export type Database = {
  public: {
    Tables: {
      profiles: Table<Profile, Insertable<Profile, "id">>;
      couples: Table<Couple, Insertable<Couple, "created_by">>;
      couple_members: Table<
        CoupleMember,
        Insertable<CoupleMember, "couple_id" | "profile_id">
      >;
      accounts: Table<Account, Insertable<Account, "couple_id" | "name">>;
      categories: Table<Category, Insertable<Category, "couple_id" | "name">>;
      transactions: Table<
        Transaction,
        Insertable<
          Transaction,
          | "couple_id"
          | "account_id"
          | "created_by"
          | "type"
          | "amount_cents"
          | "occurred_on"
        >
      >;
      transaction_splits: Table<
        TransactionSplit,
        Insertable<TransactionSplit, "transaction_id" | "profile_id" | "share_cents">
      >;
      settlements: Table<
        Settlement,
        Insertable<
          Settlement,
          "couple_id" | "from_profile" | "to_profile" | "amount_cents" | "created_by"
        >
      >;
      recurrences: Table<
        Recurrence,
        Insertable<
          Recurrence,
          "couple_id" | "description" | "amount_cents" | "day_of_month"
        >
      >;
      budgets: Table<
        Budget,
        Insertable<Budget, "couple_id" | "category_id" | "month" | "limit_cents">
      >;
      goals: Table<Goal, Insertable<Goal, "couple_id" | "name" | "target_cents">>;
      goal_contributions: Table<
        GoalContribution,
        Insertable<GoalContribution, "goal_id" | "profile_id" | "amount_cents">
      >;
      imports: Table<
        ImportBatch,
        Insertable<
          ImportBatch,
          "couple_id" | "file_name" | "file_hash" | "source" | "created_by"
        >
      >;
      import_rules: Table<
        ImportRule,
        Insertable<ImportRule, "couple_id" | "pattern">
      >;
      net_worth_snapshots: Table<
        NetWorthSnapshot,
        Insertable<NetWorthSnapshot, "couple_id" | "month" | "total_cents">
      >;
      vehicles: Table<Vehicle, Insertable<Vehicle, "couple_id" | "make" | "model" | "purchase_price_cents">>;
      vehicle_costs: Table<VehicleCost, Insertable<VehicleCost, "couple_id" | "vehicle_id" | "amount_cents">>;
      vehicle_sale_installments: Table<VehicleInstallment, Insertable<VehicleInstallment, "couple_id" | "vehicle_id" | "installment_no" | "due_on" | "amount_cents">>;
      vehicle_transaction_links: Table<VehicleTransactionLink, Insertable<VehicleTransactionLink, "couple_id" | "vehicle_id" | "transaction_id" | "role">>;
      loans: Table<Loan, Insertable<Loan, "couple_id" | "direction" | "principal_cents">>;
      loan_transaction_links: Table<LoanTransactionLink, Insertable<LoanTransactionLink, "couple_id" | "loan_id" | "transaction_id" | "role">>;
      exchange_rates: Table<
        ExchangeRate,
        Insertable<ExchangeRate, "base" | "quote" | "day" | "rate">
      >;
      counterparties: Table<Counterparty, Insertable<Counterparty, "couple_id" | "name">>;
      counterparty_aliases: Table<
        CounterpartyAlias,
        Insertable<CounterpartyAlias, "counterparty_id" | "pattern">
      >;
      projects: Table<Project, Insertable<Project, "couple_id" | "name">>;
      project_transactions: Table<
        ProjectTransaction,
        Insertable<ProjectTransaction, "project_id" | "transaction_id">
      >;
      investment_holdings: Table<
        InvestmentHolding,
        Insertable<InvestmentHolding, "couple_id" | "ticker" | "quantity">
      >;
      investment_dividends: Table<
        InvestmentDividend,
        Insertable<InvestmentDividend, "couple_id" | "ticker" | "amount_cents" | "paid_on">
      >;
    };
    Views: {
      account_balances: ViewTable<AccountBalance>;
      split_ledger: ViewTable<SplitLedgerRow>;
      transaction_movements: ViewTable<{
        transaction_id: string;
        couple_id: string;
        account_id: string;
        occurred_on: string;
        delta_cents: number;
      }>;
    };
    Functions: {
      create_couple: {
        Args: { p_name?: string; p_currency?: string };
        Returns: Couple;
      };
      join_couple: { Args: { p_code: string }; Returns: Couple };
      my_couple_id: { Args: Record<string, never>; Returns: string | null };
      is_couple_member: { Args: { p_couple: string }; Returns: boolean };
      seed_default_categories: { Args: { p_couple: string }; Returns: undefined };
      normalize_description: { Args: { p_text: string }; Returns: string };
      transacoes_por_contraparte: {
        Args: {
          p_couple_id: string;
          p_counterparty_id: string;
          p_desde?: string | null;
          p_ate?: string | null;
        };
        Returns: Transaction[];
      };
    };
    Enums: {
      account_type: AccountType;
      category_kind: CategoryKind;
      tx_type: TxType;
      split_mode: SplitMode;
      budget_scope: BudgetScope;
      import_source: ImportSource;
      import_status: ImportStatus;
      recurrence_kind: RecurrenceKind;
      rule_match: RuleMatch;
    };
    CompositeTypes: Record<string, never>;
  };
}

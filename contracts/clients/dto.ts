// Orchestrator DTO v1.0.0-draft. Money/Date/Instant are strings. Public and internal models included; use endpoints by owner.
export type Id = string;

export type Date = string;

export type Instant = string;

export type Money = string;

export type PositiveMoney = string;

export type Probability = number;

export type Role = "OWNER" | "ACCOUNTANT" | "VIEWER";

export type Direction = "IN" | "OUT";

export type LegalForm = "OOO" | "IP" | "OTHER";

export type CategorySource = "RULE" | "COUNTERPARTY" | "USER" | "OTHER";

export type ImportStatus = "RECEIVING" | "STAGING" | "COMMITTED" | "REJECTED" | "ABORTED";

export type IssueSeverity = "INFO" | "WARNING" | "ERROR";

export type DataQuality = "GOOD" | "LIMITED" | "INSUFFICIENT";

export type Completeness = "CONFIRMED_COMPLETE" | "UNKNOWN";

export type PaymentSource = "MANUAL" | "INVOICE" | "TAX" | "CONTRACT";

export type PlanStatus = "OPEN" | "PARTIALLY_SETTLED" | "SETTLED" | "CANCELLED";

export type PlanRelation = "ADDITIONAL" | "REPLACES_RECURRING" | "REPLACES_BASELINE";

export type Frequency = "WEEKLY" | "MONTHLY";

export type PatternStatus = "DETECTED" | "CONFIRMED" | "EXCLUDED";

export type BusinessDayRule = "NONE" | "FOLLOWING";

export type JobType = "FORECAST" | "BACKTEST" | "DETECT_RECURRING";

export type JobStatus = "QUEUED" | "RUNNING" | "SUCCEEDED" | "FAILED" | "CANCELLED";

export type RiskAvailability = "AVAILABLE" | "INSUFFICIENT_HISTORY" | "INPUT_INCOMPLETE";

export type RiskMethod = "HISTORICAL_TRAJECTORY_BOOTSTRAP";

export type AlertType = "CASH_GAP" | "BUFFER_BREACH" | "OVERDUE_PLAN" | "STALE_FORECAST" | "DATA_QUALITY";

export type ForecastScope = "HISTORY_ONLY" | "WITH_KNOWN_PLANS";

export type ExternalSource = "ACCOUNTING_EXPORT" | "INVOICE_REGISTER" | "TAX_REGISTER";

export type WarningCode = "SHORT_HISTORY" | "MISSING_DATA" | "BALANCE_MISMATCH" | "NO_BASELINE_OBSERVATIONS" | "UNMATCHED_PLAN" | "ASSUMED_FIXED_PLAN_DATES" | "RISK_UNAVAILABLE" | "ESTIMATED_PROBABILITY";

export type DailyStatus = "OBSERVED" | "ZERO_CONFIRMED" | "MISSING";

export type Algorithm = "WEEKDAY_MEAN_V1";

export type BacktestStatus = "PARTIAL" | "COMPLETE";

export type RecommendationKind = "REVIEW_PLAN_DATE" | "REQUEST_PAYMENT" | "REVIEW_VARIABLE_COSTS";

export type Staleness = "CURRENT" | "STALE";

export type ErrorCode = "VALIDATION_FAILED" | "MALFORMED_REQUEST" | "AUTH_REQUIRED" | "FORBIDDEN" | "NOT_FOUND" | "CONFLICT" | "VERSION_CONFLICT" | "PRECONDITION_REQUIRED" | "IDEMPOTENCY_CONFLICT" | "IMPORT_REJECTED" | "IMPORT_INCOMPLETE" | "UNSUPPORTED_MEDIA_TYPE" | "PAYLOAD_TOO_LARGE" | "DUPLICATE_CONFLICT" | "INSUFFICIENT_HISTORY" | "BALANCE_ANCHOR_REQUIRED" | "UNRESOLVED_PLAN" | "DEPENDENCY_UNAVAILABLE" | "RATE_LIMITED" | "JOB_NOT_CANCELLABLE" | "ACCOUNT_ARCHIVED" | "ALLOCATION_EXCEEDS_AMOUNT";

export interface FieldError {
  field: string;
  code: string;
  message: string;
}

export interface Problem {
  type: string;
  title: string;
  status: number;
  code: ErrorCode;
  detail: string;
  traceId: string;
  errors: Array<FieldError>;
  retryAfterSec: number | null;
  resourceId: Id | null;
}

export interface PageMeta {
  page: number;
  size: number;
  total: number;
  hasNext: boolean;
}

export interface Warning {
  code: WarningCode;
  message: string;
  date: Date | null;
}

export interface Permissions {
  canEditCompany: boolean;
  canManageMembers: boolean;
  canImport: boolean;
  canEditPayments: boolean;
  canManagePlans: boolean;
  canRunForecast: boolean;
  canRunBacktest: boolean;
}

export interface CapabilitiesRs {
  apiVersion: string;
  currency: "RUB";
  forecastHorizons: Array<30>;
  riskMethods: Array<RiskMethod>;
  maxCsvBytes: number;
  maxImportRows: number;
  maxPageSize: number;
}

export interface CreateCompanyRq {
  name: string;
  legalForm: LegalForm;
  inn: string | null;
  kpp: string | null;
  timezone: "Europe/Moscow";
}

export interface UpdateCompanyRq {
  name: string;
  legalForm: LegalForm;
  inn: string | null;
  kpp: string | null;
  timezone: "Europe/Moscow";
}

export interface CompanyRs {
  id: Id;
  name: string;
  legalForm: LegalForm;
  inn: string | null;
  kpp: string | null;
  timezone: "Europe/Moscow";
  ownerUserId: Id;
  myRole: Role;
  permissions: Permissions;
  archived: boolean;
  dataVersion: number;
  version: number;
  createdAt: Instant;
  updatedAt: Instant;
}

export interface MemberRs {
  userId: Id;
  role: Role;
  joinedAt: Instant;
  version: number;
}

export interface AddMemberRq {
  userId: Id;
  role: "ACCOUNTANT" | "VIEWER";
}

export interface UpdateMemberRq {
  role: "ACCOUNTANT" | "VIEWER";
}

export interface CreateAccountRq {
  name: string;
  bankName: string | null;
  accountNumber: string | null;
  externalCompanyId: string | null;
}

export interface UpdateAccountRq {
  name: string;
  bankName: string | null;
  accountNumber: string | null;
  externalCompanyId: string | null;
}

export interface AccountRs {
  id: Id;
  companyId: Id;
  name: string;
  bankName: string | null;
  accountNumber: string | null;
  externalCompanyId: string | null;
  currency: "RUB";
  archived: boolean;
  latestBalance: Money | null;
  latestBalanceDate: Date | null;
  version: number;
}

export interface BalanceAnchorRq {
  date: Date;
  balance: Money;
  reason: string;
}

export interface BalanceAnchorRs {
  id: Id;
  accountId: Id;
  date: Date;
  balance: Money;
  source: "STATEMENT" | "MANUAL";
  reason: string | null;
  createdAt: Instant;
}

export interface CategoryRs {
  code: string;
  name: string;
  directions: Array<Direction>;
  system: boolean;
}

export interface PaymentRs {
  id: Id;
  companyId: Id;
  accountId: Id;
  importId: Id;
  externalOperationId: string | null;
  operationDate: Date;
  amount: PositiveMoney;
  direction: Direction;
  counterpartyInn: string | null;
  counterpartyName: string | null;
  purpose: string | null;
  categoryCode: string;
  categorySource: CategorySource;
  ruleVersion: string | null;
  balanceEod: Money | null;
  allocatedAmount: Money;
  version: number;
  createdAt: Instant;
}

export interface UpdateCategoryRq {
  categoryCode: string;
}

export interface PaymentCategoryChange {
  paymentId: Id;
  expectedVersion: number;
}

export interface BulkCategoryRq {
  categoryCode: string;
  payments: Array<PaymentCategoryChange>;
}

export interface CounterpartyRs {
  key: string;
  inn: string | null;
  name: string | null;
}

export interface ImportIssueRs {
  id: Id;
  severity: IssueSeverity;
  code: string;
  rowNumber: number | null;
  field: string | null;
  message: string;
}

export interface ImportRs {
  id: Id;
  companyId: Id;
  accountId: Id;
  status: ImportStatus;
  fileName: string;
  fileSha256: string;
  totalRows: number;
  acceptedRows: number;
  rejectedRows: number;
  duplicateRows: number;
  warningCount: number;
  fromDate: Date | null;
  toDate: Date | null;
  createdAt: Instant;
  completedAt: Instant | null;
  dataVersion: number | null;
}

export interface CompletenessRangeRq {
  fromDate: Date;
  toDate: Date;
  completeness: Completeness;
  reason: string;
}

export interface CompletenessRangeRs {
  id: Id;
  accountId: Id;
  fromDate: Date;
  toDate: Date;
  completeness: Completeness;
  reason: string;
  createdAt: Instant;
}

export interface DailyActualRs {
  date: Date;
  inflow: Money | null;
  outflow: Money | null;
  balanceEod: Money | null;
  status: DailyStatus;
  paymentCount: number;
  balanceMismatch: boolean;
}

export interface DataQualityRs {
  accountId: Id;
  fromDate: Date | null;
  toDate: Date | null;
  quality: DataQuality;
  completeDayCount: number;
  missingDayCount: number;
  balanceMismatchCount: number;
  emptyPurposeCount: number;
  warnings: Array<Warning>;
}

export interface Schedule {
  frequency: Frequency;
  weekday: number | null;
  dayOfMonth: number | null;
  businessDayRule: BusinessDayRule;
}

export interface RecurringPatternRs {
  id: Id;
  accountId: Id;
  direction: Direction;
  categoryCode: string;
  counterpartyKey: string | null;
  status: PatternStatus;
  schedule: Schedule;
  amount: PositiveMoney;
  observations: number;
  firstSeen: Date;
  lastSeen: Date;
  inputDataVersion: number;
  detectorVersion: string;
  version: number;
}

export interface UpdateRecurringRq {
  status: PatternStatus;
  schedule: Schedule;
  amount: PositiveMoney;
}

export interface DetectRecurringRq {
  accountId: Id;
  asOfDate: Date;
}

export interface CreateExpectedPaymentRq {
  accountId: Id;
  title: string;
  direction: Direction;
  amount: PositiveMoney;
  dueDate: Date;
  categoryCode: string;
  counterpartyKey: string | null;
  note: string | null;
  relation: PlanRelation;
  recurringPatternId: Id | null;
  baselineCounterpartyKey: string | null;
}

export interface UpdateExpectedPaymentRq {
  accountId: Id;
  title: string;
  direction: Direction;
  amount: PositiveMoney;
  dueDate: Date;
  categoryCode: string;
  counterpartyKey: string | null;
  note: string | null;
  relation: PlanRelation;
  recurringPatternId: Id | null;
  baselineCounterpartyKey: string | null;
}

export interface SourceDocument {
  externalSystem: string;
  externalId: string;
  documentNumber: string | null;
  issuedDate: Date | null;
}

export interface ExpectedPaymentRs {
  id: Id;
  companyId: Id;
  accountId: Id;
  title: string;
  direction: Direction;
  amount: PositiveMoney;
  dueDate: Date;
  categoryCode: string;
  counterpartyKey: string | null;
  note: string | null;
  relation: PlanRelation;
  recurringPatternId: Id | null;
  baselineCounterpartyKey: string | null;
  source: PaymentSource;
  sourceDocument: SourceDocument | null;
  status: PlanStatus;
  settledAmount: Money;
  remainingAmount: Money;
  overdue: boolean;
  knownAt: Instant;
  createdAt: Instant;
  updatedAt: Instant;
  version: number;
}

export interface ExternalExpectedPaymentItem {
  accountId: Id;
  title: string;
  direction: Direction;
  amount: PositiveMoney;
  dueDate: Date;
  categoryCode: string;
  counterpartyKey: string | null;
  note: string | null;
  relation: PlanRelation;
  recurringPatternId: Id | null;
  baselineCounterpartyKey: string | null;
  source: "INVOICE" | "TAX" | "CONTRACT";
  sourceDocument: SourceDocument;
  expectedVersion: number | null;
}

export interface ImportExpectedPaymentsRq {
  externalSource: ExternalSource;
  items: Array<ExternalExpectedPaymentItem>;
}

export interface ExpectedPaymentImportRs {
  createdCount: number;
  updatedCount: number;
  unchangedCount: number;
  items: Array<ExpectedPaymentRs>;
}

export interface AllocationRq {
  paymentId: Id;
  amount: PositiveMoney;
}

export interface AllocationRs {
  id: Id;
  expectedPaymentId: Id;
  paymentId: Id;
  amount: PositiveMoney;
  createdAt: Instant;
}

export interface CancelRq {
  reason: string;
}

export interface ForecastSettings {
  windowWeeks: 8 | 10 | 12;
  horizonDays: 30;
  bufferAmount: Money;
  scenarioCount: number;
  minCalibrationOrigins: number;
  calibrationStepDays: 7;
  algorithm: Algorithm;
}

export interface SettingsRs {
  accountId: Id;
  forecast: ForecastSettings;
  autoRecalculate: boolean;
  version: number;
}

export interface UpdateSettingsRq {
  forecast: ForecastSettings;
  autoRecalculate: boolean;
}

export interface CreateForecastRq {
  accountId: Id;
  asOfDate: Date;
  scope: ForecastScope;
}

export interface JobRs {
  id: Id;
  companyId: Id;
  accountId: Id;
  type: JobType;
  status: JobStatus;
  progress: number;
  resultId: Id | null;
  error: Problem | null;
  createdAt: Instant;
  startedAt: Instant | null;
  finishedAt: Instant | null;
}

export interface RiskEstimate {
  availability: RiskAvailability;
  method: RiskMethod;
  probability: Probability | null;
  scenarioCount: number;
  calibrationOriginCount: number;
  probabilityCalibrated: false;
  assumptions: Array<string>;
}

export interface ForecastDayRs {
  date: Date;
  plannedIn: Money;
  plannedOut: Money;
  recurringIn: Money;
  recurringOut: Money;
  residualIn: Money;
  residualOut: Money;
  inflow: Money;
  outflow: Money;
  balance: Money;
  balanceP10: Money | null;
  balanceP50: Money | null;
  balanceP90: Money | null;
  pBelowZero: Probability | null;
  pBelowBuffer: Probability | null;
}

export interface GapEpisodeRs {
  id: Id;
  kind: "CASH_GAP" | "BUFFER_BREACH";
  fromDate: Date;
  toDate: Date;
  threshold: Money;
  expectedMinimumBalance: Money;
  expectedShortfall: Money;
  probability: Probability | null;
  shortfallP50: Money | null;
  shortfallP90: Money | null;
  shortfallBasis: "CONDITIONAL_ON_BREACH";
  riskEstimateAvailability: RiskAvailability;
}

export interface ForecastRs {
  id: Id;
  companyId: Id;
  accountId: Id;
  jobId: Id;
  asOfDate: Date;
  horizonDays: 30;
  scope: ForecastScope;
  algorithm: Algorithm;
  algorithmVersion: string;
  settings: ForecastSettings;
  inputDataVersion: number;
  snapshotId: Id;
  staleness: Staleness;
  startBalance: Money;
  startBalanceDate: Date;
  quality: DataQuality;
  warnings: Array<Warning>;
  riskEstimate: RiskEstimate;
  expectedMinimumBalance: Money;
  firstExpectedGapDate: Date | null;
  maxExpectedShortfall: Money;
  days: Array<ForecastDayRs>;
  gaps: Array<GapEpisodeRs>;
  createdAt: Instant;
}

export interface BacktestRq {
  accountId: Id;
  firstOrigin: Date;
  lastOrigin: Date;
  stepDays: number;
  scope: ForecastScope;
  windowWeeks: 8 | 10 | 12;
  evaluateRisk: boolean;
}

export interface HorizonMetric {
  horizonDay: number;
  maeBalance: Money | null;
  rmseBalance: Money | null;
  evaluatedCount: number;
}

export interface GapMetrics {
  truePositive: number;
  falsePositive: number;
  falseNegative: number;
  precision: Probability | null;
  recall: Probability | null;
  medianLeadDays: number | null;
  dateMaeDays: number | null;
  shortfallMae: Money | null;
}

export interface CalibrationBin {
  fromProbability: Probability;
  toProbability: Probability;
  count: number;
  meanProbability: Probability | null;
  observedRate: Probability | null;
}

export interface RiskMetrics {
  brierScore: Probability | null;
  evaluatedCount: number;
  calibrationBins: Array<CalibrationBin>;
  interval80Coverage: Probability | null;
}

export interface BacktestOriginRs {
  asOfDate: Date;
  status: "EVALUATED" | "SKIPPED";
  reason: string | null;
  maeBalance: Money | null;
  evaluatedDays: number;
}

export interface BacktestRs {
  id: Id;
  companyId: Id;
  accountId: Id;
  jobId: Id;
  status: BacktestStatus;
  algorithm: Algorithm;
  algorithmVersion: string;
  scope: ForecastScope;
  windowWeeks: 8 | 10 | 12;
  firstOrigin: Date;
  lastOrigin: Date;
  stepDays: number;
  snapshotId: Id;
  inputDataVersion: number;
  staleness: Staleness;
  evaluatedOrigins: number;
  skippedOrigins: number;
  evaluatedDays: number;
  maeBalance: Money | null;
  rmseBalance: Money | null;
  horizons: Array<HorizonMetric>;
  gapMetrics: GapMetrics;
  riskMetrics: RiskMetrics;
  warnings: Array<Warning>;
  createdAt: Instant;
}

export interface RiskFactorRs {
  kind: "KNOWN_OUTFLOW" | "LOW_EXPECTED_INFLOW" | "OVERDUE_INFLOW" | "DATA_LIMITATION";
  title: string;
  amount: Money | null;
  date: Date | null;
  expectedPaymentId: Id | null;
  recurringPatternId: Id | null;
  description: string;
}

export interface RecommendationRs {
  kind: RecommendationKind;
  title: string;
  description: string;
  expectedPaymentId: Id | null;
  requiresUserAgreement: boolean;
}

export interface AlertRs {
  id: Id;
  companyId: Id;
  accountId: Id;
  type: AlertType;
  title: string;
  description: string;
  forecastId: Id | null;
  gapId: Id | null;
  expectedPaymentId: Id | null;
  date: Date | null;
  shortfall: Money | null;
  probability: Probability | null;
  active: boolean;
  acknowledgedAt: Instant | null;
  version: number;
  createdAt: Instant;
}

export interface GapDetailsRs {
  forecastId: Id;
  gap: GapEpisodeRs;
  factors: Array<RiskFactorRs>;
  recommendations: Array<RecommendationRs>;
}

export interface DashboardRs {
  companyId: Id;
  accountId: Id;
  asOfDate: Date;
  dataVersion: number;
  currentBalance: BalanceAnchorRs | null;
  latestForecast: ForecastRs | null;
  latestBacktest: BacktestRs | null;
  activeAlerts: Array<AlertRs>;
  upcomingPayments: Array<ExpectedPaymentRs>;
  quality: DataQualityRs;
  runningJobs: Array<JobRs>;
  permissions: Permissions;
}

export interface AccessCheckRq {
  userId: Id;
  permission: "READ" | "IMPORT" | "WRITE" | "MANAGE_MEMBERS";
  accountId: Id | null;
}

export interface AccessCheckRs {
  allowed: boolean;
  role: Role | null;
  companyId: Id;
  accountId: Id | null;
}

export interface ReserveImportRq {
  accountId: Id;
  fileName: string;
  fileSha256: string;
  validationMode: "ATOMIC" | "SKIP_INVALID";
  completeness: Completeness;
  declaredFromDate: Date | null;
  declaredToDate: Date | null;
}

export interface NormalizedPayment {
  sourceRow: number;
  externalOperationId: string | null;
  operationDate: Date;
  amount: PositiveMoney;
  direction: Direction;
  counterpartyInn: string | null;
  counterpartyName: string | null;
  purpose: string | null;
  categoryCode: string;
  categorySource: CategorySource;
  ruleVersion: string | null;
  balanceEod: Money | null;
}

export interface ImportBatchRq {
  batchNumber: number;
  batchSha256: string;
  rows: Array<NormalizedPayment>;
  issues: Array<ImportIssueRs>;
}

export interface ImportBatchRs {
  importId: Id;
  batchNumber: number;
  stagedRows: number;
  replayed: boolean;
}

export interface FinalizeImportRq {
  batchCount: number;
  totalRows: number;
  rejectedRows: number;
}

export interface SnapshotPayment {
  paymentId: Id;
  date: Date;
  amount: PositiveMoney;
  direction: Direction;
  categoryCode: string;
  counterpartyKey: string | null;
}

export interface CalibrationOriginSnapshot {
  /** Cutoff origin is input.asOfDate; input.asOfDate + 30 days must not exceed the outer snapshot asOfDate. */
  input: ForecastSnapshot;
  /** Exactly 30 complete days after the origin cutoff. Scoring only, never model features. */
  actualDays: Array<DailyActualRs>;
  /** Payments from the same 30 scoring days. Scoring only, never model features. */
  actualPayments: Array<SnapshotPayment>;
}

export interface ForecastSnapshot {
  snapshotId: Id;
  companyId: Id;
  accountId: Id;
  asOfDate: Date;
  inputDataVersion: number;
  algorithmVersion: string;
  settings: ForecastSettings;
  scope: ForecastScope;
  startBalance: Money;
  startBalanceDate: Date;
  historyFrom: Date;
  dailyHistory: Array<DailyActualRs>;
  payments: Array<SnapshotPayment>;
  knownPlans: Array<ExpectedPaymentRs>;
  recurringPatterns: Array<RecurringPatternRs>;
  completeRanges: Array<CompletenessRangeRs>;
  /** Mature historical origins; every nested input must have an empty calibrationOrigins array. */
  calibrationOrigins: Array<CalibrationOriginSnapshot>;
  fingerprint: string;
}

export interface BacktestSnapshot {
  snapshotId: Id;
  companyId: Id;
  accountId: Id;
  inputDataVersion: number;
  request: BacktestRq;
  settings: ForecastSettings;
  originSnapshots: Array<ForecastSnapshot>;
  actualDays: Array<DailyActualRs>;
}

export interface RecurringDetectionInput {
  accountId: Id;
  asOfDate: Date;
  inputDataVersion: number;
  payments: Array<SnapshotPayment>;
}

export interface RecurringDetectionResult {
  detectorVersion: string;
  patterns: Array<RecurringPatternRs>;
}

export interface CompanyPageRs {
  items: Array<CompanyRs>;
  page: PageMeta;
}

export interface MemberPageRs {
  items: Array<MemberRs>;
  page: PageMeta;
}

export interface AccountPageRs {
  items: Array<AccountRs>;
  page: PageMeta;
}

export interface PaymentPageRs {
  items: Array<PaymentRs>;
  page: PageMeta;
}

export interface CounterpartyPageRs {
  items: Array<CounterpartyRs>;
  page: PageMeta;
}

export interface ImportPageRs {
  items: Array<ImportRs>;
  page: PageMeta;
}

export interface ImportIssuePageRs {
  items: Array<ImportIssueRs>;
  page: PageMeta;
}

export interface ExpectedPaymentPageRs {
  items: Array<ExpectedPaymentRs>;
  page: PageMeta;
}

export interface AllocationPageRs {
  items: Array<AllocationRs>;
  page: PageMeta;
}

export interface ForecastPageRs {
  items: Array<ForecastRs>;
  page: PageMeta;
}

export interface BacktestPageRs {
  items: Array<BacktestRs>;
  page: PageMeta;
}

export interface BacktestOriginPageRs {
  items: Array<BacktestOriginRs>;
  page: PageMeta;
}

export interface AlertPageRs {
  items: Array<AlertRs>;
  page: PageMeta;
}

export interface RecurringPatternPageRs {
  items: Array<RecurringPatternRs>;
  page: PageMeta;
}

export interface CompletenessRangePageRs {
  items: Array<CompletenessRangeRs>;
  page: PageMeta;
}

export interface JobPageRs {
  items: Array<JobRs>;
  page: PageMeta;
}

export interface CategoryListRs {
  items: Array<CategoryRs>;
}

export interface DailyActualListRs {
  items: Array<DailyActualRs>;
}

export interface ChangedPaymentsRs {
  items: Array<PaymentRs>;
}

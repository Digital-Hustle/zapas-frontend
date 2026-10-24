package cashflow.orchestrator.dto

import kotlinx.serialization.Serializable

// DTO only. Add kotlinx.serialization plugin/dependency in Android app; pin versions there.
typealias Id = String

typealias Date = String

typealias Instant = String

typealias Money = String

typealias PositiveMoney = String

typealias Probability = Double

@Serializable
enum class Role { OWNER, ACCOUNTANT, VIEWER }

@Serializable
enum class Direction { IN, OUT }

@Serializable
enum class LegalForm { OOO, IP, OTHER }

@Serializable
enum class CategorySource { RULE, COUNTERPARTY, USER, OTHER }

@Serializable
enum class ImportStatus { RECEIVING, STAGING, COMMITTED, REJECTED, ABORTED }

@Serializable
enum class IssueSeverity { INFO, WARNING, ERROR }

@Serializable
enum class DataQuality { GOOD, LIMITED, INSUFFICIENT }

@Serializable
enum class Completeness { CONFIRMED_COMPLETE, UNKNOWN }

@Serializable
enum class PaymentSource { MANUAL, INVOICE, TAX, CONTRACT }

@Serializable
enum class PlanStatus { OPEN, PARTIALLY_SETTLED, SETTLED, CANCELLED }

@Serializable
enum class PlanRelation { ADDITIONAL, REPLACES_RECURRING, REPLACES_BASELINE }

@Serializable
enum class Frequency { WEEKLY, MONTHLY }

@Serializable
enum class PatternStatus { DETECTED, CONFIRMED, EXCLUDED }

@Serializable
enum class BusinessDayRule { NONE, FOLLOWING }

@Serializable
enum class JobType { FORECAST, BACKTEST, DETECT_RECURRING }

@Serializable
enum class JobStatus { QUEUED, RUNNING, SUCCEEDED, FAILED, CANCELLED }

@Serializable
enum class RiskAvailability { AVAILABLE, INSUFFICIENT_HISTORY, INPUT_INCOMPLETE }

@Serializable
enum class RiskMethod { HISTORICAL_TRAJECTORY_BOOTSTRAP }

@Serializable
enum class AlertType { CASH_GAP, BUFFER_BREACH, OVERDUE_PLAN, STALE_FORECAST, DATA_QUALITY }

@Serializable
enum class ForecastScope { HISTORY_ONLY, WITH_KNOWN_PLANS }

@Serializable
enum class ExternalSource { ACCOUNTING_EXPORT, INVOICE_REGISTER, TAX_REGISTER }

@Serializable
enum class WarningCode { SHORT_HISTORY, MISSING_DATA, BALANCE_MISMATCH, NO_BASELINE_OBSERVATIONS, UNMATCHED_PLAN, ASSUMED_FIXED_PLAN_DATES, RISK_UNAVAILABLE, ESTIMATED_PROBABILITY }

@Serializable
enum class DailyStatus { OBSERVED, ZERO_CONFIRMED, MISSING }

@Serializable
enum class Algorithm { WEEKDAY_MEAN_V1 }

@Serializable
enum class BacktestStatus { PARTIAL, COMPLETE }

@Serializable
enum class RecommendationKind { REVIEW_PLAN_DATE, REQUEST_PAYMENT, REVIEW_VARIABLE_COSTS }

@Serializable
enum class Staleness { CURRENT, STALE }

@Serializable
enum class ErrorCode { VALIDATION_FAILED, MALFORMED_REQUEST, AUTH_REQUIRED, FORBIDDEN, NOT_FOUND, CONFLICT, VERSION_CONFLICT, PRECONDITION_REQUIRED, IDEMPOTENCY_CONFLICT, IMPORT_REJECTED, IMPORT_INCOMPLETE, UNSUPPORTED_MEDIA_TYPE, PAYLOAD_TOO_LARGE, DUPLICATE_CONFLICT, INSUFFICIENT_HISTORY, BALANCE_ANCHOR_REQUIRED, UNRESOLVED_PLAN, DEPENDENCY_UNAVAILABLE, RATE_LIMITED, JOB_NOT_CANCELLABLE, ACCOUNT_ARCHIVED, ALLOCATION_EXCEEDS_AMOUNT }

@Serializable
data class FieldError(
    val field: String,
    val code: String,
    val message: String,
)

@Serializable
data class Problem(
    val type: String,
    val title: String,
    val status: Int,
    val code: ErrorCode,
    val detail: String,
    val traceId: String,
    val errors: List<FieldError>,
    val retryAfterSec: Int?,
    val resourceId: Id?,
)

@Serializable
data class PageMeta(
    val page: Int,
    val size: Int,
    val total: Int,
    val hasNext: Boolean,
)

@Serializable
data class Warning(
    val code: WarningCode,
    val message: String,
    val date: Date?,
)

@Serializable
data class Permissions(
    val canEditCompany: Boolean,
    val canManageMembers: Boolean,
    val canImport: Boolean,
    val canEditPayments: Boolean,
    val canManagePlans: Boolean,
    val canRunForecast: Boolean,
    val canRunBacktest: Boolean,
)

@Serializable
data class CapabilitiesRs(
    val apiVersion: String,
    val currency: String,
    val forecastHorizons: List<Int>,
    val riskMethods: List<RiskMethod>,
    val maxCsvBytes: Int,
    val maxImportRows: Int,
    val maxPageSize: Int,
)

@Serializable
data class CreateCompanyRq(
    val name: String,
    val legalForm: LegalForm,
    val inn: String?,
    val kpp: String?,
    val timezone: String,
)

@Serializable
data class UpdateCompanyRq(
    val name: String,
    val legalForm: LegalForm,
    val inn: String?,
    val kpp: String?,
    val timezone: String,
)

@Serializable
data class CompanyRs(
    val id: Id,
    val name: String,
    val legalForm: LegalForm,
    val inn: String?,
    val kpp: String?,
    val timezone: String,
    val ownerUserId: Id,
    val myRole: Role,
    val permissions: Permissions,
    val archived: Boolean,
    val dataVersion: Int,
    val version: Int,
    val createdAt: Instant,
    val updatedAt: Instant,
)

@Serializable
data class MemberRs(
    val userId: Id,
    val role: Role,
    val joinedAt: Instant,
    val version: Int,
)

@Serializable
data class AddMemberRq(
    val userId: Id,
    val role: String,
)

@Serializable
data class UpdateMemberRq(
    val role: String,
)

@Serializable
data class CreateAccountRq(
    val name: String,
    val bankName: String?,
    val accountNumber: String?,
    val externalCompanyId: String?,
)

@Serializable
data class UpdateAccountRq(
    val name: String,
    val bankName: String?,
    val accountNumber: String?,
    val externalCompanyId: String?,
)

@Serializable
data class AccountRs(
    val id: Id,
    val companyId: Id,
    val name: String,
    val bankName: String?,
    val accountNumber: String?,
    val externalCompanyId: String?,
    val currency: String,
    val archived: Boolean,
    val latestBalance: Money?,
    val latestBalanceDate: Date?,
    val version: Int,
)

@Serializable
data class BalanceAnchorRq(
    val date: Date,
    val balance: Money,
    val reason: String,
)

@Serializable
data class BalanceAnchorRs(
    val id: Id,
    val accountId: Id,
    val date: Date,
    val balance: Money,
    val source: String,
    val reason: String?,
    val createdAt: Instant,
)

@Serializable
data class CategoryRs(
    val code: String,
    val name: String,
    val directions: List<Direction>,
    val system: Boolean,
)

@Serializable
data class PaymentRs(
    val id: Id,
    val companyId: Id,
    val accountId: Id,
    val importId: Id,
    val externalOperationId: String?,
    val operationDate: Date,
    val amount: PositiveMoney,
    val direction: Direction,
    val counterpartyInn: String?,
    val counterpartyName: String?,
    val purpose: String?,
    val categoryCode: String,
    val categorySource: CategorySource,
    val ruleVersion: String?,
    val balanceEod: Money?,
    val allocatedAmount: Money,
    val version: Int,
    val createdAt: Instant,
)

@Serializable
data class UpdateCategoryRq(
    val categoryCode: String,
)

@Serializable
data class PaymentCategoryChange(
    val paymentId: Id,
    val expectedVersion: Int,
)

@Serializable
data class BulkCategoryRq(
    val categoryCode: String,
    val payments: List<PaymentCategoryChange>,
)

@Serializable
data class CounterpartyRs(
    val key: String,
    val inn: String?,
    val name: String?,
)

@Serializable
data class ImportIssueRs(
    val id: Id,
    val severity: IssueSeverity,
    val code: String,
    val rowNumber: Int?,
    val field: String?,
    val message: String,
)

@Serializable
data class ImportRs(
    val id: Id,
    val companyId: Id,
    val accountId: Id,
    val status: ImportStatus,
    val fileName: String,
    val fileSha256: String,
    val totalRows: Int,
    val acceptedRows: Int,
    val rejectedRows: Int,
    val duplicateRows: Int,
    val warningCount: Int,
    val fromDate: Date?,
    val toDate: Date?,
    val createdAt: Instant,
    val completedAt: Instant?,
    val dataVersion: Int?,
)

@Serializable
data class CompletenessRangeRq(
    val fromDate: Date,
    val toDate: Date,
    val completeness: Completeness,
    val reason: String,
)

@Serializable
data class CompletenessRangeRs(
    val id: Id,
    val accountId: Id,
    val fromDate: Date,
    val toDate: Date,
    val completeness: Completeness,
    val reason: String,
    val createdAt: Instant,
)

@Serializable
data class DailyActualRs(
    val date: Date,
    val inflow: Money?,
    val outflow: Money?,
    val balanceEod: Money?,
    val status: DailyStatus,
    val paymentCount: Int,
    val balanceMismatch: Boolean,
)

@Serializable
data class DataQualityRs(
    val accountId: Id,
    val fromDate: Date?,
    val toDate: Date?,
    val quality: DataQuality,
    val completeDayCount: Int,
    val missingDayCount: Int,
    val balanceMismatchCount: Int,
    val emptyPurposeCount: Int,
    val warnings: List<Warning>,
)

@Serializable
data class Schedule(
    val frequency: Frequency,
    val weekday: Int?,
    val dayOfMonth: Int?,
    val businessDayRule: BusinessDayRule,
)

@Serializable
data class RecurringPatternRs(
    val id: Id,
    val accountId: Id,
    val direction: Direction,
    val categoryCode: String,
    val counterpartyKey: String?,
    val status: PatternStatus,
    val schedule: Schedule,
    val amount: PositiveMoney,
    val observations: Int,
    val firstSeen: Date,
    val lastSeen: Date,
    val inputDataVersion: Int,
    val detectorVersion: String,
    val version: Int,
)

@Serializable
data class UpdateRecurringRq(
    val status: PatternStatus,
    val schedule: Schedule,
    val amount: PositiveMoney,
)

@Serializable
data class DetectRecurringRq(
    val accountId: Id,
    val asOfDate: Date,
)

@Serializable
data class CreateExpectedPaymentRq(
    val accountId: Id,
    val title: String,
    val direction: Direction,
    val amount: PositiveMoney,
    val dueDate: Date,
    val categoryCode: String,
    val counterpartyKey: String?,
    val note: String?,
    val relation: PlanRelation,
    val recurringPatternId: Id?,
    val baselineCounterpartyKey: String?,
)

@Serializable
data class UpdateExpectedPaymentRq(
    val accountId: Id,
    val title: String,
    val direction: Direction,
    val amount: PositiveMoney,
    val dueDate: Date,
    val categoryCode: String,
    val counterpartyKey: String?,
    val note: String?,
    val relation: PlanRelation,
    val recurringPatternId: Id?,
    val baselineCounterpartyKey: String?,
)

@Serializable
data class SourceDocument(
    val externalSystem: String,
    val externalId: String,
    val documentNumber: String?,
    val issuedDate: Date?,
)

@Serializable
data class ExpectedPaymentRs(
    val id: Id,
    val companyId: Id,
    val accountId: Id,
    val title: String,
    val direction: Direction,
    val amount: PositiveMoney,
    val dueDate: Date,
    val categoryCode: String,
    val counterpartyKey: String?,
    val note: String?,
    val relation: PlanRelation,
    val recurringPatternId: Id?,
    val baselineCounterpartyKey: String?,
    val source: PaymentSource,
    val sourceDocument: SourceDocument?,
    val status: PlanStatus,
    val settledAmount: Money,
    val remainingAmount: Money,
    val overdue: Boolean,
    val knownAt: Instant,
    val createdAt: Instant,
    val updatedAt: Instant,
    val version: Int,
)

@Serializable
data class ExternalExpectedPaymentItem(
    val accountId: Id,
    val title: String,
    val direction: Direction,
    val amount: PositiveMoney,
    val dueDate: Date,
    val categoryCode: String,
    val counterpartyKey: String?,
    val note: String?,
    val relation: PlanRelation,
    val recurringPatternId: Id?,
    val baselineCounterpartyKey: String?,
    val source: String,
    val sourceDocument: SourceDocument,
    val expectedVersion: Int?,
)

@Serializable
data class ImportExpectedPaymentsRq(
    val externalSource: ExternalSource,
    val items: List<ExternalExpectedPaymentItem>,
)

@Serializable
data class ExpectedPaymentImportRs(
    val createdCount: Int,
    val updatedCount: Int,
    val unchangedCount: Int,
    val items: List<ExpectedPaymentRs>,
)

@Serializable
data class AllocationRq(
    val paymentId: Id,
    val amount: PositiveMoney,
)

@Serializable
data class AllocationRs(
    val id: Id,
    val expectedPaymentId: Id,
    val paymentId: Id,
    val amount: PositiveMoney,
    val createdAt: Instant,
)

@Serializable
data class CancelRq(
    val reason: String,
)

@Serializable
data class ForecastSettings(
    val windowWeeks: Int,
    val horizonDays: Int,
    val bufferAmount: Money,
    val scenarioCount: Int,
    val minCalibrationOrigins: Int,
    val calibrationStepDays: Int,
    val algorithm: Algorithm,
)

@Serializable
data class SettingsRs(
    val accountId: Id,
    val forecast: ForecastSettings,
    val autoRecalculate: Boolean,
    val version: Int,
)

@Serializable
data class UpdateSettingsRq(
    val forecast: ForecastSettings,
    val autoRecalculate: Boolean,
)

@Serializable
data class CreateForecastRq(
    val accountId: Id,
    val asOfDate: Date,
    val scope: ForecastScope,
)

@Serializable
data class JobRs(
    val id: Id,
    val companyId: Id,
    val accountId: Id,
    val type: JobType,
    val status: JobStatus,
    val progress: Int,
    val resultId: Id?,
    val error: Problem?,
    val createdAt: Instant,
    val startedAt: Instant?,
    val finishedAt: Instant?,
)

@Serializable
data class RiskEstimate(
    val availability: RiskAvailability,
    val method: RiskMethod,
    val probability: Probability?,
    val scenarioCount: Int,
    val calibrationOriginCount: Int,
    val probabilityCalibrated: Boolean,
    val assumptions: List<String>,
)

@Serializable
data class ForecastDayRs(
    val date: Date,
    val plannedIn: Money,
    val plannedOut: Money,
    val recurringIn: Money,
    val recurringOut: Money,
    val residualIn: Money,
    val residualOut: Money,
    val inflow: Money,
    val outflow: Money,
    val balance: Money,
    val balanceP10: Money?,
    val balanceP50: Money?,
    val balanceP90: Money?,
    val pBelowZero: Probability?,
    val pBelowBuffer: Probability?,
)

@Serializable
data class GapEpisodeRs(
    val id: Id,
    val kind: String,
    val fromDate: Date,
    val toDate: Date,
    val threshold: Money,
    val expectedMinimumBalance: Money,
    val expectedShortfall: Money,
    val probability: Probability?,
    val shortfallP50: Money?,
    val shortfallP90: Money?,
    val shortfallBasis: String,
    val riskEstimateAvailability: RiskAvailability,
)

@Serializable
data class ForecastRs(
    val id: Id,
    val companyId: Id,
    val accountId: Id,
    val jobId: Id,
    val asOfDate: Date,
    val horizonDays: Int,
    val scope: ForecastScope,
    val algorithm: Algorithm,
    val algorithmVersion: String,
    val settings: ForecastSettings,
    val inputDataVersion: Int,
    val snapshotId: Id,
    val staleness: Staleness,
    val startBalance: Money,
    val startBalanceDate: Date,
    val quality: DataQuality,
    val warnings: List<Warning>,
    val riskEstimate: RiskEstimate,
    val expectedMinimumBalance: Money,
    val firstExpectedGapDate: Date?,
    val maxExpectedShortfall: Money,
    val days: List<ForecastDayRs>,
    val gaps: List<GapEpisodeRs>,
    val createdAt: Instant,
)

@Serializable
data class BacktestRq(
    val accountId: Id,
    val firstOrigin: Date,
    val lastOrigin: Date,
    val stepDays: Int,
    val scope: ForecastScope,
    val windowWeeks: Int,
    val evaluateRisk: Boolean,
)

@Serializable
data class HorizonMetric(
    val horizonDay: Int,
    val maeBalance: Money?,
    val rmseBalance: Money?,
    val evaluatedCount: Int,
)

@Serializable
data class GapMetrics(
    val truePositive: Int,
    val falsePositive: Int,
    val falseNegative: Int,
    val precision: Probability?,
    val recall: Probability?,
    val medianLeadDays: Double?,
    val dateMaeDays: Double?,
    val shortfallMae: Money?,
)

@Serializable
data class CalibrationBin(
    val fromProbability: Probability,
    val toProbability: Probability,
    val count: Int,
    val meanProbability: Probability?,
    val observedRate: Probability?,
)

@Serializable
data class RiskMetrics(
    val brierScore: Probability?,
    val evaluatedCount: Int,
    val calibrationBins: List<CalibrationBin>,
    val interval80Coverage: Probability?,
)

@Serializable
data class BacktestOriginRs(
    val asOfDate: Date,
    val status: String,
    val reason: String?,
    val maeBalance: Money?,
    val evaluatedDays: Int,
)

@Serializable
data class BacktestRs(
    val id: Id,
    val companyId: Id,
    val accountId: Id,
    val jobId: Id,
    val status: BacktestStatus,
    val algorithm: Algorithm,
    val algorithmVersion: String,
    val scope: ForecastScope,
    val windowWeeks: Int,
    val firstOrigin: Date,
    val lastOrigin: Date,
    val stepDays: Int,
    val snapshotId: Id,
    val inputDataVersion: Int,
    val staleness: Staleness,
    val evaluatedOrigins: Int,
    val skippedOrigins: Int,
    val evaluatedDays: Int,
    val maeBalance: Money?,
    val rmseBalance: Money?,
    val horizons: List<HorizonMetric>,
    val gapMetrics: GapMetrics,
    val riskMetrics: RiskMetrics,
    val warnings: List<Warning>,
    val createdAt: Instant,
)

@Serializable
data class RiskFactorRs(
    val kind: String,
    val title: String,
    val amount: Money?,
    val date: Date?,
    val expectedPaymentId: Id?,
    val recurringPatternId: Id?,
    val description: String,
)

@Serializable
data class RecommendationRs(
    val kind: RecommendationKind,
    val title: String,
    val description: String,
    val expectedPaymentId: Id?,
    val requiresUserAgreement: Boolean,
)

@Serializable
data class AlertRs(
    val id: Id,
    val companyId: Id,
    val accountId: Id,
    val type: AlertType,
    val title: String,
    val description: String,
    val forecastId: Id?,
    val gapId: Id?,
    val expectedPaymentId: Id?,
    val date: Date?,
    val shortfall: Money?,
    val probability: Probability?,
    val active: Boolean,
    val acknowledgedAt: Instant?,
    val version: Int,
    val createdAt: Instant,
)

@Serializable
data class GapDetailsRs(
    val forecastId: Id,
    val gap: GapEpisodeRs,
    val factors: List<RiskFactorRs>,
    val recommendations: List<RecommendationRs>,
)

@Serializable
data class DashboardRs(
    val companyId: Id,
    val accountId: Id,
    val asOfDate: Date,
    val dataVersion: Int,
    val currentBalance: BalanceAnchorRs?,
    val latestForecast: ForecastRs?,
    val latestBacktest: BacktestRs?,
    val activeAlerts: List<AlertRs>,
    val upcomingPayments: List<ExpectedPaymentRs>,
    val quality: DataQualityRs,
    val runningJobs: List<JobRs>,
    val permissions: Permissions,
)

@Serializable
data class AccessCheckRq(
    val userId: Id,
    val permission: String,
    val accountId: Id?,
)

@Serializable
data class AccessCheckRs(
    val allowed: Boolean,
    val role: Role?,
    val companyId: Id,
    val accountId: Id?,
)

@Serializable
data class ReserveImportRq(
    val accountId: Id,
    val fileName: String,
    val fileSha256: String,
    val validationMode: String,
    val completeness: Completeness,
    val declaredFromDate: Date?,
    val declaredToDate: Date?,
)

@Serializable
data class NormalizedPayment(
    val sourceRow: Int,
    val externalOperationId: String?,
    val operationDate: Date,
    val amount: PositiveMoney,
    val direction: Direction,
    val counterpartyInn: String?,
    val counterpartyName: String?,
    val purpose: String?,
    val categoryCode: String,
    val categorySource: CategorySource,
    val ruleVersion: String?,
    val balanceEod: Money?,
)

@Serializable
data class ImportBatchRq(
    val batchNumber: Int,
    val batchSha256: String,
    val rows: List<NormalizedPayment>,
    val issues: List<ImportIssueRs>,
)

@Serializable
data class ImportBatchRs(
    val importId: Id,
    val batchNumber: Int,
    val stagedRows: Int,
    val replayed: Boolean,
)

@Serializable
data class FinalizeImportRq(
    val batchCount: Int,
    val totalRows: Int,
    val rejectedRows: Int,
)

@Serializable
data class SnapshotPayment(
    val paymentId: Id,
    val date: Date,
    val amount: PositiveMoney,
    val direction: Direction,
    val categoryCode: String,
    val counterpartyKey: String?,
)

@Serializable
data class CalibrationOriginSnapshot(
    // Cutoff origin is input.asOfDate; input.asOfDate + 30 days must not exceed the outer snapshot asOfDate.
    val input: ForecastSnapshot,
    // Exactly 30 complete days after the origin cutoff. Scoring only, never model features.
    val actualDays: List<DailyActualRs>,
    // Payments from the same 30 scoring days. Scoring only, never model features.
    val actualPayments: List<SnapshotPayment>,
)

@Serializable
data class ForecastSnapshot(
    val snapshotId: Id,
    val companyId: Id,
    val accountId: Id,
    val asOfDate: Date,
    val inputDataVersion: Int,
    val algorithmVersion: String,
    val settings: ForecastSettings,
    val scope: ForecastScope,
    val startBalance: Money,
    val startBalanceDate: Date,
    val historyFrom: Date,
    val dailyHistory: List<DailyActualRs>,
    val payments: List<SnapshotPayment>,
    val knownPlans: List<ExpectedPaymentRs>,
    val recurringPatterns: List<RecurringPatternRs>,
    val completeRanges: List<CompletenessRangeRs>,
    // Mature historical origins; every nested input must have an empty calibrationOrigins list.
    val calibrationOrigins: List<CalibrationOriginSnapshot>,
    val fingerprint: String,
)

@Serializable
data class BacktestSnapshot(
    val snapshotId: Id,
    val companyId: Id,
    val accountId: Id,
    val inputDataVersion: Int,
    val request: BacktestRq,
    val settings: ForecastSettings,
    val originSnapshots: List<ForecastSnapshot>,
    val actualDays: List<DailyActualRs>,
)

@Serializable
data class RecurringDetectionInput(
    val accountId: Id,
    val asOfDate: Date,
    val inputDataVersion: Int,
    val payments: List<SnapshotPayment>,
)

@Serializable
data class RecurringDetectionResult(
    val detectorVersion: String,
    val patterns: List<RecurringPatternRs>,
)

@Serializable
data class CompanyPageRs(
    val items: List<CompanyRs>,
    val page: PageMeta,
)

@Serializable
data class MemberPageRs(
    val items: List<MemberRs>,
    val page: PageMeta,
)

@Serializable
data class AccountPageRs(
    val items: List<AccountRs>,
    val page: PageMeta,
)

@Serializable
data class PaymentPageRs(
    val items: List<PaymentRs>,
    val page: PageMeta,
)

@Serializable
data class CounterpartyPageRs(
    val items: List<CounterpartyRs>,
    val page: PageMeta,
)

@Serializable
data class ImportPageRs(
    val items: List<ImportRs>,
    val page: PageMeta,
)

@Serializable
data class ImportIssuePageRs(
    val items: List<ImportIssueRs>,
    val page: PageMeta,
)

@Serializable
data class ExpectedPaymentPageRs(
    val items: List<ExpectedPaymentRs>,
    val page: PageMeta,
)

@Serializable
data class AllocationPageRs(
    val items: List<AllocationRs>,
    val page: PageMeta,
)

@Serializable
data class ForecastPageRs(
    val items: List<ForecastRs>,
    val page: PageMeta,
)

@Serializable
data class BacktestPageRs(
    val items: List<BacktestRs>,
    val page: PageMeta,
)

@Serializable
data class BacktestOriginPageRs(
    val items: List<BacktestOriginRs>,
    val page: PageMeta,
)

@Serializable
data class AlertPageRs(
    val items: List<AlertRs>,
    val page: PageMeta,
)

@Serializable
data class RecurringPatternPageRs(
    val items: List<RecurringPatternRs>,
    val page: PageMeta,
)

@Serializable
data class CompletenessRangePageRs(
    val items: List<CompletenessRangeRs>,
    val page: PageMeta,
)

@Serializable
data class JobPageRs(
    val items: List<JobRs>,
    val page: PageMeta,
)

@Serializable
data class CategoryListRs(
    val items: List<CategoryRs>,
)

@Serializable
data class DailyActualListRs(
    val items: List<DailyActualRs>,
)

@Serializable
data class ChangedPaymentsRs(
    val items: List<PaymentRs>,
)

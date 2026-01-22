/**
 * LangChain Tools Index
 *
 * Exporta todas as tools disponíveis para o LangChain Agent.
 */

export {
  createListProjectsTool,
  createListProjectsToolWithContext,
  listProjectsWithCache,
  type ListProjectsInput,
  type ListProjectsResult,
} from "./list-projects.tool.js";

export {
  createGetTestCasesTool,
  createGetTestCasesToolWithContext,
  getTestCasesWithCache,
  type GetTestCasesInput,
  type GetTestCasesResult,
} from "./get-test-cases.tool.js";

export {
  createGetTestRunsTool,
  createGetTestRunsToolWithContext,
  getTestRunsWithCache,
  type GetTestRunsInput,
  type GetTestRunsResult,
  type TestRunResult,
} from "./get-test-runs.tool.js";

export {
  createGetRunResultsTool,
  createGetRunResultsToolWithContext,
  getRunResultsWithCache,
  type GetRunResultsInput,
  type GetRunResultsResult,
  type TestResultItem,
  type ResultsByStatus,
} from "./get-run-results.tool.js";

export {
  createGenerateChartTool,
  generateChart,
  type GenerateChartInput,
  type GenerateChartResult,
  type ChartConfig,
  type ChartType,
  type BarChartLayout,
  type BarStackMode,
} from "./generate-chart.tool.js";

// ===========================
// Invoice Tools
// ===========================

export {
  createGetInvoiceSummaryTool,
  createGetInvoiceSummaryToolWithContext,
  getInvoiceSummaryWithCache,
  type GetInvoiceSummaryInput,
  type GetInvoiceSummaryResult,
} from "./get-invoice-summary.tool.js";

export {
  createListInvoiceSeriesTool,
  createListInvoiceSeriesToolWithContext,
  listInvoiceSeriesWithCache,
  type ListInvoiceSeriesInput,
  type ListInvoiceSeriesResult,
} from "./list-invoice-series.tool.js";

export {
  createGetInvoiceDetailsTool,
  createGetInvoiceDetailsToolWithContext,
  getInvoiceDetailsWithCache,
  type GetInvoiceDetailsInput,
  type GetInvoiceDetailsResult,
} from "./get-invoice-details.tool.js";

export {
  createGetTaxBreakdownTool,
  createGetTaxBreakdownToolWithContext,
  getTaxBreakdownWithCache,
  type GetTaxBreakdownInput,
  type GetTaxBreakdownResult,
} from "./get-tax-breakdown.tool.js";

export {
  createSearchInvoicesTool,
  createSearchInvoicesToolWithContext,
  searchInvoicesWithCache,
  type SearchInvoicesInput,
  type SearchInvoicesResult,
} from "./search-invoices.tool.js";

export {
  createGetInvoiceEventsTool,
  createGetInvoiceEventsToolWithContext,
  getInvoiceEventsWithCache,
  type GetInvoiceEventsInput,
  type GetInvoiceEventsResult,
} from "./get-invoice-events.tool.js";

export {
  createGetInvoiceErrorsTool,
  createGetInvoiceErrorsToolWithContext,
  getInvoiceErrorsWithCache,
  type GetInvoiceErrorsInput,
  type GetInvoiceErrorsResult,
} from "./get-invoice-errors.tool.js";

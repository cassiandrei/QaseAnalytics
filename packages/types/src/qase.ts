/**
 * Qase.io API Types
 */

export interface QaseProject {
  code: string;
  name: string;
  description?: string;
  counts: {
    cases: number;
    suites: number;
    runs: number;
  };
}

export interface QaseTestCase {
  id: number;
  title: string;
  description?: string;
  status: "actual" | "draft" | "deprecated";
  priority: "low" | "medium" | "high" | "critical";
  automation: "manual" | "automated" | "to-be-automated";
  suiteId?: number;
  tags?: string[];
}

export interface QaseTestRun {
  id: number;
  title: string;
  description?: string;
  status: "active" | "complete" | "abort";
  environment?: string;
  stats: {
    total: number;
    passed: number;
    failed: number;
    blocked: number;
    skipped: number;
    retest: number;
    untested: number;
  };
  startedAt?: string;
  completedAt?: string;
}

export interface QaseTestResult {
  id: string;
  caseId: number;
  caseTitle: string;
  status: "passed" | "failed" | "blocked" | "skipped" | "retest";
  duration?: number;
  comment?: string;
  stacktrace?: string;
  attachments?: string[];
}

export interface QaseDefect {
  id: number;
  title: string;
  status: "open" | "resolved" | "closed" | "in_progress";
  severity: "blocker" | "critical" | "major" | "normal" | "minor" | "trivial";
  externalIssueUrl?: string;
  createdAt: string;
  resolvedAt?: string;
}

export interface QaseSuite {
  id: number;
  title: string;
  description?: string;
  parentId?: number;
  casesCount: number;
}

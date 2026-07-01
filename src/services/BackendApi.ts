import {ENV} from '../config/env';
import type {AiAnalysisPayload, ReportPayload} from './ReportPayloadService';

type ApiEnvelope<T> = {
  status_code: number;
  response_code: string;
  response_message: string;
  error: boolean;
  error_message: string;
  data: T;
};

export type ExportReportResult = {
  filename: string;
  format: string;
  message: string;
  sentTo: string[];
};

export type AiAnalysisResult = {
  model?: string;
  title: string;
  description: string;
  financialScore: {
    score: number;
    maxScore: number;
    label: string;
    description: string;
    percentage: number;
  };
  summaryCards: {
    income: AiSummaryCard;
    expense: AiSummaryCard;
    net: AiSummaryCard;
  };
  keyFindings: AiFinding[];
  recommendedActions: AiAction[];
  potentialSaving?: {
    amount: number;
    currency: string;
    text: string;
    description: string;
  };
  done?: boolean;
};

export type AiSummaryCard = {
  label: string;
  amount: number;
  currency: string;
  text: string;
};

export type AiFinding = {
  title: string;
  description: string;
  category?: string;
  amount?: number;
  priority?: 'low' | 'medium' | 'high' | string;
};

export type AiAction = AiFinding;

export async function exportTransactions(payload: ReportPayload): Promise<ExportReportResult> {
  const response = await postJson<ApiEnvelope<ExportReportResult>>(
    '/api/v1/transactions/export',
    payload,
  );
  return response.data;
}

export async function analyzeFinance(payload: AiAnalysisPayload): Promise<AiAnalysisResult> {
  const response = await postJson<ApiEnvelope<AiAnalysisResult>>(
    '/api/v1/analisis-ai',
    payload,
  );
  return response.data;
}

async function postJson<T>(path: string, body: unknown): Promise<T> {
  const response = await fetch(`${ENV.API_BASE_URL}${path}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  });
  const json = await response.json();
  if (!response.ok || json?.error) {
    throw new Error(json?.error_message || json?.response_message || `HTTP ${response.status}`);
  }
  return json as T;
}

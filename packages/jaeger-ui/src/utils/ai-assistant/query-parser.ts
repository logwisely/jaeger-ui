// Copyright (c) 2025 The Jaeger Authors.
// SPDX-License-Identifier: Apache-2.0

import { queryLLM, ILLMClientConfig, ILLMResponse } from './llm-client';

export interface IParsedQuery {
  service?: string;
  operation?: string;
  minDuration?: string;
  maxDuration?: string;
  tags?: Record<string, string>;
  status?: 'error' | 'success' | 'all';
  natural_language_question: string;
}

// System prompt for the LLM to parse natural language queries
const SYSTEM_PROMPT = `You are a Jaeger distributed tracing query assistant. 
Your job is to convert natural language questions into search filter parameters for Jaeger traces.

Guidelines:
1. Extract the service name from the question (it may be prefixed with "service:", "app:", or just mentioned naturally)
2. Extract operation/span name if mentioned (look for "operation:", "span:", "request:", "endpoint:", etc.)
3. Extract duration constraints (look for patterns like "slower than", "faster than", "taking more than", "less than", etc.)
4. Extract tag filters if applicable (e.g., "error code 500", "status=error")
5. Infer if the user is looking for errors, successes, or all traces
6. If information is incomplete, make reasonable assumptions and note them

Always respond in valid JSON format with the following structure (even if some fields are empty):
{
  "service": "service-name-or-empty-string",
  "operation": "operation-name-or-empty-string",
  "minDuration": "duration-like-100ms-or-empty-string",
  "maxDuration": "duration-like-5s-or-empty-string",
  "tags": {},
  "status": "error|success|all",
  "reasoning": "Explanation of what was extracted and any assumptions made"
}

Examples:
Question: "Show me slow requests to the user service"
Response: {"service": "user", "operation": "", "minDuration": "500ms", "maxDuration": "", "tags": {}, "status": "all", "reasoning": "Selected user service. Set 500ms minimum to find slow requests."}

Question: "Find errors in payment processing"
Response: {"service": "payment", "operation": "", "minDuration": "", "maxDuration": "", "tags": {"http.status_code": "5xx"}, "status": "error", "reasoning": "Selected payment service, set status filter to errors."}`;

export async function parseNaturalLanguageQuery(
  question: string,
  llmConfig: ILLMClientConfig
): Promise<{ parsed: IParsedQuery; llmResponse: ILLMResponse }> {
  const prompt = `${SYSTEM_PROMPT}

Now parse this question: "${question}"`;

  const llmResponse = await queryLLM(llmConfig, prompt);

  try {
    // Extract JSON from the response (it might be wrapped in markdown code blocks)
    let jsonContent = llmResponse.content;
    const jsonMatch = jsonContent.match(/```json\n?([\s\S]*?)\n?```/);
    if (jsonMatch) {
      jsonContent = jsonMatch[1];
    } else {
      // Try to find plain JSON object
      const plainMatch = jsonContent.match(/\{[\s\S]*\}/);
      if (plainMatch) {
        jsonContent = plainMatch[0];
      }
    }

    const parsed = JSON.parse(jsonContent) as Record<string, unknown>;

    // Normalize the response
    const service = typeof parsed.service === 'string' ? parsed.service : undefined;
    const operation = typeof parsed.operation === 'string' ? parsed.operation : undefined;
    const minDuration = typeof parsed.minDuration === 'string' ? parsed.minDuration : undefined;
    const maxDuration = typeof parsed.maxDuration === 'string' ? parsed.maxDuration : undefined;
    const tags =
      parsed.tags && typeof parsed.tags === 'object' && Object.keys(parsed.tags).length > 0
        ? (parsed.tags as Record<string, string>)
        : undefined;
    const status = (parsed.status as 'error' | 'success' | 'all' | undefined) || 'all';

    const result: IParsedQuery = {
      natural_language_question: question,
      service: service && service !== '' ? service : undefined,
      operation: operation && operation !== '' ? operation : undefined,
      minDuration: minDuration && minDuration !== '' ? minDuration : undefined,
      maxDuration: maxDuration && maxDuration !== '' ? maxDuration : undefined,
      tags,
      status,
    };

    return { parsed: result, llmResponse };
  } catch (error) {
    throw new Error(
      `Failed to parse LLM response as JSON: ${error instanceof Error ? error.message : String(error)}`
    );
  }
}

// Convert parsed query to Jaeger search form format
export function convertParsedQueryToSearchFilters(parsed: IParsedQuery): Record<string, string> {
  const filters: Record<string, string> = {};

  if (parsed.service) {
    filters.service = parsed.service;
  }

  if (parsed.operation) {
    filters.operation = parsed.operation;
  }

  if (parsed.minDuration) {
    filters.minDuration = parsed.minDuration;
  }

  if (parsed.maxDuration) {
    filters.maxDuration = parsed.maxDuration;
  }

  // Convert tags to logfmt format
  if (parsed.tags && Object.keys(parsed.tags).length > 0) {
    const tagStrings: string[] = [];
    Object.entries(parsed.tags).forEach(([key, value]) => {
      tagStrings.push(`${key}="${value}"`);
    });
    filters.tags = tagStrings.join(' ');
  }

  // Handle status filter - convert to tags if needed
  if (parsed.status === 'error') {
    const existingTags = filters.tags || '';
    filters.tags = existingTags ? `${existingTags} otel.status_code="ERROR"` : 'otel.status_code="ERROR"';
  } else if (parsed.status === 'success') {
    const existingTags = filters.tags || '';
    filters.tags = existingTags ? `${existingTags} otel.status_code="OK"` : 'otel.status_code="OK"';
  }

  return filters;
}

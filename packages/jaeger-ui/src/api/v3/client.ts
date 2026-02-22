// Copyright (c) 2026 The Jaeger Authors.
// SPDX-License-Identifier: Apache-2.0

/**
 * Jaeger API v3 Client
 *
 * This client interacts with the Jaeger backend's /api/v3/ endpoints
 * and returns native OTLP data structures.
 */

import {
  AttributeNamesResponseSchema,
  AttributeValuesResponseSchema,
  OperationsResponseSchema,
  ServicesResponseSchema,
} from './schemas';

export type AttributeSuggestionQuery = {
  serviceName: string;
  spanName?: string;
  startTimeMin: string;
  startTimeMax: string;
  durationMin?: string;
  durationMax?: string;
  attributes?: Record<string, string>;
};

export class JaegerClient {
  private apiRoot = '/api/v3';

  private buildFindTracesQueryParams(query: AttributeSuggestionQuery): URLSearchParams {
    const params = new URLSearchParams();
    params.set('query.service_name', query.serviceName);
    if (query.spanName) {
      params.set('query.operation_name', query.spanName);
    }
    params.set('query.start_time_min', query.startTimeMin);
    params.set('query.start_time_max', query.startTimeMax);
    if (query.durationMin) {
      params.set('query.duration_min', query.durationMin);
    }
    if (query.durationMax) {
      params.set('query.duration_max', query.durationMax);
    }
    if (query.attributes && Object.keys(query.attributes).length > 0) {
      params.set('query.attributes', JSON.stringify(query.attributes));
    }
    return params;
  }

  /**
   * Fetch the list of services from the Jaeger API.
   * @returns Promise<string[]> - Array of service names
   */
  async fetchServices(): Promise<string[]> {
    const response = await this.fetchWithTimeout(`${this.apiRoot}/services`);
    if (!response.ok) {
      throw new Error(`Failed to fetch services: ${response.status} ${response.statusText}`);
    }
    const data = await response.json();

    // Runtime validation with Zod
    const validated = ServicesResponseSchema.parse(data);
    return validated.services;
  }

  /**
   * Fetch the list of span names (operations) for a given service.
   * @param service - The service name
   * @returns Promise<{ name: string; spanKind: string }[]> - Array of span name objects
   */
  async fetchSpanNames(service: string): Promise<{ name: string; spanKind: string }[]> {
    const response = await this.fetchWithTimeout(
      `${this.apiRoot}/operations?service=${encodeURIComponent(service)}`
    );
    if (!response.ok) {
      throw new Error(
        `Failed to fetch span names for service "${service}": ${response.status} ${response.statusText}`
      );
    }
    const data = await response.json();

    // Runtime validation with Zod
    const validated = OperationsResponseSchema.parse(data);
    return validated.operations;
  }

  async fetchAttributeNames(query: AttributeSuggestionQuery, limit = 100): Promise<string[]> {
    const params = this.buildFindTracesQueryParams(query);
    params.set('limit', String(limit));
    const response = await this.fetchWithTimeout(`${this.apiRoot}/attributes/names?${params.toString()}`);
    if (!response.ok) {
      throw new Error(`Failed to fetch attribute names: ${response.status} ${response.statusText}`);
    }
    const data = await response.json();
    const validated = AttributeNamesResponseSchema.parse(data);
    return validated.names;
  }

  async fetchTopKAttributeValues(
    query: AttributeSuggestionQuery,
    attributeName: string,
    k = 10
  ): Promise<string[]> {
    const params = this.buildFindTracesQueryParams(query);
    params.set('attribute_name', attributeName);
    params.set('k', String(k));
    const response = await this.fetchWithTimeout(
      `${this.apiRoot}/attributes/values/topk?${params.toString()}`
    );
    if (!response.ok) {
      throw new Error(`Failed to fetch top-K values: ${response.status} ${response.statusText}`);
    }
    const data = await response.json();
    const validated = AttributeValuesResponseSchema.parse(data);
    return validated.values;
  }

  async fetchBottomKAttributeValues(
    query: AttributeSuggestionQuery,
    attributeName: string,
    k = 10
  ): Promise<string[]> {
    const params = this.buildFindTracesQueryParams(query);
    params.set('attribute_name', attributeName);
    params.set('k', String(k));
    const response = await this.fetchWithTimeout(
      `${this.apiRoot}/attributes/values/bottomk?${params.toString()}`
    );
    if (!response.ok) {
      throw new Error(`Failed to fetch bottom-K values: ${response.status} ${response.statusText}`);
    }
    const data = await response.json();
    const validated = AttributeValuesResponseSchema.parse(data);
    return validated.values;
  }

  /**
   * Fetch with timeout support using AbortController.
   * @param url - The URL to fetch
   * @param timeout - Timeout in milliseconds (default: 10 seconds)
   * @returns Promise<Response>
   * @throws Error if request times out or network error occurs
   */
  private async fetchWithTimeout(url: string, timeout = 10000): Promise<Response> {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeout);

    try {
      const response = await fetch(url, { signal: controller.signal });
      return response;
    } catch (error) {
      if (error instanceof Error && error.name === 'AbortError') {
        throw new Error(`Request timeout after ${timeout}ms`);
      }
      throw error;
    } finally {
      clearTimeout(timeoutId);
    }
  }
}

// Export a singleton instance
export const jaegerClient = new JaegerClient();

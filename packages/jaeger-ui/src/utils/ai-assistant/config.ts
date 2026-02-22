// Copyright (c) 2025 The Jaeger Authors.
// SPDX-License-Identifier: Apache-2.0

/**
 * AI Assistant Configuration Guide
 *
 * The Jaeger UI now includes an AI Assistant feature in the Search tab that allows you to:
 * 1. Ask natural language questions about your traces
 * 2. Automatically convert questions to search filters
 * 3. Execute trace searches with AI-generated parameters
 *
 * Two LLM options are available:
 *
 * 1. OLLAMA (Recommended for Privacy)
 *    - Free, open-source, runs locally on your machine
 *    - No API keys required
 *    - No data leaves your system
 *    - Installation: https://ollama.ai
 *    - Supported Models: llama2, mistral, neural-chat, etc.
 *    - Default URL: http://localhost:11434
 *
 * 2. OPENAI CHATGPT (For Better Results)
 *    - Requires OpenAI API key
 *    - Supports GPT-3.5 and GPT-4
 *    - Better performance but costs money
 *    - Get API key: https://platform.openai.com/api-keys
 *
 * Configuration:
 *    - All settings are stored locally in your browser's localStorage
 *    - Click the ⚙️ button in the AI Assistant tab to configure
 *    - Settings are never sent to external servers (except when using OpenAI)
 *
 * Usage Examples:
 *    - "Show me slow requests to the user service"
 *    - "Find errors in payment processing"
 *    - "What API calls took more than 5 seconds?"
 *    - "Show me all database operations for the order service"
 *    - "Find traces with status code 500"
 *
 * How it works:
 *    1. You ask a question
 *    2. An LLM parses your question into search parameters
 *    3. The parameters are used to filter traces
 *    4. Results are displayed in the main search results area
 *
 */

export const AI_AGENT_CONFIG = {
  // Default Ollama configuration
  OLLAMA: {
    name: 'Ollama (Free, Local)',
    defaultUrl: 'http://localhost:11434',
    defaultModel: 'llama2',
    documentation: 'https://ollama.ai',
  },

  // OpenAI configuration
  OPENAI: {
    name: 'OpenAI ChatGPT',
    apiUrl: 'https://api.openai.com/v1',
    getApiKeyUrl: 'https://platform.openai.com/api-keys',
    models: {
      gpt35: { name: 'GPT-3.5 Turbo', value: 'openai-gpt3.5' },
      gpt4: { name: 'GPT-4', value: 'openai-gpt4' },
    },
  },

  // Storage keys
  STORAGE_KEYS: {
    OPENAI_KEY: 'jaeger-ai-openai-key',
    OLLAMA_URL: 'jaeger-ai-ollama-url',
    QUERY_HISTORY: 'jaeger-ai-history',
  },

  // Default lookback for searches
  DEFAULT_LOOKBACK: '1h',

  // Default results limit
  DEFAULT_LIMIT: 20,

  // LLM prompt configuration
  SYSTEM_PROMPT_VERSION: 1,
};

export default AI_AGENT_CONFIG;

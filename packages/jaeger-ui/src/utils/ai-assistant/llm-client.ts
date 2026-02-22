// Copyright (c) 2025 The Jaeger Authors.
// SPDX-License-Identifier: Apache-2.0

export type LLMModel = 'openai-gpt4' | 'openai-gpt3.5' | 'ollama-free';

export interface ILLMResponse {
  content: string;
  model: LLMModel;
}

export interface ILLMClientConfig {
  model: LLMModel;
  apiKey?: string;
  baseURL?: string;
}

// OpenAI client for ChatGPT models
class OpenAIClient {
  private apiKey: string;
  private model: string;
  private baseURL: string = 'https://api.openai.com/v1';

  constructor(apiKey: string, model: 'gpt-4' | 'gpt-3.5-turbo' = 'gpt-3.5-turbo') {
    this.apiKey = apiKey;
    this.model = model;
  }

  async query(prompt: string): Promise<string> {
    const response = await fetch(`${this.baseURL}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${this.apiKey}`,
      },
      body: JSON.stringify({
        model: this.model,
        messages: [
          {
            role: 'user',
            content: prompt,
          },
        ],
        temperature: 0.7,
        max_tokens: 500,
      }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(`OpenAI API error: ${error.error?.message || response.statusText}`);
    }

    const data = await response.json();
    return data.choices[0]?.message?.content || '';
  }
}

// Ollama client for free local SLM models
class OllamaClient {
  private baseURL: string = 'http://localhost:11434';
  private model: string = 'llama2'; // Default model, can be customized

  constructor(baseURL?: string, model?: string) {
    if (baseURL) {
      this.baseURL = baseURL;
    }
    if (model) {
      this.model = model;
    }
  }

  async query(prompt: string): Promise<string> {
    try {
      const response = await fetch(`${this.baseURL}/api/generate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: this.model,
          prompt: prompt,
          stream: false,
          temperature: 0.7,
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        let errorMsg = response.statusText;
        try {
          const errorData = JSON.parse(errorText);
          if (errorData.error) {
            errorMsg = errorData.error;
          }
        } catch (e) {
          // Keep the statusText if JSON parsing fails
        }
        throw new Error(`Ollama API error: ${errorMsg}`);
      }

      const data = await response.json();
      return data.response || '';
    } catch (err) {
      // If Ollama is not running or model not found, throw a helpful error
      if (err instanceof Error) {
        if (err.message.includes('model') && err.message.includes('not found')) {
          throw new Error(
            `Ollama model '${this.model}' not found. Install it with: ollama pull ${this.model}`
          );
        }
        throw err;
      }
      throw new Error(
        `Unable to connect to Ollama at ${this.baseURL}. Make sure Ollama is running on the correct port.`
      );
    }
  }
}

export async function queryLLM(config: ILLMClientConfig, prompt: string): Promise<ILLMResponse> {
  let content: string;

  if (config.model === 'openai-gpt4' || config.model === 'openai-gpt3.5') {
    if (!config.apiKey) {
      throw new Error('OpenAI API key is required');
    }
    const openaiModel = config.model === 'openai-gpt4' ? 'gpt-4' : 'gpt-3.5-turbo';
    const client = new OpenAIClient(config.apiKey, openaiModel);
    content = await client.query(prompt);
  } else if (config.model === 'ollama-free') {
    const client = new OllamaClient(config.baseURL);
    content = await client.query(prompt);
  } else {
    throw new Error(`Unknown model: ${config.model}`);
  }

  return {
    content,
    model: config.model,
  };
}

export { OpenAIClient, OllamaClient };

# AI Assistant for Jaeger Trace Search

## Overview

The Jaeger UI now includes an AI Assistant feature that uses Large Language Models (LLMs) to convert natural language questions about traces into structured Jaeger search queries.

## Supported LLM Models

### 1. Ollama (Free, Local, Recommended for Privacy)

- **Cost:** Free
- **Privacy:** Complete - data never leaves your system
- **Setup:** Install Ollama from https://ollama.ai
- **Configuration:** No API key needed, just provide the Ollama URL (default: http://localhost:11434)
- **Supported Models:** llama2, mistral, neural-chat, dolphin, etc.
- **Best For:** Development, internal deployments, privacy-sensitive environments

### 2. OpenAI ChatGPT (Paid, Remote)

- **Cost:** Varies by model (GPT-3.5 Turbo is cheaper, GPT-4 is more capable)
- **Privacy:** Data sent to OpenAI API
- **Setup:** Get API key from https://platform.openai.com/api-keys
- **Models:**
  - GPT-3.5 Turbo: Fast, cheaper, good for most queries
  - GPT-4: More accurate, better reasoning, higher cost
- **Best For:** Production, high accuracy requirements

## Quick Start

### Using Ollama (Free & Private)

1. Install Ollama from https://ollama.ai
2. Start Ollama service
3. Download a model:
   ```bash
   ollama pull llama2  # or mistral, neural-chat
   ```
4. In Jaeger UI, go to Search → AI Assistant tab
5. Click settings (⚙️) and enter Ollama URL
6. Ask your question!

**Example Questions:**

- "Show me slow requests to the user service"
- "Find errors in payment processing"
- "What API calls took more than 5 seconds?"
- "Show me all database operations for the order service"

### Using OpenAI ChatGPT (Paid)

1. Create account and get API key: https://platform.openai.com/api-keys
2. In Jaeger UI, go to Search → AI Assistant tab
3. Click settings (⚙️) and paste your API key
4. Select GPT-3.5 Turbo or GPT-4
5. Ask your question!

## Feature Architecture

```
User Question
    ↓
AIAssistantSearch Component
    ↓
LLM Client (OpenAI / Ollama)
    ↓
Query Parser (Converts LLM output to search filters)
    ↓
Jaeger Search Filters
    ↓
Trace Results
```

## Component Structure

### Main Files

- **llm-client.ts** - LLM API clients for OpenAI and Ollama
- **query-parser.ts** - Natural language parsing and filter conversion
- **config.ts** - Configuration constants
- **index.ts** - Public API exports
- **AIAssistantSearch.tsx** - React component for the UI
- **AIAssistantSearch.css** - Component styling

## Usage Examples

### Example 1: Finding Slow Services

**Question:** "Show me slow requests to the user service" **Generated Filters:**

- Service: user
- Min Duration: 500ms

### Example 2: Finding Errors

**Question:** "Find traces with error status code 500 in the payment service" **Generated Filters:**

- Service: payment
- Status: error
- Tags: http.status_code="500"

### Example 3: Database Operations

**Question:** "Show me all database operations taking longer than 2 seconds" **Generated Filters:**

- Min Duration: 2s

## Security Considerations

### Ollama (Recommended for Privacy)

- ✅ No external API calls
- ✅ Data stays on your machine
- ✅ Best for sensitive environments
- Local GPU recommended for performance

### OpenAI

- ⚠️ Queries sent to OpenAI servers
- ✅ Standard API key authentication
- ⚠️ API keys stored in localStorage
- Check OpenAI's privacy policy

## Troubleshooting

### "Unable to connect to Ollama"

- Ensure Ollama is running: `ollama serve`
- Check the base URL in settings
- Try: `curl http://localhost:11434`
- Verify model is installed: `ollama list`

### "Invalid OpenAI API key"

- Verify key from https://platform.openai.com/api-keys
- Key should start with `sk-`
- Account needs API credits

### "Poor query results"

- Be more specific in your question
- Try rephrasing
- With Ollama, try a different model
- Use GPT-4 for better accuracy

## Performance Comparison

| Model            | Speed  | Accuracy  | Cost | Privacy   |
| ---------------- | ------ | --------- | ---- | --------- |
| Ollama (llama2)  | Medium | Good      | Free | Excellent |
| Ollama (mistral) | Fast   | Good      | Free | Excellent |
| ChatGPT 3.5      | Fast   | Very Good | $    | Fair      |
| ChatGPT 4        | Slower | Excellent | $$   | Fair      |

## API Reference

### ILLMClientConfig

```typescript
interface ILLMClientConfig {
  model: 'openai-gpt4' | 'openai-gpt3.5' | 'ollama-free';
  apiKey?: string; // Required for OpenAI
  baseURL?: string; // Ollama URL if custom
}
```

### IParsedQuery

```typescript
interface IParsedQuery {
  service?: string;
  operation?: string;
  minDuration?: string;
  maxDuration?: string;
  tags?: Record<string, string>;
  status?: 'error' | 'success' | 'all';
  natural_language_question: string;
}
```

### Functions

```typescript
// Query an LLM
async function queryLLM(config: ILLMClientConfig, prompt: string): Promise<ILLMResponse>;

// Parse natural language to structured query
async function parseNaturalLanguageQuery(
  question: string,
  llmConfig: ILLMClientConfig
): Promise<{ parsed: IParsedQuery; llmResponse: ILLMResponse }>;

// Convert parsed query to search filters
function convertParsedQueryToSearchFilters(parsed: IParsedQuery): Record<string, string>;
```

## Future Enhancements

- [ ] Support for more LLM providers
- [ ] Streaming responses
- [ ] Multi-turn conversations
- [ ] Query refinement suggestions
- [ ] Integration with trace analysis
- [ ] Custom model fine-tuning
- [ ] Export/share saved queries

This module provides AI-powered natural language query support for Jaeger trace searches.

## Components

### 1. **llm-client.ts** - LLM Client Implementation

Interfaces with Language Models to process queries:

- **OpenAI ChatGPT**: GPT-3.5 and GPT-4 models (requires API key)
- **Ollama**: Free, open-source local models (self-hosted)

### 2. **query-parser.ts** - Natural Language to Filter Conversion

Converts natural language questions to structured search filters:

- Service extraction
- Operation/Endpoint identification
- Duration constraints parsing
- Error status detection
- Tag-based filtering

### 3. **config.ts** - Configuration and Constants

Centralized configuration for LLM models and local storage keys

### 4. **index.ts** - Public API Export

Exports all public functions and types

## Usage Example

```typescript
import { parseNaturalLanguageQuery, convertParsedQueryToSearchFilters } from './llm-client';

const llmConfig = {
  model: 'openai-gpt3.5',
  apiKey: 'sk-...',
};

const { parsed } = await parseNaturalLanguageQuery('Show me slow requests to the user service', llmConfig);

const filters = convertParsedQueryToSearchFilters(parsed);
// Output: { service: 'user', minDuration: '500ms' }
```

## Supported LLM Models

### Ollama (Recommended)

- **Cost**: Free
- **Privacy**: 100% local, no data leaves your system
- **Setup**: Download from https://ollama.ai
- **Default URL**: http://localhost:11434
- **Recommended models**: llama2, mistral, neural-chat

### OpenAI ChatGPT

- **Cost**: Pay-per-use (typically $0.0005-0.03 per query)
- **Privacy**: Queries sent to OpenAI servers
- **Setup**: Get API key from https://platform.openai.com/api-keys
- **Models**: GPT-3.5 (faster, cheaper) or GPT-4 (better results)

## Configuration

All settings are stored in browser localStorage:

- `jaeger-ai-openai-key`: OpenAI API key
- `jaeger-ai-ollama-url`: Ollama server URL
- `jaeger-ai-history`: Recent query history

Users can configure settings via the UI settings modal in the AI Assistant tab.

## Supported Query Examples

- "Show me slow requests to the user service"
- "Find errors in payment processing"
- "What API calls took more than 5 seconds?"
- "Show me all database operations for the order service"
- "Find traces with status code 500"
- "Which services had the most errors in the last hour?"
- "Show me traces from the gateway service that were rejected"

## Error Handling

The module includes comprehensive error handling for:

- Network errors
- Invalid LLM responses
- Missing API keys
- Unavailable services (Ollama not running, OpenAI API down)
- Malformed JSON responses from LLM

## Testing

The module is designed to be easily testable:

- Pure functions for query parsing
- Mocked LLM clients for unit testing
- Type-safe interfaces for all data structures

## Future Enhancements

- Support for more LLM models (Claude, Llama 2, etc.)
- Caching of frequently asked questions
- Multi-language support
- Custom prompt templates
- Advanced filtering options
- Trace correlation suggestions

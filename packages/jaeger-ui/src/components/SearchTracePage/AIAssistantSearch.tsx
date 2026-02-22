// Copyright (c) 2025 The Jaeger Authors.
// SPDX-License-Identifier: Apache-2.0

import React, { useState, useCallback } from 'react';
import { Button, Input, Form, Select, message, Card, Divider, Tooltip, Collapse, Modal } from 'antd';
import { LoadingOutlined, SearchOutlined, ClearOutlined, SettingOutlined } from '@ant-design/icons';
import { Dispatch } from 'redux';
import { bindActionCreators } from 'redux';
import { connect, ConnectedProps } from 'react-redux';

import * as jaegerApiActions from '../../actions/jaeger-api';
import {
  parseNaturalLanguageQuery,
  convertParsedQueryToSearchFilters,
} from '../../utils/ai-assistant/query-parser';
import { LLMModel } from '../../utils/ai-assistant/llm-client';
import { lookbackToTimestamp } from './SearchForm';
import { ReduxState } from '../../types';
import { fetchedState } from '../../constants';
import dayjs from 'dayjs';

import './AIAssistantSearch.css';

interface IAIAssistantSearchProps {
  searchTraces: (query: Record<string, any>) => void;
}

interface AIAssistantSearchImplProps extends IAIAssistantSearchProps {
  submitting: boolean;
}

const AIAssistantSearchImpl: React.FC<AIAssistantSearchImplProps> = ({ searchTraces, submitting }) => {
  const [question, setQuestion] = useState('');
  const [selectedModel, setSelectedModel] = useState<LLMModel>('ollama-free');
  const [loading, setLoading] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [apiKey, setApiKey] = useState(localStorage.getItem('jaeger-ai-openai-key') || '');
  const [ollamaUrl, setOllamaUrl] = useState(
    localStorage.getItem('jaeger-ai-ollama-url') || 'http://localhost:11434'
  );
  const [parsedQuery, setParsedQuery] = useState<any>(null);
  const [queryHistory, setQueryHistory] = useState<Array<{ question: string; timestamp: number }>>(() => {
    const saved = localStorage.getItem('jaeger-ai-history');
    return saved ? JSON.parse(saved) : [];
  });

  const handleSaveSettings = useCallback(() => {
    localStorage.setItem('jaeger-ai-openai-key', apiKey);
    localStorage.setItem('jaeger-ai-ollama-url', ollamaUrl);
    message.success('Settings saved successfully');
    setShowSettings(false);
  }, [apiKey, ollamaUrl]);

  const handleSearch = useCallback(async () => {
    if (!question.trim()) {
      message.warning('Please enter a question');
      return;
    }

    setLoading(true);
    setParsedQuery(null);

    try {
      // Validate API key for OpenAI models
      if ((selectedModel === 'openai-gpt4' || selectedModel === 'openai-gpt3.5') && !apiKey) {
        message.error('Please configure OpenAI API key in settings');
        setShowSettings(true);
        setLoading(false);
        return;
      }

      // Parse the natural language question using LLM
      const llmConfig = {
        model: selectedModel,
        apiKey: selectedModel.startsWith('openai') ? apiKey : undefined,
        baseURL: selectedModel === 'ollama-free' ? ollamaUrl : undefined,
      };

      const { parsed } = await parseNaturalLanguageQuery(question, llmConfig);
      setParsedQuery(parsed);

      // Convert parsed query to search filters
      const filters = convertParsedQueryToSearchFilters(parsed);

      // Build complete search query
      const now = new Date();
      const lookback = '1h'; // Default to 1 hour lookback
      const start = String(lookbackToTimestamp(lookback, now));
      const end = now.valueOf() * 1000;

      const searchQuery: Record<string, any> = {
        service: filters.service || '-',
        operation: filters.operation || '-',
        start,
        end,
        limit: String(20), // Default limit
        lookback,
      };

      if (filters.minDuration) {
        searchQuery.minDuration = filters.minDuration;
      }
      if (filters.maxDuration) {
        searchQuery.maxDuration = filters.maxDuration;
      }
      if (filters.tags) {
        searchQuery.tags = filters.tags;
      }

      // Save to history
      const newHistory = [{ question, timestamp: Date.now() }, ...queryHistory.slice(0, 9)];
      setQueryHistory(newHistory);
      localStorage.setItem('jaeger-ai-history', JSON.stringify(newHistory));

      // Execute the search
      searchTraces(searchQuery);
      message.success('Search executed with AI-generated filters');
    } catch (error) {
      console.error('AI Assistant error:', error);
      message.error(error instanceof Error ? error.message : 'Failed to process question. Please try again.');
    } finally {
      setLoading(false);
    }
  }, [question, selectedModel, apiKey, ollamaUrl, searchTraces, queryHistory]);

  const handleSelectFromHistory = useCallback((historyQuestion: string) => {
    setQuestion(historyQuestion);
  }, []);

  const handleClear = useCallback(() => {
    setQuestion('');
    setParsedQuery(null);
  }, []);

  const historyItems = queryHistory.map((item, idx) => ({
    key: String(idx),
    label: (
      <div className="AIAssistantSearch--historyItem">
        <span>{item.question}</span>
        <span className="AIAssistantSearch--historyTime">{dayjs(item.timestamp).format('HH:mm:ss')}</span>
      </div>
    ),
    children: (
      <Button
        type="primary"
        size="small"
        onClick={() => {
          handleSelectFromHistory(item.question);
          handleSearch();
        }}
      >
        Run This Search
      </Button>
    ),
  }));

  return (
    <div className="AIAssistantSearch">
      <Card className="AIAssistantSearch--card">
        <div className="AIAssistantSearch--header">
          <h3>AI Assistant Query Assistant</h3>
          <Tooltip title="Configure LLM models and API keys">
            <Button type="text" icon={<SettingOutlined />} onClick={() => setShowSettings(true)} />
          </Tooltip>
        </div>

        <Divider />

        <Form layout="vertical">
          <Form.Item label="Ask a question about your traces">
            <Input.TextArea
              placeholder="Example: Show me slow requests to the user service with status 500"
              value={question}
              onChange={e => setQuestion(e.target.value)}
              onPressEnter={e => {
                if (e.ctrlKey || e.metaKey) {
                  handleSearch();
                }
              }}
              rows={5}
              disabled={loading || submitting}
            />
            <div className="AIAssistantSearch--hint">
              Press Ctrl+Enter (or Cmd+Enter on Mac) to search, or click the Find Traces button
            </div>
          </Form.Item>

          <Form.Item label="AI Model">
            <Select value={selectedModel} onChange={setSelectedModel} disabled={loading || submitting}>
              <Select.Option value="ollama-free">📦 Ollama (Local - Free)</Select.Option>
              <Select.Option value="openai-gpt3.5">🚀 ChatGPT 3.5 (OpenAI)</Select.Option>
              <Select.Option value="openai-gpt4">🚀 ChatGPT 4 (OpenAI)</Select.Option>
            </Select>
          </Form.Item>
        </Form>

        <div className="AIAssistantSearch--actions">
          <Button
            type="primary"
            icon={loading ? <LoadingOutlined /> : <SearchOutlined />}
            onClick={handleSearch}
            loading={loading}
            disabled={!question.trim() || submitting}
            block
          >
            Find Traces
          </Button>
          <Button icon={<ClearOutlined />} onClick={handleClear} disabled={!question.trim()} block>
            Clear
          </Button>
        </div>

        {parsedQuery && (
          <div className="AIAssistantSearch--result">
            <Divider />
            <h4>Generated Search Filters:</h4>
            <Card size="small" className="AIAssistantSearch--filterCard">
              {parsedQuery.service && (
                <div className="AIAssistantSearch--filter">
                  <strong>Service:</strong> {parsedQuery.service}
                </div>
              )}
              {parsedQuery.operation && (
                <div className="AIAssistantSearch--filter">
                  <strong>Operation:</strong> {parsedQuery.operation}
                </div>
              )}
              {parsedQuery.minDuration && (
                <div className="AIAssistantSearch--filter">
                  <strong>Min Duration:</strong> {parsedQuery.minDuration}
                </div>
              )}
              {parsedQuery.maxDuration && (
                <div className="AIAssistantSearch--filter">
                  <strong>Max Duration:</strong> {parsedQuery.maxDuration}
                </div>
              )}
              {parsedQuery.status && parsedQuery.status !== 'all' && (
                <div className="AIAssistantSearch--filter">
                  <strong>Status:</strong> {parsedQuery.status}
                </div>
              )}
            </Card>
          </div>
        )}

        {queryHistory.length > 0 && (
          <div className="AIAssistantSearch--history">
            <Divider />
            <h4>Recent Queries</h4>
            <Collapse items={historyItems} />
          </div>
        )}
      </Card>

      <Modal
        title="AI Assistant Settings"
        open={showSettings}
        onOk={handleSaveSettings}
        onCancel={() => setShowSettings(false)}
        okText="Save"
        cancelText="Cancel"
      >
        <Form layout="vertical">
          <Form.Item label="Ollama Base URL">
            <Input
              placeholder="http://localhost:11434"
              value={ollamaUrl}
              onChange={e => setOllamaUrl(e.target.value)}
            />
            <div className="AIAssistantSearch--hint">
              Ollama runs locally on your machine. Download from{' '}
              <a href="https://ollama.ai" target="_blank" rel="noreferrer">
                ollama.ai
              </a>
            </div>
          </Form.Item>

          <Divider />

          <Form.Item label="OpenAI API Key">
            <Input.Password
              placeholder="sk-..."
              value={apiKey}
              onChange={e => setApiKey(e.target.value)}
              type="password"
            />
            <div className="AIAssistantSearch--hint">
              Get your API key from{' '}
              <a href="https://platform.openai.com/api-keys" target="_blank" rel="noreferrer">
                OpenAI Platform
              </a>
              . This will be stored locally in your browser.
            </div>
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
};

// Redux mapping
function mapStateToProps(state: ReduxState) {
  return {
    submitting: state.trace?.search?.state === fetchedState.LOADING,
  };
}

function mapDispatchToProps(dispatch: Dispatch) {
  const { searchTraces } = bindActionCreators(jaegerApiActions, dispatch);
  return {
    searchTraces,
  };
}

const connector = connect(mapStateToProps, mapDispatchToProps);
type PropsFromRedux = ConnectedProps<typeof connector>;

const AIAssistantSearch = connector(AIAssistantSearchImpl);

export default AIAssistantSearch;

// Copyright (c) 2026 The Jaeger Authors.
// SPDX-License-Identifier: Apache-2.0

export type SearchPanelAction = 'toggle' | 'expand' | 'collapse';

export const SEARCH_PANEL_CONTROL_EVENT = 'jaeger:search-panel-control';
export const SEARCH_PANEL_STATE_EVENT = 'jaeger:search-panel-state';

export function dispatchSearchPanelControl(action: SearchPanelAction) {
  if (typeof window === 'undefined') return;
  window.dispatchEvent(new CustomEvent(SEARCH_PANEL_CONTROL_EVENT, { detail: { action } }));
}

export function dispatchSearchPanelState(collapsed: boolean) {
  if (typeof window === 'undefined') return;
  window.dispatchEvent(new CustomEvent(SEARCH_PANEL_STATE_EVENT, { detail: { collapsed } }));
}

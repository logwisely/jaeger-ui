// Copyright (c) 2025 The Jaeger Authors
// SPDX-License-Identifier: Apache-2.0

import React from 'react';
import { getConfigValue } from '../../utils/config/get-config';
import './TraceId.css';
import ClickToCopy from './ClickToCopy';

type Props = {
  traceId: string;
  className?: string;
};

export function TraceId({ traceId, className = '' }: Props) {
  if (!traceId) return null;
  const traceIdDisplayLength = getConfigValue('traceIdDisplayLength') || 8;
  const traceIdDisplay = traceId ? traceId.slice(-traceIdDisplayLength) : '';
  const lengthClass = traceIdDisplayLength === 8 ? 'TraceIDLength--short' : 'TraceIDLength--full';

  return (
    <ClickToCopy text={traceId} className="button-styles">
      <small className={`TraceIDLength ${lengthClass} u-tx-muted  ${className}`}>{traceIdDisplay}</small>
    </ClickToCopy>
  );
}

export default TraceId;

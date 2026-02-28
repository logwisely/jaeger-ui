// Copyright (c) 2017 Uber Technologies, Inc.
// SPDX-License-Identifier: Apache-2.0

import React from 'react';
import { Divider } from 'antd';

import { IoLinkOutline, IoWarning, IoArrowRedoOutline, IoArrowUndoOutline } from 'react-icons/io5';
import AccordionAttributes from './AccordionAttributes';
import AccordionEvents from './AccordionEvents';
import AccordionLinks from './AccordionLinks';
import AccordionText from './AccordionText';
import DetailState from './DetailState';
import { formatDuration } from '../utils';
import CopyIcon from '../../../common/CopyIcon';
import LabeledList from '../../../common/LabeledList';
import { formatDatetime } from '../../../../utils/date';

import { TNil } from '../../../../types';
import { Hyperlink } from '../../../../types/hyperlink';
import { IOtelSpan, IAttribute, IEvent, SpanKind } from '../../../../types/otel';

import './index.css';

type SpanDetailProps = {
  detailState: DetailState;
  flatView?: boolean;
  isCriticalPathSpan?: boolean;
  linksGetter: ((links: ReadonlyArray<IAttribute>, index: number) => Hyperlink[]) | TNil;
  eventItemToggle: (spanID: string, event: IEvent) => void;
  eventsToggle: (spanID: string) => void;
  resourceToggle: (spanID: string) => void;
  span: IOtelSpan;
  attributesToggle: (spanID: string) => void;
  traceStartTime: number;
  warningsToggle: (spanID: string) => void;
  linksToggle: (spanID: string) => void;
  focusSpan: (uiFind: string) => void;
  currentViewRangeTime: [number, number];
  traceDuration: number;
  useOtelTerms: boolean;
};

export default function SpanDetail(props: SpanDetailProps) {
  const {
    detailState,
    flatView = false,
    isCriticalPathSpan = false,
    linksGetter,
    eventItemToggle,
    eventsToggle,
    resourceToggle,
    span,
    attributesToggle,
    traceStartTime,
    warningsToggle,
    linksToggle,
    focusSpan,
    currentViewRangeTime,
    traceDuration,
    useOtelTerms,
  } = props;

  const { isAttributesOpen, isResourceOpen, events: eventsState, isWarningsOpen, isLinksOpen } = detailState;
  const warnings = span.warnings;
  const hasErrorAttribute = span.attributes.some(attr => {
    if (attr.key === 'error') {
      const value = String(attr.value).toLowerCase();
      return value === 'true' || value === '1';
    }
    if (attr.key === 'otel.status_code') {
      return String(attr.value).toUpperCase() === 'ERROR';
    }
    return false;
  });
  const hasExceptionSignal =
    span.attributes.some(attr => attr.key === 'exception.type') ||
    span.events.some(
      event =>
        event.name.toLowerCase() === 'exception' ||
        event.attributes.some(attr => attr.key === 'exception.type' || attr.key.startsWith('exception.'))
    );
  const isClientSpan = span.kind === SpanKind.CLIENT;
  const isServerSpan = span.kind === SpanKind.SERVER;

  const statusIcon = hasExceptionSignal ? (
    <IoWarning className="SpanDetail--statusIcon SpanDetail--statusIcon--exception" />
  ) : hasErrorAttribute ? (
    <IoWarning className="SpanDetail--statusIcon SpanDetail--statusIcon--failure" />
  ) : null;
  const kindIcon = isClientSpan ? (
    <IoArrowRedoOutline className="SpanDetail--kindIcon SpanDetail--kindIcon--client" />
  ) : isServerSpan ? (
    <IoArrowUndoOutline className="SpanDetail--kindIcon SpanDetail--kindIcon--server" />
  ) : null;

  // Get links for display in AccordionLinks
  const links = span.links || [];

  // Display labels based on terminology flag
  const attributesLabel = useOtelTerms ? 'Attributes' : 'Tags';
  const resourceLabel = useOtelTerms ? 'Resource' : 'Process';

  const overviewItems = [
    {
      key: 'start',
      label: 'Start Time:',
      value: `${formatDatetime(span.startTime)} (+${formatDuration(span.relativeStartTime)})`,
    },
  ];
  const deepLinkCopyText = `${window.location.origin}${window.location.pathname}?uiFind=${span.spanID}`;
  const durationLabel = formatDuration(span.duration);
  const isLongDuration = span.duration > 1_000_000;

  return (
    <div>
      <div className="ub-flex ub-items-center">
        <h2 className="ub-flex-auto ub-m0 SpanDetail--title">
          <>
            <span className="SpanDetail--titlePart">
              {statusIcon}
              {kindIcon}
              <span className="SpanDetail--titleLabel">Service:</span>
              <span className="SpanDetail--titleValue">{span.resource.serviceName}</span>
            </span>{' '}
            <span className="SpanDetail--titlePart">
              <span className="SpanDetail--titleLabel">Operation:</span>
              <span className="SpanDetail--titleValue">{span.name}</span>
            </span>{' '}
            <span
              className={`SpanDetail--titlePart ${isCriticalPathSpan ? 'is-critical-path' : ''} ${
                isLongDuration ? 'is-long-duration' : ''
              }`}
            >
              <span className="SpanDetail--titleLabel">Duration:</span>
              <span className="SpanDetail--titleValue">{durationLabel}</span>
            </span>
          </>
        </h2>
        <LabeledList
          className="ub-tx-right-align"
          dividerClassName="SpanDetail--divider"
          items={overviewItems}
        />
      </div>
      <Divider className="SpanDetail--divider ub-my1" />
      <div>
        <div>
          <AccordionAttributes
            data={span.attributes}
            label={attributesLabel}
            linksGetter={linksGetter}
            isOpen={isAttributesOpen}
            onToggle={() => attributesToggle(span.spanID)}
          />
          {span.resource.attributes && span.resource.attributes.length > 0 && (
            <AccordionAttributes
              className="ub-mb1"
              data={span.resource.attributes}
              label={resourceLabel}
              linksGetter={linksGetter}
              isOpen={isResourceOpen}
              onToggle={() => resourceToggle(span.spanID)}
            />
          )}
        </div>
        {span.events && span.events.length > 0 && (
          <AccordionEvents
            showAllByDefault={flatView}
            linksGetter={linksGetter}
            events={span.events}
            isOpen={eventsState.isOpen}
            openedItems={eventsState.openedItems}
            onToggle={() => eventsToggle(span.spanID)}
            onItemToggle={eventItem => eventItemToggle(span.spanID, eventItem)}
            timestamp={traceStartTime}
            currentViewRangeTime={currentViewRangeTime}
            traceDuration={traceDuration}
            spanID={span.spanID}
            useOtelTerms={useOtelTerms}
          />
        )}
        {warnings && warnings.length > 0 && (
          <AccordionText
            className="AccordianWarnings"
            headerClassName="AccordianWarnings--header"
            label={<span className="AccordianWarnings--label">Warnings</span>}
            data={warnings}
            isOpen={isWarningsOpen}
            onToggle={() => warningsToggle(span.spanID)}
          />
        )}
        {links && links.length > 0 && (
          <AccordionLinks
            data={links}
            isOpen={isLinksOpen}
            onToggle={() => linksToggle(span.spanID)}
            focusSpan={focusSpan}
            useOtelTerms={useOtelTerms}
          />
        )}
        <small className="SpanDetail--debugInfo">
          <span className="SpanDetail--debugLabel" data-label="SpanID:" /> {span.spanID}
          <CopyIcon
            copyText={deepLinkCopyText}
            icon={<IoLinkOutline />}
            placement="topRight"
            tooltipTitle="Copy deep link to this span"
            buttonText="Copy"
          />
        </small>
      </div>
    </div>
  );
}

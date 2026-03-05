"use client";

import * as React from "react";
import { createPortal } from "react-dom";

const TOOLTIP_OFFSET = 8;
const HOVER_DELAY_MS = 300;

type Props = {
  title: string;
  body?: string;
  /** If true, render body as HTML (e.g. item description from DDragon). Use only with sanitized content. */
  bodyHtml?: boolean;
  children: React.ReactElement;
};

export function LeagueTooltip({ title, body, bodyHtml, children }: Props) {
  const [visible, setVisible] = React.useState(false);
  const [position, setPosition] = React.useState({ top: 0, left: 0 });
  const wrapperRef = React.useRef<HTMLSpanElement>(null);
  const timeoutRef = React.useRef<ReturnType<typeof setTimeout> | null>(null);

  const updatePosition = React.useCallback(() => {
    const el = wrapperRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    setPosition({
      left: rect.left + rect.width / 2,
      top: rect.bottom + TOOLTIP_OFFSET,
    });
  }, []);

  const show = React.useCallback(() => {
    timeoutRef.current = setTimeout(() => {
      updatePosition();
      setVisible(true);
      timeoutRef.current = null;
    }, HOVER_DELAY_MS);
  }, [updatePosition]);

  const hide = React.useCallback(() => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
    setVisible(false);
  }, []);

  React.useEffect(() => {
    if (!visible) return;
    const hideOnScroll = () => setVisible(false);
    window.addEventListener("scroll", hideOnScroll, true);
    return () => window.removeEventListener("scroll", hideOnScroll, true);
  }, [visible]);

  React.useEffect(() => {
    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, []);

  const tooltipContent =
    visible && (title || body) ? (
      <div
        className="league-tooltip"
        role="tooltip"
        style={{
          left: position.left,
          top: position.top,
          transform: "translate(-50%, 0)",
        }}
      >
        {title ? <div className="league-tooltip-title">{title}</div> : null}
        {body ? (
          <div
            className="league-tooltip-body"
            {...(bodyHtml ? { dangerouslySetInnerHTML: { __html: body } } : {})}
          >
            {bodyHtml ? null : body}
          </div>
        ) : null}
      </div>
    ) : null;

  return (
    <>
      <span
        ref={wrapperRef}
        className="league-tooltip-trigger"
        onMouseEnter={show}
        onMouseLeave={hide}
      >
        {children}
      </span>
      {typeof document !== "undefined" && tooltipContent
        ? createPortal(tooltipContent, document.body)
        : null}
    </>
  );
}

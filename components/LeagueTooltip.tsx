"use client";

import * as React from "react";
import { createPortal } from "react-dom";

const TOOLTIP_OFFSET = 10;
const HOVER_DELAY_MS = 0;
const HIDE_DELAY_MS = 400;
const TOOLTIP_MAX_HEIGHT = 280;

type Props = {
  title: string;
  body?: string;
  /** If true, render body as HTML (e.g. item description from DDragon). Use only with sanitized content. */
  bodyHtml?: boolean;
  children: React.ReactElement;
};

export function LeagueTooltip({ title, body, bodyHtml, children }: Props) {
  const [visible, setVisible] = React.useState(false);
  const [mounted, setMounted] = React.useState(false);
  const [position, setPosition] = React.useState({ top: 0, left: 0 });
  const [placeAbove, setPlaceAbove] = React.useState(false);
  const wrapperRef = React.useRef<HTMLSpanElement>(null);
  const timeoutRef = React.useRef<ReturnType<typeof setTimeout> | null>(null);
  const hideTimeoutRef = React.useRef<ReturnType<typeof setTimeout> | null>(null);

  React.useEffect(() => {
    setMounted(true);
  }, []);

  const updatePosition = React.useCallback(() => {
    const el = wrapperRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const centerX = rect.left + rect.width / 2;
    const spaceBelow = typeof window !== "undefined" ? window.innerHeight - rect.bottom - TOOLTIP_OFFSET : 300;
    const above = spaceBelow < TOOLTIP_MAX_HEIGHT;
    setPlaceAbove(above);
    setPosition({
      left: centerX,
      top: above ? rect.top - TOOLTIP_OFFSET : rect.bottom + TOOLTIP_OFFSET,
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
    hideTimeoutRef.current = setTimeout(() => {
      setVisible(false);
      hideTimeoutRef.current = null;
    }, HIDE_DELAY_MS);
  }, []);

  const cancelHide = React.useCallback(() => {
    if (hideTimeoutRef.current) {
      clearTimeout(hideTimeoutRef.current);
      hideTimeoutRef.current = null;
    }
  }, []);

  React.useEffect(() => {
    if (!visible) return;
    updatePosition();
    const hideOnScroll = () => setVisible(false);
    window.addEventListener("scroll", hideOnScroll, true);
    return () => window.removeEventListener("scroll", hideOnScroll, true);
  }, [visible, updatePosition]);

  React.useEffect(() => {
    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
      if (hideTimeoutRef.current) clearTimeout(hideTimeoutRef.current);
    };
  }, []);

  const tooltipContent =
    visible && title ? (
      <div
        className="league-tooltip"
        role="tooltip"
        style={{
          left: position.left,
          top: position.top,
          transform: placeAbove ? "translate(-50%, -100%)" : "translate(-50%, 0)",
        }}
        onMouseEnter={cancelHide}
        onMouseLeave={hide}
      >
        <div className="league-tooltip-title">{title}</div>
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
        onMouseEnter={() => {
          cancelHide();
          show();
        }}
        onMouseLeave={hide}
        onClick={(e) => e.stopPropagation()}
      >
        {children}
      </span>
      {mounted && typeof document !== "undefined" && tooltipContent
        ? createPortal(tooltipContent, document.body)
        : null}
    </>
  );
}

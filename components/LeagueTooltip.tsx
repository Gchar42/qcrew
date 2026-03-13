"use client";

import * as React from "react";
import { createPortal } from "react-dom";

const TOOLTIP_OFFSET = 10;
const HOVER_DELAY_MS = 200;
const HIDE_DELAY_MS = 350;
const TOOLTIP_MAX_HEIGHT = 280;

/**
 * Sanitize CommunityDragon / DDragon tooltip HTML.
 * - Strips <lol-uikit-tooltipped-keyword ...>...</lol-uikit-tooltipped-keyword> wrapper tags
 *   (keeps the inner text content)
 * - Converts <font color='#xxx'>text</font> → <span style="color:#xxx">text</span>
 * - Keeps standard HTML: <b>, <i>, <br>, <span>, etc.
 */
function sanitizeGameHtml(raw: string): string {
  return raw
    .replace(/<lol-uikit-tooltipped-keyword[^>]*>([\s\S]*?)<\/lol-uikit-tooltipped-keyword>/gi, "$1")
    .replace(/<keywordMajor[^>]*>([\s\S]*?)<\/keywordMajor>/gi, "<b>$1</b>")
    .replace(/<keywordStealth[^>]*>([\s\S]*?)<\/keywordStealth>/gi, "<b>$1</b>")
    .replace(/<font\s+color=['"](#?[a-fA-F0-9]+)['"]>([\s\S]*?)<\/font>/gi,
      '<span style="color:$1">$2</span>')
    .replace(/<br\s*\/?>/gi, "<br>")
    .replace(/<\/?mainText>/g, "")
    .replace(/<\/?rules>/gi, "<br>");
}

type Props = {
  title: string;
  body?: string;
  /** If true, render body as HTML (e.g. item description from DDragon). Use only with sanitized content. */
  bodyHtml?: boolean;
  /** Optional icon URL shown next to the title */
  icon?: string;
  /** Accent color for the border and title. Defaults to gold (#d4af37). */
  accentColor?: string;
  /** Optional subtitle rendered in bold below the header (e.g. rune shortDesc) */
  subtitle?: string;
  /** If true, render subtitle as sanitized HTML */
  subtitleHtml?: boolean;
  children: React.ReactElement;
};

export function LeagueTooltip({ title, body, bodyHtml, icon, accentColor, subtitle, subtitleHtml, children }: Props) {
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

  const accent = accentColor || "#d4af37";

  const tooltipContent =
    visible && title ? (
      <div
        className="league-tooltip"
        role="tooltip"
        style={{
          left: position.left,
          top: position.top,
          transform: placeAbove ? "translate(-50%, -100%)" : "translate(-50%, 0)",
          borderColor: accent,
        }}
        onMouseEnter={cancelHide}
        onMouseLeave={hide}
      >
        <div className="league-tooltip-header">
          {icon && (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={icon} alt="" className="league-tooltip-icon" />
          )}
          <span className="league-tooltip-title" style={{ color: accent }}>{title}</span>
        </div>
        {subtitle && (
          subtitleHtml
            ? <div className="league-tooltip-subtitle" dangerouslySetInnerHTML={{ __html: sanitizeGameHtml(subtitle) }} />
            : <div className="league-tooltip-subtitle">{subtitle}</div>
        )}
        {body ? (
          bodyHtml ? (
            <div
              className="league-tooltip-body"
              data-html=""
              dangerouslySetInnerHTML={{ __html: sanitizeGameHtml(body) }}
            />
          ) : (
            <div className="league-tooltip-body">{body}</div>
          )
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
      >
        {children}
      </span>
      {mounted && typeof document !== "undefined" && tooltipContent
        ? createPortal(tooltipContent, document.body)
        : null}
    </>
  );
}

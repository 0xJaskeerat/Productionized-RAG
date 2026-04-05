/**
 * useAutoScroll.js — Auto-scroll to bottom when new messages arrive.
 * Stops scrolling if user manually scrolls up (UX respect).
 */
import { useEffect, useRef, useCallback } from "react";

export function useAutoScroll(dependency) {
  const containerRef = useRef(null);
  const userScrolledUp = useRef(false);

  // Detect if user scrolled up manually
  const handleScroll = useCallback(() => {
    const el = containerRef.current;
    if (!el) return;
    const atBottom = el.scrollHeight - el.scrollTop - el.clientHeight < 80;
    userScrolledUp.current = !atBottom;
  }, []);

  // Auto-scroll on new content, unless user scrolled up
  useEffect(() => {
    if (!userScrolledUp.current && containerRef.current) {
      containerRef.current.scrollTop = containerRef.current.scrollHeight;
    }
  }, [dependency]);

  return { containerRef, handleScroll };
}

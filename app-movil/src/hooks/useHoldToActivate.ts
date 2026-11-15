import { useEffect, useRef, useState } from "react";

const HOLD_DURATION_MS = 3000;

type UseHoldToActivateOptions = {
  disabled?: boolean;
  onComplete?: () => void;
};

export function useHoldToActivate({ disabled, onComplete }: UseHoldToActivateOptions) {
  const [progress, setProgress] = useState(0);
  const [isHolding, setIsHolding] = useState(false);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const didCompleteRef = useRef(false);

  const clearTimers = () => {
    if (intervalRef.current) clearInterval(intervalRef.current);
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    intervalRef.current = null;
    timeoutRef.current = null;
  };

  const reset = () => {
    clearTimers();
    didCompleteRef.current = false;
    setIsHolding(false);
    setProgress(0);
  };

  const start = () => {
    if (disabled) return;
    clearTimers();
    setIsHolding(true);
    setProgress(0);
    didCompleteRef.current = false;
    const startedAt = Date.now();

    intervalRef.current = setInterval(() => {
      const elapsed = Date.now() - startedAt;
      setProgress(Math.min(Math.round((elapsed / HOLD_DURATION_MS) * 100), 100));
    }, 50);

    timeoutRef.current = setTimeout(() => {
      didCompleteRef.current = true;
      clearTimers();
      setProgress(100);
      setIsHolding(false);
      onComplete?.();
    }, HOLD_DURATION_MS);
  };

  const cancel = () => {
    if (disabled) return;
    if (!didCompleteRef.current) reset();
  };

  useEffect(() => {
    if (disabled) reset();
  }, [disabled]);

  useEffect(() => () => clearTimers(), []);

  return { cancel, isHolding, progress, start };
}

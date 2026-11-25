"use client";
import { useCallback, useEffect, useRef, useState } from "react";

// show() keeps the same identity between renders, so a page can list it in an
// effect's dependencies. It didn't before, and the Orders page re-fetched its
// orders and re-joined the live channel on every render, about three times a
// second (found in the test shop run, 26 Nov 2026). A newer message replaces
// an older one, and its timer restarts.
export function useToast() {
  const [toast, setToast] = useState({ message: "", visible: false });
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const show = useCallback((message: string) => {
    setToast({ message, visible: true });
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => setToast({ message: "", visible: false }), 2400);
  }, []);

  useEffect(() => () => { if (timer.current) clearTimeout(timer.current); }, []);

  return { toast, show };
}

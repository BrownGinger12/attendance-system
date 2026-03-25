import { useEffect } from "react";
import { createPortal } from "react-dom";

/** Lock body scroll while the modal is open */
export function useScrollLock(active: boolean) {
  useEffect(() => {
    if (!active) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = prev; };
  }, [active]);
}

export { createPortal };

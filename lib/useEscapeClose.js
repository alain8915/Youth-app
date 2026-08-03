import { useEffect } from "react";

// Cualquier persona que use el teclado espera poder cerrar un diálogo con
// Escape (es una convención estándar de UI, no solo "un extra").
export function useEscapeClose(active, onClose) {
  useEffect(() => {
    if (!active) return;
    function handleKey(e) {
      if (e.key === "Escape") onClose();
    }
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [active, onClose]);
}

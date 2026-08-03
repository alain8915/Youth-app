import { useState, useCallback, useRef } from "react";

// Da feedback visible y temporal después de una acción ("Guardado",
// "Eliminado"), en vez de que la pantalla simplemente se actualice en
// silencio y el usuario tenga que adivinar si funcionó.
export function useToast() {
  const [toast, setToast] = useState(null);
  const timerRef = useRef(null);

  const showToast = useCallback((message, type = "success") => {
    setToast({ message, type });
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => setToast(null), 3500);
  }, []);

  const clearToast = useCallback(() => {
    if (timerRef.current) clearTimeout(timerRef.current);
    setToast(null);
  }, []);

  return { toast, showToast, clearToast };
}

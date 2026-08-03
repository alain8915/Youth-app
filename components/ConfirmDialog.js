import { useEffect, useRef } from "react";
import { useEscapeClose } from "../lib/useEscapeClose";

export default function ConfirmDialog({
  open,
  title,
  message,
  confirmLabel = "Confirmar",
  cancelLabel = "Cancelar",
  danger = false,
  onConfirm,
  onCancel,
}) {
  const confirmRef = useRef(null);

  useEscapeClose(open, onCancel);

  useEffect(() => {
    if (open) confirmRef.current?.focus();
  }, [open]);

  if (!open) return null;

  return (
    <div className="modal-backdrop" onClick={onCancel}>
      <div
        className="modal"
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="confirm-dialog-title"
        aria-describedby="confirm-dialog-message"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 id="confirm-dialog-title">{title}</h2>
        <p id="confirm-dialog-message" className="subtitle" style={{ marginBottom: 0 }}>
          {message}
        </p>
        <div className="form-actions">
          <button type="button" className="btn-secondary" onClick={onCancel}>
            {cancelLabel}
          </button>
          <button
            type="button"
            ref={confirmRef}
            className={danger ? "btn-danger" : "btn-primary"}
            onClick={onConfirm}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}

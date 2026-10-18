import { useState, useCallback } from 'react';
import { createPortal } from 'react-dom';
import Toast from './Toast';

let toastCounter = 0;

/**
 * Hook to trigger toast notifications and render a stable ToastContainer.
 */
export function useToast() {
  const [toasts, setToasts] = useState([]);

  const showToast = useCallback((message, type = 'success', duration = 3500) => {
    const id = ++toastCounter;
    setToasts((prev) => [...prev, { id, message, type, duration }]);
  }, []);

  const removeToast = useCallback((id) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const ToastContainer = useCallback(() => {
    if (typeof document === 'undefined') return null;
    return createPortal(
      <div className="fixed bottom-6 right-6 z-50 flex flex-col gap-2.5 pointer-events-none">
        {toasts.map((t) => (
          <Toast
            key={t.id}
            message={t.message}
            type={t.type}
            duration={t.duration}
            onClose={() => removeToast(t.id)}
          />
        ))}
      </div>,
      document.body
    );
  }, [toasts, removeToast]);

  return { showToast, ToastContainer, toasts, removeToast };
}

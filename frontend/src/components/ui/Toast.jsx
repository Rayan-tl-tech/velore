import { useEffect, useState, useRef } from 'react';
import { CheckCircle, XCircle, X } from 'lucide-react';

/**
 * Toast notification component with smooth entry/exit animations.
 * @param {string} message - Text to display
 * @param {'success'|'error'} type - Visual style
 * @param {function} onClose - Called when toast is dismissed
 * @param {number} duration - Auto-dismiss in ms (default 3500)
 */
export default function Toast({ message, type = 'success', onClose, duration = 3500 }) {
  const [visible, setVisible] = useState(false);
  const onCloseRef = useRef(onClose);

  useEffect(() => {
    onCloseRef.current = onClose;
  }, [onClose]);

  useEffect(() => {
    // Animate in
    const show = setTimeout(() => setVisible(true), 20);
    // Auto-dismiss
    const dismiss = setTimeout(() => {
      setVisible(false);
      setTimeout(() => {
        onCloseRef.current?.();
      }, 300);
    }, duration);

    return () => {
      clearTimeout(show);
      clearTimeout(dismiss);
    };
  }, [duration]);

  const handleManualClose = () => {
    setVisible(false);
    setTimeout(() => {
      onCloseRef.current?.();
    }, 300);
  };

  const isSuccess = type === 'success';

  return (
    <div
      className={`flex items-center gap-3 px-4 py-3.5 rounded-xl shadow-xl text-sm font-medium transition-all duration-300 max-w-sm pointer-events-auto border
        ${isSuccess ? 'bg-white border-green-200 text-green-800' : 'bg-white border-red-200 text-red-800'}
        ${visible ? 'opacity-100 translate-y-0 scale-100' : 'opacity-0 translate-y-3 scale-95'}`}
    >
      {isSuccess ? (
        <CheckCircle className="w-5 h-5 text-green-500 shrink-0" />
      ) : (
        <XCircle className="w-5 h-5 text-red-500 shrink-0" />
      )}
      <span className="flex-1 leading-snug">{message}</span>
      <button
        onClick={handleManualClose}
        className="text-gray-400 hover:text-gray-600 p-1 rounded-md hover:bg-gray-50 transition-colors"
        aria-label="Dismiss"
      >
        <X className="w-4 h-4" />
      </button>
    </div>
  );
}

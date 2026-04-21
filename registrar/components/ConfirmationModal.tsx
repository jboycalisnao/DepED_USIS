
import React from 'react';

interface ConfirmationModalProps {
  isOpen: boolean;
  title: string;
  message: string;
  onConfirm: () => void;
  onCancel?: () => void;
  confirmLabel?: string;
  cancelLabel?: string;
  type?: 'primary' | 'danger' | 'accent';
  isLoading?: boolean;
  hideCancel?: boolean;
}

const ConfirmationModal: React.FC<ConfirmationModalProps> = ({
  isOpen,
  title,
  message,
  onConfirm,
  onCancel,
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  type = 'primary',
  isLoading = false,
  hideCancel = false
}) => {
  if (!isOpen) return null;

  const colorClasses = {
    primary: 'bg-primary shadow-primary/20 hover:bg-primary/90',
    danger: 'bg-accent shadow-accent/20 hover:bg-accent/90',
    accent: 'bg-accent shadow-accent/20 hover:bg-accent/90',
  };

  const iconClasses = {
    primary: 'text-primary bg-primary/10',
    danger: 'text-accent bg-accent/10',
    accent: 'text-accent bg-accent/10',
  };

  const icons = {
    primary: 'info',
    danger: 'warning',
    accent: 'priority_high',
  };

  return (
    <div className="fixed inset-0 z-[400] flex items-center justify-center p-6 sm:p-8">
      {/* Universal Backdrop Blur - Robust Fullscreen Coverage */}
      <div 
        className="fixed top-0 left-0 w-full h-full bg-[#004E8C]/30 backdrop-blur-xl animate-in fade-in duration-300" 
        onClick={onCancel}
      ></div>
      
      {/* Modal Card */}
      <div className="relative w-full max-w-md bg-white rounded-[48px] shadow-2xl overflow-hidden animate-in zoom-in-95 duration-500 border border-surfaceVariant/30">
        <div className="p-8 pb-0 flex flex-col items-center text-center">
          <div className={`w-16 h-16 rounded-3xl flex items-center justify-center mb-6 ${iconClasses[type]}`}>
            <span className="material-symbols-outlined text-3xl font-bold">{icons[type]}</span>
          </div>
          <h3 className="text-2xl font-black text-primary uppercase tracking-tighter mb-2">{title}</h3>
          <p className="text-sm font-medium text-outline leading-relaxed">{message}</p>
        </div>

        <div className="p-8 pt-10 flex flex-col gap-3">
          <button
            onClick={onConfirm}
            disabled={isLoading}
            className={`w-full py-5 rounded-2xl text-white font-black text-xs uppercase tracking-[0.2em] transition-all flex items-center justify-center gap-2 ${colorClasses[type]}`}
          >
            {isLoading ? (
              <span className="material-symbols-outlined animate-spin">sync</span>
            ) : (
              confirmLabel
            )}
          </button>
          {!hideCancel && (
            <button
              onClick={onCancel}
              disabled={isLoading}
              className="w-full py-4 rounded-2xl text-outline font-black text-xs uppercase tracking-[0.2em] hover:bg-surface transition-all"
            >
              {cancelLabel}
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default ConfirmationModal;

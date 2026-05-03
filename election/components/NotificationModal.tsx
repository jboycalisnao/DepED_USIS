
import React from 'react';
import { createPortal } from 'react-dom';

export interface ModalConfig {
  isOpen: boolean;
  title: string;
  message: string;
  type: 'info' | 'warning' | 'error' | 'success' | 'confirm';
  onConfirm?: () => void;
}

interface NotificationModalProps {
  config: ModalConfig;
  onClose: () => void;
}

const NotificationModal: React.FC<NotificationModalProps> = ({ config, onClose }) => {
  if (!config.isOpen) return null;
  
  const iconMap = {
    info: 'fa-circle-info',
    warning: 'fa-triangle-exclamation',
    error: 'fa-circle-xmark',
    success: 'fa-circle-check',
    confirm: 'fa-circle-question',
  };

  const statusClassMap = {
    info: 'border-[rgba(0,56,168,0.16)] bg-[#eef3fb] text-[#0038a8]',
    warning: 'border-[#b7791f] bg-[#fff8e8] text-[#8c5e16]',
    error: 'border-[#ce1126] bg-[#fff1f3] text-[#9b1323]',
    success: 'border-[#2f855a] bg-[#edf9f1] text-[#1f6b45]',
    confirm: 'border-[#d97706] bg-[#fff8e8] text-[#8c5e16]',
  };

  const isDestructiveConfirm = config.type === 'error' || (config.type === 'confirm' && config.title.toLowerCase().includes('delete'));

  return createPortal(
    <div className="fixed inset-0 z-[10001] flex items-center justify-center p-4 bg-[rgba(18,35,61,0.48)] backdrop-blur-sm animate-in fade-in duration-200">
      <div
        className="bg-white rounded-[12px] shadow-[0_12px_32px_rgba(18,35,61,0.16)] max-w-[560px] w-full overflow-hidden border border-[rgba(18,35,61,0.08)] transform animate-in zoom-in-95 duration-200"
        role="dialog"
        aria-modal="true"
      >
        <div className="flex items-start justify-between gap-4 border-b border-[rgba(18,35,61,0.08)] p-5">
          <h3 className="m-0 text-[24px] font-bold tracking-[-0.03em] text-[#12233d]">{config.title}</h3>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close modal"
            className="inline-flex h-10 w-10 items-center justify-center rounded-[12px] border border-[rgba(18,35,61,0.08)] bg-white text-[16px] font-bold text-[#12233d] transition-colors hover:bg-[#f8fafc]"
          >
            <i className="fa-solid fa-xmark" />
          </button>
        </div>

        <div className="p-5">
          <div className="flex items-start gap-4">
            <div
              className={[
                'inline-flex h-12 w-12 shrink-0 items-center justify-center rounded-[12px] border text-[16px] font-bold',
                statusClassMap[config.type],
              ].join(' ')}
              aria-hidden="true"
            >
              <i className={`fa-solid ${iconMap[config.type]}`} />
            </div>
            <p className="m-0 text-[16px] leading-[1.7] text-[#68758d]">{config.message}</p>
          </div>
        </div>

        <div className="flex flex-wrap justify-end gap-3 border-t border-[rgba(18,35,61,0.08)] p-5">
          {config.type === 'confirm' && (
            <button 
              onClick={onClose} 
              className="rounded-[12px] border border-[rgba(18,35,61,0.08)] bg-white px-4 py-3 text-[13px] font-bold text-[#12233d] transition-colors hover:bg-[#f8fafc]"
            >
              Cancel
            </button>
          )}
          <button 
            onClick={() => {
              if (config.onConfirm) config.onConfirm();
              onClose();
            }}
            className={`rounded-[12px] px-4 py-3 font-bold text-[13px] transition-colors ${
              isDestructiveConfirm
                ? 'bg-[#ce1126] text-white hover:bg-[#b10f21]'
                : 'bg-[#0038a8] text-white hover:bg-[#002f8a]'
            }`}
          >
            {config.type === 'confirm' ? 'Confirm Action' : 'Understood'}
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
};

export default NotificationModal;

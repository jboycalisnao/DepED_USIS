
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
    info: 'fa-circle-info text-blue-500',
    warning: 'fa-triangle-exclamation text-yellow-500',
    error: 'fa-circle-xmark text-red-500',
    success: 'fa-circle-check text-green-500',
    confirm: 'fa-circle-question text-orange-500'
  };

  return createPortal(
    <div className="fixed inset-0 z-[10001] flex items-center justify-center p-4 bg-black/70 backdrop-blur-md animate-in fade-in duration-200">
      <div className="bg-white rounded-[2.5rem] shadow-[0_32px_64px_-12px_rgba(0,0,0,0.5)] max-w-sm w-full overflow-hidden border border-white/20 transform animate-in zoom-in-95 duration-200">
        <div className="p-8 text-center">
          <div className="w-20 h-20 bg-gray-50 rounded-full flex items-center justify-center mx-auto mb-6 border border-gray-100 shadow-inner">
            <i className={`fa-solid ${iconMap[config.type]} text-4xl`}></i>
          </div>
          <h3 className="text-xl font-black text-gray-900 uppercase tracking-tight mb-2 leading-tight">{config.title}</h3>
          <p className="text-sm text-gray-500 font-medium leading-relaxed">{config.message}</p>
        </div>
        <div className="p-6 bg-gray-50 flex gap-3 border-t border-gray-100">
          {config.type === 'confirm' && (
            <button 
              onClick={onClose} 
              className="flex-1 py-4 text-xs font-black uppercase text-gray-400 hover:text-gray-600 transition-colors tracking-widest"
            >
              Cancel
            </button>
          )}
          <button 
            onClick={() => {
              if (config.onConfirm) config.onConfirm();
              onClose();
            }}
            className={`flex-1 py-4 rounded-2xl font-black text-xs uppercase shadow-xl transition-all active:scale-95 tracking-widest ${
              config.type === 'error' || (config.type === 'confirm' && config.title.toLowerCase().includes('delete'))
                ? 'bg-red-600 text-white shadow-red-900/30 hover:bg-red-700' 
                : 'bg-[#034F8B] text-white shadow-blue-900/30 hover:bg-blue-800'
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

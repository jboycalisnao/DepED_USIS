import React from 'react';
import { createPortal } from 'react-dom';

interface SystemAlertsProps {
  isOnline: boolean;
  isSyncing: boolean;
  hasError: boolean;
}

const SystemAlerts: React.FC<SystemAlertsProps> = ({ isOnline, isSyncing, hasError }) => {
  if (isOnline && !isSyncing && !hasError) return null;

  return createPortal(
    <div className="fixed inset-x-0 top-0 z-[200] pointer-events-none flex flex-col items-center">
      {/* Synchronization Banner */}
      {isSyncing && isOnline && !hasError && (
        <div className="w-full bg-[#034F8B] text-white py-1 px-4 flex items-center justify-center space-x-3 animate-in slide-in-from-top duration-300 pointer-events-auto">
          <i className="fa-solid fa-circle-notch animate-spin text-[10px]"></i>
          <span className="text-[9px] font-black uppercase tracking-[0.2em]">Syncing Ballot Data with Secure Cloud...</span>
        </div>
      )}

      {/* Disconnection Overlay */}
      {!isOnline && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-md flex items-center justify-center p-6 pointer-events-auto animate-in fade-in duration-500">
          <div className="bg-white rounded-[2.5rem] shadow-2xl max-w-sm w-full overflow-hidden border border-white/20 transform animate-in zoom-in-95 duration-300">
            <div className="bg-[#E11C38] p-8 text-center text-white relative">
              <div className="w-16 h-16 bg-white/10 rounded-2xl flex items-center justify-center mx-auto mb-4 border border-white/20">
                <i className="fa-solid fa-cloud-slash text-2xl text-white"></i>
              </div>
              <h3 className="text-xl font-black uppercase tracking-tight leading-none">Connection Lost</h3>
              <p className="text-[10px] font-bold text-red-100 uppercase tracking-[0.2em] mt-2">Election Cloud Unreachable</p>
            </div>
            
            <div className="p-8 text-center">
              <p className="text-sm text-gray-500 font-medium leading-relaxed mb-6">
                Your device has lost connection to the secure server. To ensure your vote is counted correctly, please do not close this window. We are attempting to reconnect...
              </p>
              
              <div className="flex flex-col gap-3">
                <div className="flex items-center justify-center space-x-3 text-amber-600 bg-amber-50 py-3 rounded-xl border border-amber-100">
                  <div className="w-2 h-2 bg-amber-500 rounded-full animate-ping"></div>
                  <span className="text-[10px] font-black uppercase tracking-widest">Searching for Signal...</span>
                </div>
                
                <button 
                  onClick={() => window.location.reload()}
                  className="w-full py-3 text-[10px] font-black text-gray-400 hover:text-gray-900 transition-colors uppercase tracking-[0.2em]"
                >
                  <i className="fa-solid fa-rotate mr-2"></i>
                  Manual Reconnect
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Persistence Error Alert */}
      {hasError && isOnline && (
        <div className="mt-4 mx-4 bg-amber-50 border-2 border-amber-200 rounded-2xl p-4 shadow-xl flex items-start space-x-4 max-w-md animate-in slide-in-from-top pointer-events-auto">
          <div className="bg-amber-500 text-white p-2.5 rounded-xl shadow-lg shadow-amber-900/20">
            <i className="fa-solid fa-triangle-exclamation"></i>
          </div>
          <div className="flex-grow">
            <h4 className="text-[11px] font-black text-amber-900 uppercase tracking-tight">Sync Integrity Warning</h4>
            <p className="text-[10px] font-bold text-amber-700/70 leading-tight uppercase mt-1">
              Some local data failed to synchronize. You may need to reset your browser cache if this persists.
            </p>
          </div>
          <button 
            onClick={() => window.location.reload()}
            className="text-amber-400 hover:text-amber-600 transition-colors pt-1"
          >
            <i className="fa-solid fa-circle-xmark"></i>
          </button>
        </div>
      )}
    </div>,
    document.body
  );
};

export default SystemAlerts;
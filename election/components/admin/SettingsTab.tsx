
import React from 'react';

interface SettingsTabProps {
  onReset: () => void;
  onLogout: () => void;
}

const SettingsTab: React.FC<SettingsTabProps> = ({ onReset, onLogout }) => {
  return (
    <div className="max-w-3xl mx-auto space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="bg-white p-10 rounded-3xl shadow-sm border border-gray-100">
        <h3 className="text-xl font-black text-gray-900 uppercase mb-8 flex items-center">
          <i className="fa-solid fa-sliders mr-3 text-[#034F8B]"></i>
          Election Controls
        </h3>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <button className="flex flex-col items-center p-8 bg-gray-50 rounded-2xl border border-gray-100 hover:bg-white hover:border-[#034F8B] transition-all group">
            <div className="w-12 h-12 bg-white rounded-xl shadow-sm flex items-center justify-center mb-4 group-hover:bg-[#034F8B] group-hover:text-white transition-colors">
              <i className="fa-solid fa-file-export"></i>
            </div>
            <span className="text-[10px] font-black uppercase text-gray-400 tracking-widest mb-1">Export Results</span>
            <span className="text-xs font-bold text-gray-900 text-center">Download Official Tally Report (PDF)</span>
          </button>
          
          <button className="flex flex-col items-center p-8 bg-gray-50 rounded-2xl border border-gray-100 hover:bg-white hover:border-[#034F8B] transition-all group">
            <div className="w-12 h-12 bg-white rounded-xl shadow-sm flex items-center justify-center mb-4 group-hover:bg-[#034F8B] group-hover:text-white transition-colors">
              <i className="fa-solid fa-lock"></i>
            </div>
            <span className="text-[10px] font-black uppercase text-gray-400 tracking-widest mb-1">Election Phase</span>
            <span className="text-xs font-bold text-gray-900 text-center">Lock Ballot Submissions</span>
          </button>
        </div>
      </div>

      <div className="bg-red-50 p-10 rounded-3xl border border-red-100">
        <div className="flex items-start space-x-4 mb-8">
          <div className="bg-red-600 text-white w-12 h-12 rounded-2xl flex items-center justify-center flex-shrink-0 shadow-lg shadow-red-900/20">
            <i className="fa-solid fa-triangle-exclamation text-xl"></i>
          </div>
          <div>
            <h3 className="text-xl font-black text-red-800 uppercase leading-none">Emergency Protocol</h3>
            <p className="text-red-600 text-xs font-bold mt-2 uppercase tracking-tighter italic">Warning: All actions here are irreversible and monitored.</p>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row gap-4">
          <button 
            onClick={onReset}
            className="flex-1 bg-red-600 text-white px-8 py-4 rounded-2xl font-black text-[10px] uppercase hover:bg-red-700 transition-all shadow-xl shadow-red-900/10 flex items-center justify-center"
          >
            <i className="fa-solid fa-skull-crossbones mr-3"></i>
            Clear Election Result Records
          </button>
          <button 
            className="flex-1 bg-white text-red-600 border border-red-200 px-8 py-4 rounded-2xl font-black text-[10px] uppercase hover:bg-red-50 transition-all flex items-center justify-center"
          >
            <i className="fa-solid fa-stop mr-3"></i>
            Terminate Active Session
          </button>
        </div>
      </div>
      
      <div className="flex justify-center pt-8">
         <button 
            onClick={onLogout}
            className="text-gray-400 hover:text-gray-900 transition-colors font-black uppercase text-[10px] tracking-[0.2em] flex items-center"
          >
            <i className="fa-solid fa-door-open mr-2"></i>
            Deauthorize Administrator Access
          </button>
      </div>
    </div>
  );
};

export default SettingsTab;

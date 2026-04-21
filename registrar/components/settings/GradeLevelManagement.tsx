
import React, { useState } from 'react';
import { useStore } from '../../store';
import { GradeLevel } from '../../types';
import ConfirmationModal from '../ConfirmationModal';

const GradeLevelManagement: React.FC = () => {
  const { gradeLevels, setGradeLevels, loading } = useStore();
  const [pendingToggle, setPendingToggle] = useState<GradeLevel | null>(null);

  const handleToggleClick = (grade: GradeLevel) => {
    if (loading) return;
    setPendingToggle(grade);
  };

  const executeToggle = async () => {
    if (!pendingToggle || loading) return;
    
    // Immediate calculation of new state
    let newLevels: GradeLevel[];
    if (gradeLevels.includes(pendingToggle)) {
      // Prevent disabling all levels
      if (gradeLevels.length <= 1) {
         setPendingToggle(null);
         return;
      }
      newLevels = gradeLevels.filter(g => g !== pendingToggle);
    } else {
      newLevels = [...gradeLevels, pendingToggle].sort((a, b) => {
        const order = Object.values(GradeLevel);
        return order.indexOf(a) - order.indexOf(b);
      });
    }
    
    // Close modal first for snappy UI
    const targetToggle = pendingToggle;
    setPendingToggle(null);
    
    // Await the store update (which handles localStorage and Supabase)
    await setGradeLevels(newLevels);
  };

  return (
    <section>
      <div className="flex items-center justify-between mb-8">
        <div>
          <h4 className="text-sm font-black text-primary uppercase tracking-widest">Offered Grade Levels</h4>
          <p className="text-[10px] font-bold text-outline uppercase mt-1">Institutional academic scope registry</p>
        </div>
        <div className="flex items-center gap-3">
          {loading && (
            <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-primary/5 text-primary text-[9px] font-black uppercase animate-pulse">
              <span className="material-symbols-outlined text-xs animate-spin">sync</span>
              Syncing
            </div>
          )}
          <span className="text-[10px] font-black bg-surface px-4 py-1.5 rounded-full text-outline border border-surfaceVariant uppercase">
            {gradeLevels.length} Levels Active
          </span>
        </div>
      </div>
      
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
        {Object.values(GradeLevel).map(grade => {
          const isActive = gradeLevels.includes(grade);
          const isPendingThis = pendingToggle === grade;
          
          return (
            <button 
              key={grade} 
              onClick={() => handleToggleClick(grade)} 
              disabled={loading}
              className={`flex items-center justify-between p-5 rounded-2xl border-2 transition-all duration-300 ${
                isActive 
                  ? 'border-primary bg-primary/5 text-primary shadow-sm' 
                  : 'border-surfaceVariant text-outline hover:border-outline/50 bg-white'
              } ${loading ? 'opacity-70 cursor-wait' : 'hover:scale-[1.02] active:scale-95'}`}
            >
              <span className="text-sm font-bold">{grade}</span>
              <div className={`w-8 h-8 rounded-xl flex items-center justify-center transition-all ${
                isActive ? 'bg-primary text-white shadow-lg shadow-primary/20' : 'bg-surface text-outline'
              }`}>
                <span className="material-symbols-outlined text-[18px] font-bold">
                  {isActive ? 'check' : 'close'}
                </span>
              </div>
            </button>
          );
        })}
      </div>

      <ConfirmationModal 
        isOpen={!!pendingToggle} 
        title={pendingToggle && gradeLevels.includes(pendingToggle) ? "Deactivate Level" : "Activate Level"} 
        message={`Confirm updating the institutional registry for ${pendingToggle}? This will affect enrollment options across the system.`} 
        confirmLabel="Update Registry" 
        type={pendingToggle && gradeLevels.includes(pendingToggle) ? "danger" : "primary"} 
        onConfirm={executeToggle} 
        onCancel={() => setPendingToggle(null)} 
        isLoading={loading}
      />
    </section>
  );
};

export default GradeLevelManagement;

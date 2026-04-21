
import React, { useMemo, useEffect } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell, PieChart, Pie } from 'recharts';
import { useStore } from '../store';
import { EnrollmentStatus } from '../types';
import { 
  getActiveLearnersForYear, 
  calculateEnrollmentComposition, 
  calculateGenderDemographics 
} from '../services/dashboardService';

const Dashboard: React.FC = () => {
  const { learners, sections, activeSchoolYear, loading, refreshData, connectionError } = useStore();

  useEffect(() => {
    // Only refresh if needed (handled internally by refreshData)
    refreshData();
  }, [activeSchoolYear.id]);

  const activeLearnersList = useMemo(() => 
    getActiveLearnersForYear(learners, sections, activeSchoolYear),
    [learners, sections, activeSchoolYear]
  );

  const displayStats = useMemo(() => {
    const totalVal = activeLearnersList.length;
    const pendingVal = activeLearnersList.filter(l => l.status === EnrollmentStatus.PENDING).length;
    const withdrawnVal = activeLearnersList.filter(l => l.status === EnrollmentStatus.WITHDRAWN).length;

    return [
      { label: `Learners (SY ${activeSchoolYear.label})`, value: totalVal, icon: 'group', color: 'bg-primary' },
      { label: 'Pending Applications', value: pendingVal, icon: 'hourglass_top', color: 'bg-accent' },
      { label: 'Withdrawn/Dropped', value: withdrawnVal, icon: 'person_off', color: 'bg-slate-600' },
    ];
  }, [activeLearnersList, activeSchoolYear]);

  const enrollmentData = useMemo(() => 
    calculateEnrollmentComposition(activeLearnersList, sections, activeSchoolYear),
    [activeLearnersList, sections, activeSchoolYear]
  );

  const genderData = useMemo(() => 
    calculateGenderDemographics(activeLearnersList),
    [activeLearnersList]
  );

  const COLORS = ['#004E8C', '#E21635', '#74777f', '#e1e2ec'];

  return (
    <div className="space-y-8 animate-in fade-in duration-700">
      {connectionError && (
        <div className="bg-amber-50 border-l-4 border-amber-500 p-4 rounded-2xl flex items-center gap-4 animate-bounce-short">
          <span className="material-symbols-outlined text-amber-600">cloud_off</span>
          <div>
            <p className="text-amber-800 text-xs font-black uppercase">Cloud Sync Unavailable</p>
            <p className="text-amber-700 text-[10px] font-bold">The system is running on local fallback data. Check your connection to sync with the central database.</p>
          </div>
        </div>
      )}

      <div className="flex justify-between items-center mb-2">
        <div>
          <h2 className="text-sm font-black text-outline uppercase tracking-widest">
            SY {activeSchoolYear.label} Intelligence
          </h2>
        </div>
        <div className="flex gap-2">
          {loading && (
            <div className="flex items-center gap-2 px-4 py-2 bg-primary/10 text-primary rounded-full text-[9px] font-black uppercase">
              <span className="material-symbols-outlined text-[16px] animate-spin">sync</span>
              Syncing...
            </div>
          )}
          <button 
            onClick={() => { refreshData(true); }}
            disabled={loading}
            className="flex items-center gap-2 bg-white px-4 py-2 rounded-full border border-surfaceVariant shadow-sm hover:bg-primary hover:text-white transition-all text-[10px] font-black uppercase disabled:opacity-50"
          >
            <span className={`material-symbols-outlined text-[18px] ${loading ? 'animate-spin' : ''}`}>refresh</span>
            Refresh Year Data
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {displayStats.map((stat) => (
          <div key={stat.label} className="bg-white p-6 rounded-3xl shadow-m3-2 border border-surfaceVariant hover:translate-y-[-4px] transition-all duration-300 relative overflow-hidden">
            <div className="flex justify-between items-start mb-4">
              <div className={`${stat.color} p-3 rounded-2xl flex items-center justify-center shadow-lg shadow-black/10`}>
                <span className="material-symbols-outlined text-white">{stat.icon}</span>
              </div>
            </div>
            <h3 className="text-sm font-bold text-outline mb-1 uppercase tracking-tight">{stat.label}</h3>
            <p className={`text-4xl font-black text-onSurface`}>
              {stat.value.toLocaleString()}
            </p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 bg-white p-8 rounded-[40px] shadow-m3-2 border border-surfaceVariant">
          <div className="flex items-center justify-between mb-8">
            <h3 className="text-xl font-black text-primary uppercase tracking-tighter">Enrollment Composition</h3>
            <span className="text-xs bg-surface px-4 py-2 rounded-full font-bold text-outline border border-surfaceVariant">SY {activeSchoolYear.label}</span>
          </div>
          <div className="h-80">
            {activeLearnersList.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={enrollmentData}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                  <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fontSize: 10, fontWeight: 900}} />
                  <YAxis axisLine={false} tickLine={false} tick={{fontSize: 12, fontWeight: 600}} />
                  <Tooltip 
                    cursor={{fill: '#f8fafc'}}
                    contentStyle={{ borderRadius: '24px', border: 'none', boxShadow: '0 10px 30px rgba(0,78,140,0.1)', padding: '16px' }}
                  />
                  <Bar dataKey="count" radius={[12, 12, 4, 4]} barSize={60}>
                    {enrollmentData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={index % 2 === 0 ? '#004E8C' : '#E21635'} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex flex-col items-center justify-center text-center p-12 space-y-4">
                <span className="material-symbols-outlined text-surfaceVariant text-6xl">bar_chart</span>
                <p className="text-outline font-medium uppercase tracking-widest text-[10px] font-black">No learner data found for SY {activeSchoolYear.label}</p>
              </div>
            )}
          </div>
        </div>

        <div className="bg-white p-8 rounded-[40px] shadow-m3-2 border border-surfaceVariant">
          <h3 className="text-xl font-black text-primary mb-8 uppercase tracking-tighter">Demographics</h3>
          <div className="h-80 flex flex-col items-center justify-center">
            {activeLearnersList.length > 0 ? (
              <>
                <ResponsiveContainer width="100%" height="80%">
                  <PieChart>
                    <Pie
                      data={genderData}
                      cx="50%"
                      cy="50%"
                      innerRadius={70}
                      outerRadius={100}
                      paddingAngle={8}
                      dataKey="value"
                      stroke="none"
                    >
                      {genderData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
                <div className="grid grid-cols-2 gap-x-8 gap-y-2 mt-4">
                  {genderData.map((entry, index) => (
                    <div key={entry.name} className="flex items-center gap-2">
                      <div className="w-4 h-4 rounded-md shadow-sm" style={{ backgroundColor: COLORS[index % COLORS.length] }}></div>
                      <span className="text-[10px] font-black text-outline uppercase">{entry.name}: {entry.value}</span>
                    </div>
                  ))}
                </div>
              </>
            ) : (
              <div className="text-center p-12 space-y-4">
                <span className="material-symbols-outlined text-surfaceVariant text-6xl">pie_chart</span>
                <p className="text-outline font-medium uppercase tracking-widest text-[10px] font-black">Waiting for Profiling...</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;

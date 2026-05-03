
import React, { useMemo, useEffect } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell, PieChart, Pie } from 'recharts';
import { useStore } from '../store';
import { EnrollmentStatus } from '../types';
import { 
  getActiveLearnersForYear, 
  calculateEnrollmentComposition, 
  calculateGenderDemographics 
} from '../services/dashboardService';
import { PublicEnrollmentResponses } from '../features/public-enrollment/PublicEnrollmentResponses';

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
        <div className="notice-box border-l-4 border-amber-500 bg-amber-50 flex items-center gap-4 animate-bounce-short">
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
            <div className="status-badge status-badge--open flex items-center gap-2">
              <span className="material-symbols-outlined text-[16px] animate-spin">sync</span>
              Syncing...
            </div>
          )}
          <button 
            onClick={() => { refreshData(true); }}
            disabled={loading}
            className="secondary-button gap-2 disabled:opacity-50"
          >
            <span className={`material-symbols-outlined text-[18px] ${loading ? 'animate-spin' : ''}`}>refresh</span>
            Refresh Year Data
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {displayStats.map((stat) => (
          <div key={stat.label} className="info-card">
            <div className="info-card__content">
              <div className="flex justify-between items-start mb-4">
                <div className={`registrar-dashboard__stat-icon ${stat.color}`}>
                  <span className="material-symbols-outlined text-white">{stat.icon}</span>
                </div>
              </div>
              <h3>{stat.label}</h3>
              <p className="registrar-dashboard__stat-value">
                {stat.value.toLocaleString()}
              </p>
            </div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="section-card lg:col-span-2">
          <div className="section-card__content">
          <div className="flex items-center justify-between mb-8">
            <h3>Enrollment Composition</h3>
            <span className="status-badge status-badge--inactive">SY {activeSchoolYear.label}</span>
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
                    contentStyle={{ borderRadius: '12px', border: '1px solid rgba(18,35,61,0.12)', boxShadow: 'none', padding: '16px' }}
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
        </div>

        <div className="section-card">
          <div className="section-card__content">
          <h3>Demographics</h3>
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

      <PublicEnrollmentResponses />
    </div>
  );
};

export default Dashboard;

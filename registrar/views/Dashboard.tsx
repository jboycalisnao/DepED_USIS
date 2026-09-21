import React, { useEffect, useMemo, useState } from 'react';
import { Bar, BarChart, CartesianGrid, Cell, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import TopCenterAlert from '../components/TopCenterAlert';
import { getActiveLearnersForYear, calculateEnrollmentComposition, calculateGenderDemographics } from '../services/dashboardService';
import { fetchPendingPublicEnrollmentSubmissionCount } from '../features/registrar/public-enrollment/services/publicEnrollmentSubmissions';
import { useStore } from '../store';
import { EnrollmentStatus, isPreviousYearUnreturnedLearner, resolveEffectiveLearnerStatus, resolvePreviousSchoolYear } from '../types';

const Dashboard: React.FC = () => {
  const { learners, sections, schoolYears, activeSchoolYear, loading, refreshData, connectionError } = useStore();
  const [showConnectionAlert, setShowConnectionAlert] = useState(false);
  const [pendingSubmissionCount, setPendingSubmissionCount] = useState(0);

  useEffect(() => {
    refreshData();
  }, [activeSchoolYear.id]);

  useEffect(() => {
    setShowConnectionAlert(Boolean(connectionError));
  }, [connectionError]);

  const activeLearnersList = useMemo(
    () => getActiveLearnersForYear(learners, sections, activeSchoolYear),
    [learners, sections, activeSchoolYear],
  );

  const previousSchoolYearInfo = useMemo(
    () => resolvePreviousSchoolYear(activeSchoolYear, schoolYears),
    [activeSchoolYear, schoolYears],
  );

  useEffect(() => {
    let active = true;
    const existingLearnerLrns = new Set(
      learners.map((learner) => String(learner.lrn || '').trim()).filter(Boolean),
    );

    void fetchPendingPublicEnrollmentSubmissionCount(activeSchoolYear.label, existingLearnerLrns)
      .then((count) => {
        if (active) setPendingSubmissionCount(count);
      })
      .catch(() => {
        if (active) setPendingSubmissionCount(0);
      });

    return () => {
      active = false;
    };
  }, [activeSchoolYear.label, learners]);

  const displayStats = useMemo(() => {
    const totalVal = activeLearnersList.length;
    // Graduated status counts all Grade 12 students from previous active school years that are not re-enrolled
    // in the current active school year, plus any explicitly marked graduated learners from the database,
    // even if they are not shown in the active UI sections.
    const graduatedVal = learners.filter(
      (l) => resolveEffectiveLearnerStatus(l, activeSchoolYear.label, sections, activeSchoolYear.id, schoolYears) === EnrollmentStatus.GRADUATED,
    ).length;

    // Previous learners count: learners in the previous school year that were not able to enroll back
    // into the current active school year (excluding graduates who completed their schooling).
    const previousUnenrolledVal = learners.filter(
      (l) => isPreviousYearUnreturnedLearner(l, activeSchoolYear, sections, schoolYears),
    ).length;

    const inactiveVal = activeLearnersList.filter(
      (l) => {
        const eff = resolveEffectiveLearnerStatus(l, activeSchoolYear.label, sections, activeSchoolYear.id, schoolYears);
        return (
          eff === EnrollmentStatus.WITHDRAWN ||
          eff === EnrollmentStatus.TRANSFER_OUT ||
          eff === EnrollmentStatus.DROP_OUT ||
          String(l.status || '').toLowerCase().includes('transfer') ||
          String(l.status || '').toLowerCase().includes('drop')
        );
      },
    ).length;

    const previousSyLabel = previousSchoolYearInfo ? `SY ${previousSchoolYearInfo.label}` : 'Previous SY';

    return [
      { label: `Learners (SY ${activeSchoolYear.label})`, value: totalVal, icon: 'group', color: 'bg-primary' },
      { label: 'Pending Applications', value: pendingSubmissionCount, icon: 'hourglass_top', color: 'bg-accent' },
      { label: 'Graduated Status', value: graduatedVal, icon: 'school', color: 'bg-indigo-700' },
      { label: `Previous Learners (${previousSyLabel})`, value: previousUnenrolledVal, icon: 'person_cancel', color: 'bg-amber-700' },
      { label: 'Transfer / Drop / Withdrawn', value: inactiveVal, icon: 'person_off', color: 'bg-slate-600' },
    ];
  }, [activeLearnersList, activeSchoolYear, learners, pendingSubmissionCount, previousSchoolYearInfo, schoolYears, sections]);

  const enrollmentData = useMemo(
    () => calculateEnrollmentComposition(activeLearnersList, sections, activeSchoolYear),
    [activeLearnersList, sections, activeSchoolYear],
  );

  const genderData = useMemo(() => calculateGenderDemographics(activeLearnersList), [activeLearnersList]);
  const COLORS = ['#004E8C', '#E21635', '#74777f', '#e1e2ec'];

  return (
    <div className="registrar-dashboard-page">
      <TopCenterAlert
        open={showConnectionAlert && Boolean(connectionError)}
        title="Cloud Sync Unavailable"
        message="The system is running on local fallback data. Check your connection to sync with the central database."
        type="accent"
        onClose={() => setShowConnectionAlert(false)}
      />

      <div className="registrar-dashboard-page__head">
        <h2 className="registrar-dashboard-page__title">SY {activeSchoolYear.label} Intelligence</h2>
        <div className="registrar-dashboard-page__actions">
          {loading && (
            <div className="status-badge status-badge--open">
              <span className="material-symbols-outlined">sync</span>
              Syncing...
            </div>
          )}
          <button onClick={() => refreshData(true)} disabled={loading} className="secondary-button">
            <span className={`material-symbols-outlined ${loading ? 'animate-spin' : ''}`}>refresh</span>
            Refresh Year Data
          </button>
        </div>
      </div>

      <div className="registrar-dashboard-page__stats">
        {displayStats.map((stat) => (
          <div key={stat.label} className="info-card">
            <div className="info-card__content">
              <div className="registrar-dashboard-page__stat-top">
                <div className={`registrar-dashboard__stat-icon ${stat.color}`}>
                  <span className="material-symbols-outlined">{stat.icon}</span>
                </div>
              </div>
              <h3>{stat.label}</h3>
              <p className="registrar-dashboard__stat-value">{stat.value.toLocaleString()}</p>
            </div>
          </div>
        ))}
      </div>

      <div className="registrar-dashboard-page__charts">
        <div className="section-card">
          <div className="section-card__content">
            <div className="registrar-dashboard-page__chart-head">
              <h3>Enrollment Composition</h3>
              <span className="status-badge status-badge--inactive">SY {activeSchoolYear.label}</span>
            </div>
            <div className="registrar-dashboard-page__chart-frame">
              {activeLearnersList.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={enrollmentData}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                    <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 10, fontWeight: 700 }} />
                    <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 12, fontWeight: 600 }} />
                    <Tooltip cursor={{ fill: '#f8fafc' }} contentStyle={{ borderRadius: '12px', border: '1px solid rgba(18,35,61,0.12)', boxShadow: 'none', padding: '16px' }} />
                    <Bar dataKey="count" radius={[12, 12, 4, 4]} barSize={60}>
                      {enrollmentData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={index % 2 === 0 ? '#004E8C' : '#E21635'} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <div className="registrar-dashboard-page__empty-chart">
                  <span className="material-symbols-outlined">bar_chart</span>
                  <p>No learner data found for SY {activeSchoolYear.label}</p>
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="section-card">
          <div className="section-card__content">
            <h3>Demographics</h3>
            <div className="registrar-dashboard-page__chart-frame">
              {activeLearnersList.length > 0 ? (
                <>
                  <ResponsiveContainer width="100%" height="80%">
                    <PieChart>
                      <Pie data={genderData} cx="50%" cy="50%" innerRadius={70} outerRadius={100} paddingAngle={8} dataKey="value" stroke="none">
                        {genderData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip />
                    </PieChart>
                  </ResponsiveContainer>
                  <div className="registrar-dashboard-page__legend">
                    {genderData.map((entry, index) => (
                      <div key={entry.name} className="registrar-dashboard-page__legend-item">
                        <div className="registrar-dashboard-page__legend-color" style={{ backgroundColor: COLORS[index % COLORS.length] }} />
                        <span>{entry.name}: {entry.value}</span>
                      </div>
                    ))}
                  </div>
                </>
              ) : (
                <div className="registrar-dashboard-page__empty-chart">
                  <span className="material-symbols-outlined">pie_chart</span>
                  <p>Waiting for profiling</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;

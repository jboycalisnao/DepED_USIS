import React from 'react';
import { Bar, BarChart, CartesianGrid, Cell, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { DEPED_COLORS } from '../../../constants';
import { Candidate, GradeLevel, Section, Student, User } from '../../../types';
import { getCacheStats } from '../../../utils/imagePersistence';
import { useStore } from '../../../supabaseStore';

interface DashboardTabProps {
  candidates: Candidate[];
  voters: User[];
  learnerDatabase: Student[];
  sections: Section[];
}

type SummaryCard = {
  title: string;
  value: string;
  detail: string;
  icon: string;
  accentClassName: string;
  valueClassName?: string;
  progressClassName?: string;
  progress?: number;
};

const DashboardTab: React.FC<DashboardTabProps> = ({ candidates, voters, learnerDatabase, sections }) => {
  const { egressSaved } = useStore();

  const eligibleLearners = learnerDatabase.filter((learner) => {
    const section = sections.find((item) => item.id === learner.sectionId);
    return section?.gradeLevel !== GradeLevel.GRADE_12;
  });

  const totalVotersParticipated = voters.filter((voter) => voter.hasVoted).length;
  const totalRegistered = eligibleLearners.length;
  const turnoutPercentage = totalRegistered > 0 ? Math.round((totalVotersParticipated / totalRegistered) * 100) : 0;

  const cacheStats = getCacheStats();
  const totalBytesSaved = cacheStats.size + egressSaved;
  const mbSaved = (totalBytesSaved / 1024 / 1024).toFixed(2);

  const summaryCards: SummaryCard[] = [
    {
      title: 'Election turnout',
      value: `${turnoutPercentage}%`,
      detail: `${totalVotersParticipated.toLocaleString()} of ${totalRegistered.toLocaleString()} eligible voters`,
      icon: 'fa-square-poll-vertical',
      accentClassName: 'bg-[#0038a8]',
      valueClassName: 'text-[#0038a8]',
      progressClassName: 'bg-[#0038a8]',
      progress: turnoutPercentage,
    },
    {
      title: 'Ballots cast',
      value: totalVotersParticipated.toLocaleString(),
      detail: `${Math.max(0, totalRegistered - totalVotersParticipated).toLocaleString()} remaining`,
      icon: 'fa-check-to-slot',
      accentClassName: 'bg-[#ce1126]',
      valueClassName: 'text-[#ce1126]',
      progressClassName: 'bg-[#ce1126]',
      progress: totalRegistered > 0 ? Math.round((totalVotersParticipated / totalRegistered) * 100) : 0,
    },
    {
      title: 'Eligible voters',
      value: totalRegistered.toLocaleString(),
      detail: 'JHS (G7-G10) and SHS (G11)',
      icon: 'fa-id-card-clip',
      accentClassName: 'bg-[#fcd116]',
      valueClassName: 'text-[#8a6a00]',
    },
    {
      title: 'Bandwidth saved',
      value: `${mbSaved}MB`,
      detail: `${cacheStats.items.toLocaleString()} cached assets`,
      icon: 'fa-server',
      accentClassName: 'bg-[#ce1126]',
      valueClassName: 'text-[#0038a8]',
    },
  ];

  const gradeLevelStats = Object.values(GradeLevel).map((grade) => {
    const isGrade12 = grade === GradeLevel.GRADE_12;
    const learnersInGrade = learnerDatabase.filter((learner) => {
      const section = sections.find((item) => item.id === learner.sectionId);
      return section?.gradeLevel === grade;
    });
    const votedInGrade = learnersInGrade.filter((learner) =>
      voters.find((voter) => voter.studentId === learner.lrn)?.hasVoted,
    ).length;
    const percentage = learnersInGrade.length > 0 ? Math.round((votedInGrade / learnersInGrade.length) * 100) : 0;

    return {
      grade,
      voted: votedInGrade,
      total: learnersInGrade.length,
      percentage,
      isGrade12,
    };
  });

  return (
    <div className="election-dashboard">
      <div className="election-dashboard__summary-grid">
        {summaryCards.map((card) => (
          <section key={card.title} className="election-dashboard__summary-card">
            <div className="election-dashboard__summary-card-inner">
              <div>
                <p className="election-dashboard__summary-label">{card.title}</p>
                <p className={`election-dashboard__summary-value ${card.valueClassName || 'text-[#0038a8]'}`}>{card.value}</p>
                <p className="election-dashboard__summary-copy">{card.detail}</p>
              </div>

              <div className={`election-dashboard__summary-icon ${card.accentClassName}`}>
                <i className={`fa-solid ${card.icon}`} />
              </div>
            </div>

            {typeof card.progress === 'number' && (
              <div className="election-dashboard__progress">
                <div className={`election-dashboard__progress-fill ${card.progressClassName || 'bg-[#0038a8]'}`} style={{ width: `${card.progress}%` }} />
              </div>
            )}
          </section>
        ))}
      </div>

      <section className="election-dashboard__panel">
        <div className="election-dashboard__panel-content">
          <div>
            <h3 className="election-dashboard__section-title">Grade-Level Participation</h3>
            <p className="election-dashboard__section-subtitle">
              Real-time turnout breakdown
            </p>
          </div>

          <div className="election-dashboard__section-grid">
            {gradeLevelStats.map((stat) => (
              <div
                key={stat.grade}
                className={[
                  'election-dashboard__stat-card',
                  stat.isGrade12 ? 'opacity-70 bg-[#f5f7fa]' : 'bg-white',
                ].join(' ')}
              >
                <div className="election-dashboard__stat-card-inner">
                  <div>
                    <h4 className="election-dashboard__stat-label text-[#0038a8]">{stat.grade}</h4>
                    <p className="election-dashboard__stat-copy">
                      {stat.isGrade12 ? 'Non-voting grade' : `${stat.voted} / ${stat.total} voters`}
                    </p>
                  </div>

                  <p className={`election-dashboard__stat-value ${stat.isGrade12 ? 'text-[#98a2b3]' : 'text-[#ce1126]'}`}>
                    {stat.isGrade12 ? 'N/A' : `${stat.percentage}%`}
                  </p>
                </div>

                <div className="election-dashboard__progress mt-5 h-[10px]">
                  {!stat.isGrade12 ? (
                    <div
                      className="election-dashboard__progress-fill bg-[#ce1126]"
                      style={{ width: `${stat.percentage}%` }}
                    />
                  ) : (
                    <div className="election-dashboard__progress-fill w-full bg-[#cfd8e3] opacity-40" />
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="election-dashboard__panel">
        <div className="election-dashboard__panel-content">
          <h3 className="election-dashboard__section-title">Candidate Performance</h3>
          <p className="election-dashboard__section-subtitle">
            Vote distribution across all registry
          </p>
          <div className="election-dashboard__chart-panel">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={candidates}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e7edf5" />
                <XAxis
                  dataKey="name"
                  axisLine={false}
                  tickLine={false}
                  tick={{ fontSize: 13, fontWeight: 700, fill: '#68758d' }}
                />
                <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 13, fill: '#98a2b3' }} />
                <Tooltip
                  cursor={{ fill: '#f8fafc' }}
                  contentStyle={{
                    borderRadius: '12px',
                    border: '1px solid rgba(18,35,61,0.08)',
                    boxShadow: '0 4px 16px rgba(18,35,61,0.08)',
                    padding: '12px 14px',
                  }}
                />
                <Bar dataKey="votes" radius={[8, 8, 0, 0]} barSize={40}>
                  {candidates.map((_, index) => (
                    <Cell
                      key={`cell-${index}`}
                      fill={
                        index % 3 === 0
                          ? DEPED_COLORS.blue
                          : index % 3 === 1
                            ? DEPED_COLORS.red
                            : DEPED_COLORS.yellow
                      }
                    />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </section>
    </div>
  );
};

export default DashboardTab;

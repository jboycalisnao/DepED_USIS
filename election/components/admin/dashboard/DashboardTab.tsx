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

const panelClassName = 'rounded-[12px] border border-[rgba(18,35,61,0.08)] bg-white shadow-sm';

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
    <div className="space-y-6 opacity-0 transition-opacity duration-300 ease-in" style={{ opacity: 1 }}>
      <section className={`${panelClassName} overflow-hidden`}>
        <div className="grid grid-cols-3" aria-hidden="true">
          <span className="h-[4px] bg-[#0038a8]" />
          <span className="h-[4px] bg-[#fcd116]" />
          <span className="h-[4px] bg-[#ce1126]" />
        </div>
        <div className="px-5 py-4 md:px-6">
          <h3 className="text-[24px] font-bold leading-tight text-[#0038a8]">Election Operations Dashboard</h3>
          <p className="mt-1 text-[13px] text-[#5b6b84]">Unified monitoring for turnout, grade participation, and candidate performance.</p>
        </div>
      </section>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
        {summaryCards.map((card) => (
          <section key={card.title} className={`${panelClassName} bg-[linear-gradient(180deg,#ffffff_0%,#f9fbff_100%)] p-5`}>
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-[13px] font-bold text-[#68758d]">{card.title}</p>
                <p className={`mt-3 text-[24px] font-bold leading-none ${card.valueClassName || 'text-[#0038a8]'}`}>{card.value}</p>
                <p className="mt-3 text-[13px] text-[#4a5568]">{card.detail}</p>
              </div>

              <div
                className={`flex h-[44px] w-[44px] items-center justify-center rounded-[12px] ${card.accentClassName} text-white`}
              >
                <i className={`fa-solid ${card.icon} text-[16px]`}></i>
              </div>
            </div>

            {typeof card.progress === 'number' && (
              <div className="mt-4 h-[8px] overflow-hidden rounded-full bg-[#e7edf5]">
                <div className={`h-full ${card.progressClassName || 'bg-[#0038a8]'}`} style={{ width: `${card.progress}%` }}></div>
              </div>
            )}
          </section>
        ))}
      </div>

      <section className={`${panelClassName} p-6 md:p-8`}>
        <div className="mb-6">
          <div>
            <h3 className="text-[24px] font-bold uppercase leading-tight text-[#0038a8]">Grade-Level Participation</h3>
            <p className="mt-1 text-[13px] font-bold text-[#68758d]">
              Real-time turnout breakdown
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
          {gradeLevelStats.map((stat) => (
            <div
              key={stat.grade}
              className={[
                'rounded-[12px] border p-5',
                stat.isGrade12
                  ? 'border-[rgba(18,35,61,0.08)] bg-[#f5f7fa] opacity-70'
                  : 'border-[rgba(18,35,61,0.08)] bg-white',
              ].join(' ')}
            >
              <div className="flex items-start justify-between gap-4">
                <div>
                  <h4 className="text-[16px] font-bold text-[#0038a8]">{stat.grade}</h4>
                  <p className="mt-1 text-[13px] font-bold text-[#68758d]">
                    {stat.isGrade12 ? 'Non-voting grade' : `${stat.voted} / ${stat.total} voters`}
                  </p>
                </div>

                <p className={`text-[24px] font-bold leading-none ${stat.isGrade12 ? 'text-[#98a2b3]' : 'text-[#ce1126]'}`}>
                  {stat.isGrade12 ? 'N/A' : `${stat.percentage}%`}
                </p>
              </div>

              <div className="mt-5 h-[10px] overflow-hidden rounded-full bg-[#e7edf5]">
                {!stat.isGrade12 ? (
                  <div
                    className="h-full bg-[#ce1126]"
                    style={{ width: `${stat.percentage}%` }}
                  ></div>
                ) : (
                  <div className="h-full w-full bg-[#cfd8e3] opacity-40"></div>
                )}
              </div>
            </div>
          ))}
        </div>
      </section>

      <section className={`${panelClassName} p-6 md:p-8`}>
        <div className="mb-6">
          <h3 className="text-[24px] font-bold uppercase leading-tight text-[#0038a8]">Candidate Performance</h3>
          <p className="mt-1 text-[13px] font-bold text-[#68758d]">
            Vote distribution across all registry
          </p>
        </div>

        <div className="h-[360px]">
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
      </section>
    </div>
  );
};

export default DashboardTab;

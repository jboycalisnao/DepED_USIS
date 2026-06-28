import { AttendanceScheduleConfig, Learner } from '../../../types';
import { UsisGlobalFooter } from '../../../../common/footer/UsisGlobalFooter';
import { UsisUnifiedHeader } from '../../../../common/header/UsisUnifiedHeader';
import TeacherLearnerAttendanceMatrix from './TeacherLearnerAttendanceMatrix';
import type { TeacherAttendanceAccessRecord } from '../../auth/utils/teacherAttendanceAccess';

type Props = {
  access: TeacherAttendanceAccessRecord;
  learners: Learner[];
  scheduleConfig: AttendanceScheduleConfig;
  onLogout: () => void;
  queryAttendanceRecordsByRange: (fromDate: string, toDate: string, learnerIds?: string[]) => Promise<
    Array<{
      id: string;
      learnerId: string;
      type: 'AM_IN' | 'AM_OUT' | 'PM_IN' | 'PM_OUT' | 'UNSCHEDULED';
      timestamp: string;
      synced?: boolean;
    }>
  >;
};

export default function TeacherSectionAttendancePage({
  access,
  learners,
  scheduleConfig,
  onLogout,
  queryAttendanceRecordsByRange,
}: Props) {
  const sectionLearners = learners.filter((learner) => String(learner.section_id || '').trim() === access.sectionId);

  return (
    <>
      <header className="site-chrome">
        <div className="content-width">
          <UsisUnifiedHeader />
          <nav className="kit-nav" aria-label="Teacher attendance sections">
            <div className="kit-nav__grid">
              <span className="kit-nav__link kit-nav__link--active">My Section</span>
            </div>
          </nav>
        </div>
      </header>

      <main className="page-frame attendance-login-page">
        <div className="content-width">
          <section className="section-shell attendance-login">
            <TeacherLearnerAttendanceMatrix
              accessLabel={`${access.sectionName} attendance matrix`}
              learners={sectionLearners}
              scheduleConfig={scheduleConfig}
              queryAttendanceRecordsByRange={queryAttendanceRecordsByRange}
              onLogout={onLogout}
            />
          </section>
        </div>
      </main>

      <UsisGlobalFooter />
    </>
  );
}

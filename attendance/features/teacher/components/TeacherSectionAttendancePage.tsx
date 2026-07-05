import { AttendanceClassDayConfig, AttendanceScheduleConfig, Learner } from '../../../types';
import { UsisGlobalFooter } from '../../../../common/footer/UsisGlobalFooter';
import { UsisUnifiedHeader } from '../../../../common/header/UsisUnifiedHeader';
import TeacherLearnerAttendanceMatrix from './TeacherLearnerAttendanceMatrix';
import type { TeacherAttendanceAccessRecord } from '../../auth/utils/teacherAttendanceAccess';

type Props = {
  access: TeacherAttendanceAccessRecord;
  schoolYearLabel: string;
  learners: Learner[];
  scheduleConfig: AttendanceScheduleConfig;
  classDayConfig: AttendanceClassDayConfig;
  noClassDates: string[];
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
  schoolYearLabel,
  learners,
  scheduleConfig,
  classDayConfig,
  noClassDates,
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
              access={access}
              schoolYearLabel={schoolYearLabel}
              learners={sectionLearners}
              scheduleConfig={scheduleConfig}
              classDayConfig={classDayConfig}
              noClassDates={noClassDates}
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

import { useEffect, useMemo, useState } from 'react';
import type { EnrollmentAnnouncement } from '../../../../common/types/enrollmentAnnouncements';
import { resolveLearnerEnrollmentAnnouncements } from '../../../../common/utils/enrollmentAnnouncements';
import {
  fetchEnrollmentAnnouncements,
  fetchInformationVerificationAndUpdateEnabled,
} from '../services/enrollmentAnnouncements';

export function useEnrollmentAnnouncements() {
  const [announcements, setAnnouncements] = useState<EnrollmentAnnouncement[]>([]);
  const [isVerificationEnabled, setIsVerificationEnabled] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    const run = async () => {
      setIsLoading(true);
      try {
        const [announcementRowsResult, verificationResult] = await Promise.allSettled([
          fetchEnrollmentAnnouncements(),
          fetchInformationVerificationAndUpdateEnabled(),
        ]);

        if (cancelled) return;
        const verificationEnabled = verificationResult.status === 'fulfilled' ? verificationResult.value : false;
        const announcementRows = announcementRowsResult.status === 'fulfilled' ? announcementRowsResult.value : [];
        setIsVerificationEnabled(verificationEnabled);
        setAnnouncements(resolveLearnerEnrollmentAnnouncements(announcementRows, verificationEnabled));
      } catch {
        if (!cancelled) {
          setIsVerificationEnabled(false);
          setAnnouncements([]);
        }
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    };

    void run();
    return () => {
      cancelled = true;
    };
  }, []);

  return useMemo(
    () => ({
      announcements,
      isVerificationEnabled,
      isLoading,
    }),
    [announcements, isVerificationEnabled, isLoading],
  );
}

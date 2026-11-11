import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import { THEME } from '../constants/theme';
import { Card } from '../components/Card';
import { PORTAL_SERVICES } from '../services/portalData';
import {
  fetchPortalAnnouncementsFromSupabase,
  fetchLearnerAttendanceFromSupabase,
  fetchLearnerGradesFromSupabase,
} from '../services/supabaseClient';
import { LearnerProfile, PortalTab, PortalAnnouncement, GradeSubject } from '../types';

interface DashboardScreenProps {
  learner: LearnerProfile;
  onNavigateTab: (tab: PortalTab, subService?: string) => void;
}

export const DashboardScreen: React.FC<DashboardScreenProps> = ({
  learner,
  onNavigateTab,
}) => {
  const [announcements, setAnnouncements] = useState<PortalAnnouncement[]>([]);
  const [isLoadingAnnouncements, setIsLoadingAnnouncements] = useState(true);
  const [attendanceSummary, setAttendanceSummary] = useState<{
    present: number;
    totalDays: number;
    attendanceRate: number | null;
  }>({
    present: 0,
    totalDays: 0,
    attendanceRate: null,
  });
  const [subjects, setSubjects] = useState<GradeSubject[]>([]);

  useEffect(() => {
    let isMounted = true;
    (async () => {
      setIsLoadingAnnouncements(true);
      try {
        const live = await fetchPortalAnnouncementsFromSupabase();
        if (isMounted) {
          setAnnouncements(live || []);
        }
      } catch {
        if (isMounted) setAnnouncements([]);
      } finally {
        if (isMounted) setIsLoadingAnnouncements(false);
      }
    })();
    return () => {
      isMounted = false;
    };
  }, []);

  useEffect(() => {
    if (!learner) return;
    let isMounted = true;
    (async () => {
      try {
        const [dbLogs, dbSubjects] = await Promise.all([
          fetchLearnerAttendanceFromSupabase(learner.id, learner.lrn),
          fetchLearnerGradesFromSupabase(learner.id, learner.lrn),
        ]);
        if (isMounted) {
          if (dbLogs && dbLogs.length > 0) {
            const present = dbLogs.filter((l) => l.status === 'Present').length;
            const totalDays = dbLogs.length;
            const attendanceRate = totalDays > 0 ? Number(((present / totalDays) * 100).toFixed(1)) : 100;
            setAttendanceSummary({ present, totalDays, attendanceRate });
          } else {
            setAttendanceSummary({ present: 0, totalDays: 0, attendanceRate: null });
          }
          setSubjects(dbSubjects || []);
        }
      } catch {
        // ignore
      }
    })();
    return () => {
      isMounted = false;
    };
  }, [learner.id, learner.lrn]);

  // Compute general average from real database subjects
  const gradedSubjects = subjects.filter((s) => s.finalRating != null);
  const generalAverage = gradedSubjects.length
    ? (
        gradedSubjects.reduce((acc, s) => acc + (s.finalRating || 0), 0) /
        gradedSubjects.length
      ).toFixed(1)
    : '--';

  const honorStanding =
    generalAverage !== '--'
      ? Number(generalAverage) >= 90
        ? 'Academic Honor Standing'
        : 'Good Standing'
      : 'No published grades yet';

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {/* Learner ID Card */}
      <Card style={styles.idCard} variant="tint">
        <View style={styles.idCardHeader}>
          <View style={styles.statusPill}>
            <View style={styles.statusDot} />
            <Text style={styles.statusPillText}>
              {learner.status === 'Graduated' ? 'Graduated' : 'Officially Enrolled'} • SY {learner.schoolYear}
            </Text>
          </View>
          <Text style={styles.schoolIdText}>School ID: {learner.schoolId}</Text>
        </View>

        <Text style={styles.learnerName}>{learner.fullName}</Text>
        <Text style={styles.lrnLabel}>LRN: {learner.lrn}</Text>

        <View style={styles.detailsRow}>
          <View style={styles.detailItem}>
            <Text style={styles.detailLabel}>Grade & Section</Text>
            <Text style={styles.detailValue}>
              {learner.gradeLevel} • {learner.section}
            </Text>
          </View>
          <View style={styles.detailItem}>
            <Text style={styles.detailLabel}>Track & Strand</Text>
            <Text style={styles.detailValue} numberOfLines={1}>
              {learner.trackStrand || 'Senior High School'}
            </Text>
          </View>
        </View>

        <View style={styles.adviserRow}>
          <Text style={styles.adviserLabel}>Class Adviser:</Text>
          <Text style={styles.adviserValue}>{learner.adviserName}</Text>
        </View>
      </Card>

      {/* Metrics Row */}
      <View style={styles.metricsGrid}>
        <TouchableOpacity
          style={styles.metricCardWrapper}
          onPress={() => onNavigateTab('services', 'attendance')}
          activeOpacity={0.8}
        >
          <Card style={styles.metricCard}>
            <Text style={styles.metricLabel}>RFID Attendance</Text>
            <Text style={[styles.metricValue, { color: THEME.colors.primary }]}>
              {attendanceSummary.attendanceRate != null ? `${attendanceSummary.attendanceRate}%` : '--'}
            </Text>
            <Text style={styles.metricSub}>
              {attendanceSummary.present > 0
                ? `${attendanceSummary.present} Days Present`
                : 'No taps on record'}
            </Text>
          </Card>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.metricCardWrapper}
          onPress={() => onNavigateTab('grades')}
          activeOpacity={0.8}
        >
          <Card style={styles.metricCard}>
            <Text style={styles.metricLabel}>General Average</Text>
            <Text
              style={[
                styles.metricValue,
                { color: generalAverage !== '--' ? THEME.colors.success : THEME.colors.inkSecondary },
              ]}
            >
              {generalAverage}
            </Text>
            <Text style={styles.metricSub}>{honorStanding}</Text>
          </Card>
        </TouchableOpacity>
      </View>

      {/* Quick Services Section */}
      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>School Services</Text>
        <TouchableOpacity onPress={() => onNavigateTab('services')}>
          <Text style={styles.viewAllText}>View all services →</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.servicesGrid}>
        {PORTAL_SERVICES.slice(0, 4).map((service) => (
          <TouchableOpacity
            key={service.id}
            style={styles.serviceItem}
            activeOpacity={0.7}
            onPress={() => onNavigateTab('services', service.routeKey)}
          >
            <Card style={styles.serviceCard}>
              <View style={styles.serviceHeader}>
                <View style={styles.serviceIconPlaceholder}>
                  <Text style={styles.serviceIconText}>📌</Text>
                </View>
                {service.routeKey === 'enrollment-history' ? (
                  <View style={styles.serviceBadge}>
                    <Text style={styles.serviceBadgeText}>SY {learner.schoolYear.slice(2, 4)}-{learner.schoolYear.slice(7, 9) || '27'}</Text>
                  </View>
                ) : service.badge ? (
                  <View style={styles.serviceBadge}>
                    <Text style={styles.serviceBadgeText}>{service.badge}</Text>
                  </View>
                ) : null}
              </View>
              <Text style={styles.serviceTitle} numberOfLines={1}>
                {service.title}
              </Text>
              <Text style={styles.serviceSubtitle} numberOfLines={2}>
                {service.subtitle}
              </Text>
            </Card>
          </TouchableOpacity>
        ))}
      </View>

      {/* Official School Announcements */}
      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>Official Announcements</Text>
        {isLoadingAnnouncements && <ActivityIndicator size="small" color={THEME.colors.depedBlue} />}
      </View>

      {isLoadingAnnouncements ? (
        <Card style={styles.emptyCard}>
          <Text style={styles.emptyText}>Loading official advisories...</Text>
        </Card>
      ) : announcements.length === 0 ? (
        <Card style={styles.emptyCard}>
          <Text style={styles.emptyTitle}>No Official Announcements</Text>
          <Text style={styles.emptyText}>
            There are no active institutional advisories posted at this time.
          </Text>
        </Card>
      ) : (
        announcements.map((item) => (
          <Card key={item.id} style={styles.announcementCard}>
            <View style={styles.announcementHeader}>
              <Text style={styles.announcementCategory}>{item.category}</Text>
              <Text style={styles.announcementDate}>{item.date}</Text>
            </View>
            <Text style={styles.announcementTitle}>{item.title}</Text>
            <Text style={styles.announcementSummary}>{item.summary}</Text>
          </Card>
        ))
      )}
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: THEME.colors.canvas,
  },
  content: {
    padding: THEME.spacing.md,
    paddingBottom: THEME.spacing.xl,
  },
  idCard: {
    marginBottom: THEME.spacing.md,
  },
  idCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: THEME.spacing.sm,
  },
  statusPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: THEME.colors.surface,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: THEME.radius.full,
    borderWidth: 1,
    borderColor: THEME.colors.lineSubtle,
  },
  statusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: THEME.colors.success,
    marginRight: 6,
  },
  statusPillText: {
    fontSize: 11,
    fontWeight: THEME.typography.weights.semibold,
    color: THEME.colors.ink,
  },
  schoolIdText: {
    fontSize: 11,
    color: THEME.colors.inkMuted,
  },
  learnerName: {
    fontSize: 20,
    fontWeight: THEME.typography.weights.bold,
    color: THEME.colors.ink,
    letterSpacing: -0.3,
  },
  lrnLabel: {
    fontSize: 12,
    color: THEME.colors.inkSecondary,
    marginBottom: THEME.spacing.md,
  },
  detailsRow: {
    flexDirection: 'row',
    borderTopWidth: 1,
    borderTopColor: THEME.colors.lineSubtle,
    paddingTop: THEME.spacing.sm,
    marginBottom: THEME.spacing.sm,
  },
  detailItem: {
    flex: 1,
  },
  detailLabel: {
    fontSize: 11,
    color: THEME.colors.inkMuted,
    marginBottom: 2,
  },
  detailValue: {
    fontSize: 13,
    fontWeight: THEME.typography.weights.semibold,
    color: THEME.colors.ink,
  },
  adviserRow: {
    flexDirection: 'row',
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: THEME.colors.lineSubtle,
    paddingTop: THEME.spacing.xs,
  },
  adviserLabel: {
    fontSize: 11,
    color: THEME.colors.inkMuted,
    marginRight: 4,
  },
  adviserValue: {
    fontSize: 12,
    fontWeight: THEME.typography.weights.semibold,
    color: THEME.colors.ink,
  },
  metricsGrid: {
    flexDirection: 'row',
    gap: THEME.spacing.sm,
    marginBottom: THEME.spacing.md,
  },
  metricCardWrapper: {
    flex: 1,
  },
  metricCard: {
    padding: THEME.spacing.md,
  },
  metricLabel: {
    fontSize: 11,
    color: THEME.colors.inkSecondary,
    fontWeight: THEME.typography.weights.medium,
    marginBottom: 4,
  },
  metricValue: {
    fontSize: 24,
    fontWeight: THEME.typography.weights.bold,
    marginBottom: 2,
  },
  metricSub: {
    fontSize: 11,
    color: THEME.colors.inkMuted,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: THEME.spacing.sm,
    marginBottom: THEME.spacing.xs,
    paddingHorizontal: 2,
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: THEME.typography.weights.bold,
    color: THEME.colors.ink,
  },
  viewAllText: {
    fontSize: 12,
    color: THEME.colors.depedBlue,
    fontWeight: THEME.typography.weights.semibold,
  },
  servicesGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: THEME.spacing.sm,
    marginBottom: THEME.spacing.md,
  },
  serviceItem: {
    width: '48.5%',
  },
  serviceCard: {
    padding: THEME.spacing.sm,
    height: 112,
    justifyContent: 'space-between',
  },
  serviceHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  serviceIconPlaceholder: {
    width: 28,
    height: 28,
    borderRadius: THEME.radius.sm,
    backgroundColor: '#e6edf8',
    alignItems: 'center',
    justifyContent: 'center',
  },
  serviceIconText: {
    fontSize: 14,
  },
  serviceBadge: {
    backgroundColor: '#f1f5f9',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: THEME.radius.full,
  },
  serviceBadgeText: {
    fontSize: 9,
    fontWeight: THEME.typography.weights.bold,
    color: THEME.colors.depedBlue,
  },
  serviceTitle: {
    fontSize: 12,
    fontWeight: THEME.typography.weights.bold,
    color: THEME.colors.ink,
  },
  serviceSubtitle: {
    fontSize: 10,
    color: THEME.colors.inkMuted,
    lineHeight: 14,
  },
  emptyCard: {
    padding: THEME.spacing.lg,
    alignItems: 'center',
    marginBottom: THEME.spacing.sm,
  },
  emptyTitle: {
    fontSize: 13,
    fontWeight: THEME.typography.weights.bold,
    color: THEME.colors.ink,
    marginBottom: 4,
  },
  emptyText: {
    fontSize: 12,
    color: THEME.colors.inkSecondary,
    textAlign: 'center',
  },
  announcementCard: {
    marginBottom: THEME.spacing.sm,
  },
  announcementHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  announcementCategory: {
    fontSize: 10,
    fontWeight: THEME.typography.weights.bold,
    color: THEME.colors.depedBlue,
    textTransform: 'uppercase',
  },
  announcementDate: {
    fontSize: 10,
    color: THEME.colors.inkMuted,
  },
  announcementTitle: {
    fontSize: 13,
    fontWeight: THEME.typography.weights.bold,
    color: THEME.colors.ink,
    marginBottom: 4,
  },
  announcementSummary: {
    fontSize: 12,
    color: THEME.colors.inkSecondary,
    lineHeight: 16,
  },
});

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
import { fetchLearnerAttendanceFromSupabase } from '../services/supabaseClient';
import { AttendanceRecord, AttendanceSummary, LearnerProfile } from '../types';

interface AttendanceScreenProps {
  learner?: LearnerProfile;
  onBack?: () => void;
}

export const AttendanceScreen: React.FC<AttendanceScreenProps> = ({
  learner,
  onBack,
}) => {
  const [logs, setLogs] = useState<AttendanceRecord[]>([]);
  const [summary, setSummary] = useState<AttendanceSummary>({
    present: 0,
    late: 0,
    absent: 0,
    excused: 0,
    totalDays: 0,
    attendanceRate: 0,
  });
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!learner) {
      setIsLoading(false);
      return;
    }
    let isMounted = true;
    (async () => {
      setIsLoading(true);
      try {
        const dbLogs = await fetchLearnerAttendanceFromSupabase(learner.id, learner.lrn);
        if (isMounted) {
          setLogs(dbLogs || []);
          if (dbLogs && dbLogs.length > 0) {
            const present = dbLogs.filter((l) => l.status === 'Present').length;
            const late = dbLogs.filter((l) => l.status === 'Late').length;
            const absent = dbLogs.filter((l) => l.status === 'Absent').length;
            const excused = dbLogs.filter((l) => l.status === 'Excused').length;
            const totalDays = dbLogs.length;
            const attendanceRate = totalDays > 0 ? Number(((present / totalDays) * 100).toFixed(1)) : 100;
            setSummary({
              present,
              late,
              absent,
              excused,
              totalDays,
              attendanceRate,
            });
          } else {
            setSummary({
              present: 0,
              late: 0,
              absent: 0,
              excused: 0,
              totalDays: 0,
              attendanceRate: 0,
            });
          }
        }
      } catch {
        if (isMounted) setLogs([]);
      } finally {
        if (isMounted) setIsLoading(false);
      }
    })();
    return () => {
      isMounted = false;
    };
  }, [learner?.id, learner?.lrn]);

  const getStatusColor = (status: AttendanceRecord['status']) => {
    switch (status) {
      case 'Present':
        return THEME.colors.success;
      case 'Late':
        return THEME.colors.warning;
      case 'Absent':
        return THEME.colors.danger;
      case 'Excused':
        return THEME.colors.info;
      default:
        return THEME.colors.textMuted;
    }
  };

  const getStatusBg = (status: AttendanceRecord['status']) => {
    switch (status) {
      case 'Present':
        return THEME.colors.successLight;
      case 'Late':
        return THEME.colors.warningLight;
      case 'Absent':
        return THEME.colors.dangerLight;
      case 'Excused':
        return THEME.colors.infoLight;
      default:
        return THEME.colors.surfaceAlt;
    }
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {/* Back button if opened from Services */}
      {onBack && (
        <TouchableOpacity style={styles.backButton} onPress={onBack} activeOpacity={0.7}>
          <Text style={styles.backButtonText}>← Back to Services Guide</Text>
        </TouchableOpacity>
      )}

      {/* Attendance Summary */}
      <Card style={styles.summaryCard} variant="tint">
        <Text style={styles.summaryKicker}>
          USIS RFID MONITORING • SY {learner?.schoolYear || '2026-2027'}
        </Text>
        <View style={styles.rateRow}>
          <Text style={styles.rateValue}>
            {summary.totalDays > 0 ? `${summary.attendanceRate}%` : '--'}
          </Text>
          <Text style={styles.rateLabel}>
            {summary.totalDays > 0 ? 'Overall Attendance Rate' : 'No Recorded Taps'}
          </Text>
        </View>

        <View style={styles.statsGrid}>
          <View style={styles.statBox}>
            <Text style={[styles.statVal, { color: THEME.colors.success }]}>{summary.present}</Text>
            <Text style={styles.statLbl}>Present</Text>
          </View>
          <View style={styles.statBox}>
            <Text style={[styles.statVal, { color: THEME.colors.warning }]}>{summary.late}</Text>
            <Text style={styles.statLbl}>Late</Text>
          </View>
          <View style={styles.statBox}>
            <Text style={[styles.statVal, { color: THEME.colors.danger }]}>{summary.absent}</Text>
            <Text style={styles.statLbl}>Absent</Text>
          </View>
          <View style={styles.statBox}>
            <Text style={[styles.statVal, { color: THEME.colors.info }]}>{summary.excused}</Text>
            <Text style={styles.statLbl}>Excused</Text>
          </View>
        </View>
      </Card>

      {/* RFID Log Feed */}
      <View style={styles.logHeaderRow}>
        <Text style={styles.listHeading}>Daily RFID Gate Tap Log</Text>
        {isLoading && <ActivityIndicator size="small" color={THEME.colors.depedBlue} />}
      </View>

      {isLoading ? (
        <View style={styles.loaderWrap}>
          <ActivityIndicator size="large" color={THEME.colors.depedBlue} />
          <Text style={styles.loaderText}>Loading attendance records from database...</Text>
        </View>
      ) : logs.length === 0 ? (
        <Card style={styles.emptyCard}>
          <Text style={styles.emptyTitle}>No Attendance Records Found</Text>
          <Text style={styles.emptySub}>
            No RFID gate tap records have been logged for LRN {learner?.lrn || 'this learner'} yet.
          </Text>
        </Card>
      ) : (
        logs.map((log) => {
          const color = getStatusColor(log.status);
          const bg = getStatusBg(log.status);

          return (
            <Card key={log.id} style={styles.logCard}>
              <View style={styles.logHeader}>
                <View>
                  <Text style={styles.logDate}>{log.date}</Text>
                  <Text style={styles.logDay}>{log.dayOfWeek}</Text>
                </View>
                <View style={[styles.statusPill, { backgroundColor: bg }]}>
                  <Text style={[styles.statusText, { color }]}>{log.status}</Text>
                </View>
              </View>

              <View style={styles.timesRow}>
                <View style={styles.timeItem}>
                  <Text style={styles.timeLabel}>Time In (Tap)</Text>
                  <Text style={styles.timeValue}>{log.timeIn || '--'}</Text>
                </View>
                <View style={styles.timeItem}>
                  <Text style={styles.timeLabel}>Time Out (Exit)</Text>
                  <Text style={styles.timeValue}>{log.timeOut || '--'}</Text>
                </View>
              </View>

              {log.remarks && (
                <Text style={styles.remarksText}>Gate: {log.remarks}</Text>
              )}
            </Card>
          );
        })
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
  backButton: {
    paddingVertical: 8,
    marginBottom: 8,
  },
  backButtonText: {
    fontSize: 13,
    color: THEME.colors.depedBlue,
    fontWeight: THEME.typography.weights.semibold,
  },
  summaryCard: {
    marginBottom: THEME.spacing.lg,
  },
  summaryKicker: {
    fontSize: 11,
    fontWeight: THEME.typography.weights.bold,
    color: THEME.colors.depedBlue,
    letterSpacing: 0.5,
    marginBottom: THEME.spacing.sm,
  },
  rateRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    marginBottom: THEME.spacing.md,
  },
  rateValue: {
    fontSize: 32,
    fontWeight: THEME.typography.weights.bold,
    color: THEME.colors.ink,
    marginRight: THEME.spacing.sm,
  },
  rateLabel: {
    fontSize: THEME.typography.sizes.body,
    color: THEME.colors.inkSecondary,
  },
  statsGrid: {
    flexDirection: 'row',
    borderTopWidth: 1,
    borderTopColor: THEME.colors.lineSubtle,
    paddingTop: THEME.spacing.md,
    justifyContent: 'space-between',
  },
  statBox: {
    alignItems: 'center',
    flex: 1,
  },
  statVal: {
    fontSize: 16,
    fontWeight: THEME.typography.weights.bold,
  },
  statLbl: {
    fontSize: 11,
    color: THEME.colors.inkMuted,
    marginTop: 2,
  },
  logHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: THEME.spacing.xs,
  },
  listHeading: {
    fontSize: THEME.typography.sizes.caption,
    fontWeight: THEME.typography.weights.bold,
    color: THEME.colors.inkMuted,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginLeft: 4,
  },
  loaderWrap: {
    alignItems: 'center',
    paddingVertical: THEME.spacing.xl,
  },
  loaderText: {
    fontSize: 12,
    color: THEME.colors.inkMuted,
    marginTop: 8,
  },
  emptyCard: {
    paddingVertical: THEME.spacing.xl,
    paddingHorizontal: THEME.spacing.lg,
    alignItems: 'center',
  },
  emptyTitle: {
    fontSize: 14,
    fontWeight: THEME.typography.weights.bold,
    color: THEME.colors.ink,
    marginBottom: 4,
    textAlign: 'center',
  },
  emptySub: {
    fontSize: 12,
    color: THEME.colors.inkSecondary,
    textAlign: 'center',
    lineHeight: 18,
  },
  logCard: {
    marginBottom: THEME.spacing.sm,
  },
  logHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: THEME.spacing.sm,
  },
  logDate: {
    fontSize: THEME.typography.sizes.body,
    fontWeight: THEME.typography.weights.semibold,
    color: THEME.colors.ink,
  },
  logDay: {
    fontSize: 11,
    color: THEME.colors.inkMuted,
  },
  statusPill: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: THEME.radius.sm,
  },
  statusText: {
    fontSize: 11,
    fontWeight: THEME.typography.weights.bold,
  },
  timesRow: {
    flexDirection: 'row',
    backgroundColor: THEME.colors.canvas,
    borderRadius: THEME.radius.sm,
    padding: THEME.spacing.sm,
    marginBottom: THEME.spacing.xs,
  },
  timeItem: {
    flex: 1,
  },
  timeLabel: {
    fontSize: 10,
    color: THEME.colors.inkMuted,
    textTransform: 'uppercase',
    marginBottom: 2,
  },
  timeValue: {
    fontSize: 13,
    fontWeight: THEME.typography.weights.semibold,
    color: THEME.colors.ink,
  },
  remarksText: {
    fontSize: 11,
    color: THEME.colors.inkSecondary,
    fontStyle: 'italic',
    marginTop: 4,
  },
});

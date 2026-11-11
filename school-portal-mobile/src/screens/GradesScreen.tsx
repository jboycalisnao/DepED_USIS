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
import { fetchLearnerGradesFromSupabase } from '../services/supabaseClient';
import { GradeSubject, LearnerProfile } from '../types';

interface GradesScreenProps {
  learner?: LearnerProfile;
}

export const GradesScreen: React.FC<GradesScreenProps> = ({ learner }) => {
  const [selectedQuarter, setSelectedQuarter] = useState<'all' | 'q1' | 'q2' | 'q3' | 'q4'>('all');
  const [subjects, setSubjects] = useState<GradeSubject[]>([]);
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
        const liveSubjects = await fetchLearnerGradesFromSupabase(learner.id, learner.lrn);
        if (isMounted) {
          setSubjects(liveSubjects || []);
        }
      } catch {
        if (isMounted) setSubjects([]);
      } finally {
        if (isMounted) setIsLoading(false);
      }
    })();
    return () => {
      isMounted = false;
    };
  }, [learner?.id, learner?.lrn]);

  const gradedSubjects = subjects.filter((s) => s.finalRating != null);
  const generalAverage = gradedSubjects.length
    ? (
        gradedSubjects.reduce((acc, s) => acc + (s.finalRating || 0), 0) /
        gradedSubjects.length
      ).toFixed(2)
    : '--';

  const honorStanding =
    generalAverage !== '--'
      ? Number(generalAverage) >= 98
        ? 'With Highest Honors'
        : Number(generalAverage) >= 95
        ? 'With High Honors'
        : Number(generalAverage) >= 90
        ? 'With Honors'
        : Number(generalAverage) >= 75
        ? 'Passed'
        : 'Failed'
      : null;

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {/* Header Banner */}
      <Card style={styles.summaryCard} variant="tint">
        <Text style={styles.summaryKicker}>
          DEPED SF9 • {learner?.schoolYear ? `SY ${learner.schoolYear}` : 'LEARNER REPORT CARD'}
        </Text>
        <View style={styles.averageRow}>
          <View>
            <Text style={styles.averageLabel}>General Weighted Average</Text>
            <Text style={styles.averageRating}>{generalAverage}</Text>
          </View>
          {honorStanding && (
            <View style={styles.honorBadge}>
              <Text style={styles.honorBadgeText}>{honorStanding}</Text>
            </View>
          )}
        </View>
        <Text style={styles.summarySub}>
          Passing mark: 75.0 • Senior High School Grading Scale (DepEd Order No. 8, s. 2015)
        </Text>
      </Card>

      {/* Quarter Filter Chips */}
      {subjects.length > 0 && (
        <View style={styles.quarterChipsRow}>
          {(['all', 'q1', 'q2', 'q3', 'q4'] as const).map((q) => (
            <TouchableOpacity
              key={q}
              onPress={() => setSelectedQuarter(q)}
              style={[
                styles.chip,
                selectedQuarter === q && styles.chipActive,
              ]}
            >
              <Text
                style={[
                  styles.chipText,
                  selectedQuarter === q && styles.chipTextActive,
                ]}
              >
                {q === 'all' ? 'All Quarters' : q.toUpperCase()}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      )}

      {/* Subjects List Header */}
      <View style={styles.sectionHeaderRow}>
        <Text style={styles.listHeading}>Subject Ratings</Text>
        {isLoading && <ActivityIndicator size="small" color={THEME.colors.depedBlue} />}
      </View>

      {isLoading ? (
        <View style={styles.loaderWrap}>
          <ActivityIndicator size="large" color={THEME.colors.depedBlue} />
          <Text style={styles.loaderText}>Loading published subjects and grades from database...</Text>
        </View>
      ) : subjects.length === 0 ? (
        <Card style={styles.emptyCard}>
          <Text style={styles.emptyTitle}>No Published Grades Yet</Text>
          <Text style={styles.emptySub}>
            No enrolled subjects or published quarter grades recorded for {learner?.gradeLevel || 'Grade 12'} - {learner?.section || 'your section'} in the database yet.
          </Text>
          <Text style={[styles.emptySub, { marginTop: 6, fontStyle: 'italic' }]}>
            Grades will appear here once officially submitted by your section subject teachers.
          </Text>
        </Card>
      ) : (
        subjects.map((subj) => (
          <Card key={subj.id} style={styles.subjectCard}>
            <View style={styles.subjectHeader}>
              <View style={styles.subjectTitleContainer}>
                <Text style={styles.subjectCode}>{subj.subjectCode}</Text>
                <Text style={styles.subjectTitle}>{subj.subjectTitle}</Text>
                <Text style={styles.teacherName}>Instructor: {subj.teacher}</Text>
              </View>
              <View style={styles.finalGradeContainer}>
                <Text style={styles.finalGradeValue}>{subj.finalRating || '--'}</Text>
                <View
                  style={[
                    styles.passedPill,
                    subj.remarks === 'Passed'
                      ? styles.passedPillSuccess
                      : subj.remarks === 'Failed'
                      ? styles.passedPillDanger
                      : styles.passedPillProgress,
                  ]}
                >
                  <Text style={styles.passedText}>{subj.remarks}</Text>
                </View>
              </View>
            </View>

            {/* Quarter Grades Grid */}
            <View style={styles.quartersGrid}>
              <View style={styles.quarterCol}>
                <Text style={styles.quarterColLabel}>Q1</Text>
                <Text style={styles.quarterColVal}>{subj.q1 ?? '--'}</Text>
              </View>
              <View style={styles.quarterCol}>
                <Text style={styles.quarterColLabel}>Q2</Text>
                <Text style={styles.quarterColVal}>{subj.q2 ?? '--'}</Text>
              </View>
              <View style={styles.quarterCol}>
                <Text style={styles.quarterColLabel}>Q3</Text>
                <Text style={styles.quarterColVal}>{subj.q3 ?? '--'}</Text>
              </View>
              <View style={styles.quarterCol}>
                <Text style={styles.quarterColLabel}>Q4</Text>
                <Text style={styles.quarterColVal}>{subj.q4 ?? '--'}</Text>
              </View>
            </View>
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
  summaryCard: {
    marginBottom: THEME.spacing.md,
  },
  summaryKicker: {
    fontSize: 11,
    fontWeight: THEME.typography.weights.bold,
    color: THEME.colors.depedBlue,
    letterSpacing: 0.5,
    marginBottom: THEME.spacing.xs,
  },
  averageRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: THEME.spacing.sm,
  },
  averageLabel: {
    fontSize: THEME.typography.sizes.caption,
    color: THEME.colors.inkSecondary,
  },
  averageRating: {
    fontSize: 32,
    fontWeight: THEME.typography.weights.bold,
    color: THEME.colors.ink,
  },
  honorBadge: {
    backgroundColor: '#dcfce7',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: THEME.radius.full,
    borderWidth: 1,
    borderColor: '#86efac',
  },
  honorBadgeText: {
    fontSize: 12,
    fontWeight: THEME.typography.weights.bold,
    color: THEME.colors.success,
  },
  summarySub: {
    fontSize: 11,
    color: THEME.colors.inkMuted,
    lineHeight: 16,
  },
  quarterChipsRow: {
    flexDirection: 'row',
    gap: 6,
    marginBottom: THEME.spacing.md,
  },
  chip: {
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: THEME.radius.full,
    backgroundColor: THEME.colors.surface,
    borderWidth: 1,
    borderColor: THEME.colors.line,
  },
  chipActive: {
    backgroundColor: THEME.colors.depedBlue,
    borderColor: THEME.colors.depedBlue,
  },
  chipText: {
    fontSize: 11,
    fontWeight: THEME.typography.weights.medium,
    color: THEME.colors.inkSecondary,
  },
  chipTextActive: {
    color: '#ffffff',
    fontWeight: THEME.typography.weights.bold,
  },
  sectionHeaderRow: {
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
  subjectCard: {
    marginBottom: THEME.spacing.sm,
  },
  subjectHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: THEME.spacing.sm,
  },
  subjectTitleContainer: {
    flex: 1,
    marginRight: THEME.spacing.sm,
  },
  subjectCode: {
    fontSize: 10,
    fontWeight: THEME.typography.weights.bold,
    color: THEME.colors.depedBlue,
    letterSpacing: 0.5,
  },
  subjectTitle: {
    fontSize: 13,
    fontWeight: THEME.typography.weights.semibold,
    color: THEME.colors.ink,
    marginTop: 2,
    marginBottom: 2,
  },
  teacherName: {
    fontSize: 11,
    color: THEME.colors.inkMuted,
  },
  finalGradeContainer: {
    alignItems: 'flex-end',
  },
  finalGradeValue: {
    fontSize: 20,
    fontWeight: THEME.typography.weights.bold,
    color: THEME.colors.ink,
  },
  passedPill: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: THEME.radius.sm,
    marginTop: 2,
  },
  passedPillSuccess: {
    backgroundColor: THEME.colors.successLight,
  },
  passedPillDanger: {
    backgroundColor: THEME.colors.dangerLight,
  },
  passedPillProgress: {
    backgroundColor: '#f1f5f9',
  },
  passedText: {
    fontSize: 10,
    fontWeight: THEME.typography.weights.bold,
    color: THEME.colors.ink,
  },
  quartersGrid: {
    flexDirection: 'row',
    backgroundColor: THEME.colors.canvas,
    borderRadius: THEME.radius.sm,
    padding: THEME.spacing.sm,
    justifyContent: 'space-between',
  },
  quarterCol: {
    alignItems: 'center',
    flex: 1,
  },
  quarterColLabel: {
    fontSize: 10,
    color: THEME.colors.inkMuted,
    fontWeight: THEME.typography.weights.semibold,
    marginBottom: 2,
  },
  quarterColVal: {
    fontSize: 13,
    fontWeight: THEME.typography.weights.semibold,
    color: THEME.colors.ink,
  },
});

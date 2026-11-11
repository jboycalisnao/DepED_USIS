import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
} from 'react-native';
import { THEME } from '../constants/theme';
import { Card } from '../components/Card';
import { Button } from '../components/Button';
import { Modal } from '../components/Modal';
import { clearLearnerSession } from '../services/authStorage';
import { LearnerProfile } from '../types';

interface ProfileScreenProps {
  learner: LearnerProfile;
  onLogout: () => void;
}

export const ProfileScreen: React.FC<ProfileScreenProps> = ({
  learner,
  onLogout,
}) => {
  const [isSignOutModalOpen, setIsSignOutModalOpen] = useState(false);

  const handleConfirmSignOut = async () => {
    await clearLearnerSession();
    setIsSignOutModalOpen(false);
    onLogout();
  };

  const getInitials = () => {
    const first = learner.firstName ? learner.firstName.charAt(0) : '';
    const last = learner.lastName ? learner.lastName.charAt(0) : '';
    return (first + last).toUpperCase() || 'SP';
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {/* Learner Identity Card */}
      <Card style={styles.profileCard}>
        <View style={styles.avatarPlaceholder}>
          <Text style={styles.avatarInitials}>{getInitials()}</Text>
        </View>
        <Text style={styles.nameText}>{learner.fullName}</Text>
        <Text style={styles.lrnText}>LRN: {learner.lrn}</Text>
        <View style={styles.statusBadge}>
          <Text style={styles.statusBadgeText}>
            {learner.status} • SY {learner.schoolYear}
          </Text>
        </View>
      </Card>

      {/* Academic Details */}
      <Text style={styles.sectionHeading}>Academic Details</Text>
      <Card style={styles.infoCard}>
        <View style={styles.infoRow}>
          <Text style={styles.infoLabel}>School</Text>
          <Text style={styles.infoVal}>{learner.schoolName} ({learner.schoolId})</Text>
        </View>
        <View style={styles.infoRow}>
          <Text style={styles.infoLabel}>Division & Region</Text>
          <Text style={styles.infoVal}>{learner.division} • {learner.region}</Text>
        </View>
        <View style={styles.infoRow}>
          <Text style={styles.infoLabel}>Grade Level</Text>
          <Text style={styles.infoVal}>{learner.gradeLevel}</Text>
        </View>
        <View style={styles.infoRow}>
          <Text style={styles.infoLabel}>Section</Text>
          <Text style={styles.infoVal}>{learner.section}</Text>
        </View>
        <View style={styles.infoRow}>
          <Text style={styles.infoLabel}>Track / Strand</Text>
          <Text style={styles.infoVal}>{learner.trackStrand || 'Senior High School'}</Text>
        </View>
        <View style={styles.infoRow}>
          <Text style={styles.infoLabel}>Class Adviser</Text>
          <Text style={styles.infoVal}>{learner.adviserName}</Text>
        </View>
      </Card>

      {/* Guardian & Contact Information */}
      <Text style={styles.sectionHeading}>Guardian & Contact Information</Text>
      <Card style={styles.infoCard}>
        <View style={styles.infoRow}>
          <Text style={styles.infoLabel}>Parent / Guardian</Text>
          <Text style={styles.infoVal}>{learner.guardianName || '--'}</Text>
        </View>
        <View style={styles.infoRow}>
          <Text style={styles.infoLabel}>Emergency Contact</Text>
          <Text style={styles.infoVal}>{learner.guardianContact || '--'}</Text>
        </View>
        <View style={styles.infoRow}>
          <Text style={styles.infoLabel}>DepEd Microsoft 365</Text>
          <Text style={styles.infoVal}>{learner.email || 'None'}</Text>
        </View>
      </Card>

      {/* Sign Out Button */}
      <Button
        title="Sign Out of Portal"
        onPress={() => setIsSignOutModalOpen(true)}
        variant="danger"
        style={styles.signOutButton}
      />

      <View style={styles.legalNotice}>
        <Text style={styles.legalNoticeText}>
          DepED Unified School Information System (USIS) • Republic of the Philippines
        </Text>
      </View>

      {/* Confirmation Modal */}
      <Modal
        visible={isSignOutModalOpen}
        title="Confirm Sign Out"
        subtitle="End your current school portal session?"
        onClose={() => setIsSignOutModalOpen(false)}
        primaryAction={{
          label: 'Sign Out',
          variant: 'danger',
          onPress: handleConfirmSignOut,
        }}
        secondaryAction={{
          label: 'Cancel',
          onPress: () => setIsSignOutModalOpen(false),
        }}
      >
        <Text style={styles.modalBodyText}>
          You will need your 12-digit LRN and portal password to sign back in.
        </Text>
      </Modal>
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
  profileCard: {
    alignItems: 'center',
    paddingVertical: THEME.spacing.xl,
    marginBottom: THEME.spacing.lg,
  },
  avatarPlaceholder: {
    width: 68,
    height: 68,
    borderRadius: 34,
    backgroundColor: THEME.colors.depedBlue,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: THEME.spacing.md,
  },
  avatarInitials: {
    color: '#ffffff',
    fontSize: 24,
    fontWeight: THEME.typography.weights.bold,
  },
  nameText: {
    fontSize: THEME.typography.sizes.body,
    fontWeight: THEME.typography.weights.bold,
    color: THEME.colors.ink,
    textAlign: 'center',
  },
  lrnText: {
    fontSize: THEME.typography.sizes.caption,
    color: THEME.colors.inkMuted,
    marginTop: 2,
  },
  statusBadge: {
    marginTop: THEME.spacing.sm,
    backgroundColor: '#e6edf8',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: THEME.radius.full,
  },
  statusBadgeText: {
    fontSize: 11,
    fontWeight: THEME.typography.weights.semibold,
    color: THEME.colors.depedBlue,
  },
  sectionHeading: {
    fontSize: THEME.typography.sizes.caption,
    fontWeight: THEME.typography.weights.bold,
    color: THEME.colors.inkMuted,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: THEME.spacing.xs,
    marginLeft: 4,
  },
  infoCard: {
    marginBottom: THEME.spacing.lg,
    paddingVertical: THEME.spacing.xs,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: THEME.colors.lineSubtle,
  },
  infoLabel: {
    fontSize: THEME.typography.sizes.caption,
    color: THEME.colors.inkSecondary,
    flex: 1,
  },
  infoVal: {
    fontSize: THEME.typography.sizes.caption,
    fontWeight: THEME.typography.weights.medium,
    color: THEME.colors.ink,
    flex: 1.6,
    textAlign: 'right',
  },
  signOutButton: {
    marginTop: THEME.spacing.md,
    borderRadius: THEME.radius.md,
  },
  legalNotice: {
    marginTop: THEME.spacing.lg,
    alignItems: 'center',
  },
  legalNoticeText: {
    fontSize: 10,
    color: THEME.colors.inkMuted,
    textAlign: 'center',
  },
  modalBodyText: {
    fontSize: THEME.typography.sizes.caption,
    color: THEME.colors.inkSecondary,
    lineHeight: 18,
  },
});

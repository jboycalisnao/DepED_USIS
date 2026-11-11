import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Image,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import { THEME } from '../constants/theme';
import { FloatingInput } from '../components/FloatingInput';
import { UsisAlertModal } from '../components/UsisAlertModal';
import { Modal } from '../components/Modal';
import {
  saveLearnerSession,
  getSavedLrn,
} from '../services/authStorage';
import { authenticateLearnerWithSupabase } from '../services/supabaseClient';
import { LearnerProfile } from '../types';

interface LoginScreenProps {
  onLoginSuccess: (learner: LearnerProfile) => void;
}

export const LoginScreen: React.FC<LoginScreenProps> = ({ onLoginSuccess }) => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [loginError, setLoginError] = useState<string | null>(null);
  const [isCredentialHelpOpen, setIsCredentialHelpOpen] = useState(false);

  useEffect(() => {
    (async () => {
      const saved = await getSavedLrn();
      if (saved) setUsername(saved);
    })();
  }, []);

  const handleManualLogin = async () => {
    const cleanLrn = username.trim();
    if (!cleanLrn) {
      setLoginError('Please enter your 12-digit Learner Reference Number (LRN).');
      return;
    }
    if (cleanLrn.length !== 12 || !/^\d{12}$/.test(cleanLrn)) {
      setLoginError('LRN must be a valid 12-digit numeric identifier.');
      return;
    }
    if (!password.trim()) {
      setLoginError('Please enter your portal password.');
      return;
    }

    setIsSubmitting(true);
    try {
      const result = await authenticateLearnerWithSupabase(cleanLrn, password.trim());
      if (!result.success || !result.learner) {
        setLoginError(result.error || 'Invalid credentials or inactive account.');
        return;
      }
      await saveLearnerSession(result.learner);
      onLoginSuccess(result.learner);
    } catch (err: any) {
      setLoginError(err?.message || 'Unable to connect to the USIS database. Please check your internet connection.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleFillAccount = (lrnVal: string, passVal: string) => {
    setUsername(lrnVal);
    setPassword(passVal);
    setIsCredentialHelpOpen(false);
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      style={styles.keyboardContainer}
    >
      <ScrollView contentContainerStyle={styles.scrollContent} bounces={false}>
        {/* Top Institutional Utility Bar */}
        <View style={styles.utilityBar}>
          <Text style={styles.utilityLeft}>Leon National High School</Text>
          <Text style={styles.utilityRight}>School Portal</Text>
        </View>

        {/* USIS Login Modal Card */}
        <View style={styles.modalCard}>
          {/* Top Tri-Color Stripe (Blue, Red, Yellow per UsisLoginModal) */}
          <View style={styles.stripeContainer}>
            <View style={styles.stripeBlue} />
            <View style={styles.stripeRed} />
            <View style={styles.stripeYellow} />
          </View>

          {/* Modal Header */}
          <View style={styles.modalHeader}>
            <Image
              source={require('../../assets/favicon.png')}
              style={styles.logo}
              resizeMode="contain"
            />
            <Text style={styles.modalTitle}>School Portal</Text>
          </View>

          {/* Modal Form */}
          <View style={styles.form}>
            <FloatingInput
              label="LRN (Learner Reference Number)"
              value={username}
              onChangeText={setUsername}
              keyboardType="number-pad"
              maxLength={12}
              disabled={isSubmitting}
            />

            <FloatingInput
              label="Password"
              value={password}
              onChangeText={setPassword}
              isPassword
              disabled={isSubmitting}
            />

            <TouchableOpacity
              activeOpacity={0.8}
              onPress={handleManualLogin}
              disabled={isSubmitting}
              style={[styles.submitButton, isSubmitting && styles.submitButtonDisabled]}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              {isSubmitting ? (
                <View style={styles.submittingRow}>
                  <ActivityIndicator size="small" color="#ffffff" style={styles.spinner} />
                  <Text style={styles.submitButtonText}>Authenticating...</Text>
                </View>
              ) : (
                <Text style={styles.submitButtonText}>Login</Text>
              )}
            </TouchableOpacity>

            {/* Helper Content matching LearnerLoginPage */}
            <View style={styles.helperContainer}>
              <TouchableOpacity
                onPress={() => setIsCredentialHelpOpen(true)}
                activeOpacity={0.7}
              >
                <Text style={styles.helperLink}>
                  Don't know your credentials? Get them here.
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>

        {/* Institutional Footer Notice */}
        <View style={styles.footer}>
          <Text style={styles.footerKicker}>
            DEPARTMENT OF EDUCATION • REGION VI WESTERN VISAYAS
          </Text>
          <Text style={styles.footerLegal}>
            Protected under Republic Act 10173 (Data Privacy Act of 2012)
          </Text>
        </View>
      </ScrollView>

      {/* Credential Helper Modal */}
      <Modal
        visible={isCredentialHelpOpen}
        title="School Portal Credentials"
        subtitle="Learner portal access is managed by the Leon NHS Registrar."
        onClose={() => setIsCredentialHelpOpen(false)}
        primaryAction={{
          label: 'Close',
          variant: 'primary',
          onPress: () => setIsCredentialHelpOpen(false),
        }}
      >
        <View style={styles.helpModalBody}>
          <Text style={styles.helpText}>
            Your credentials were automatically generated upon enrollment. Your username is your 12-digit LRN and your temporary password is provided by your class adviser or registrar.
          </Text>
          <Text style={[styles.helpText, { fontWeight: '600', marginTop: 12, marginBottom: 8 }]}>
            Quick Fill Active Database Learners:
          </Text>
          <TouchableOpacity
            style={styles.quickFillOption}
            onPress={() => handleFillAccount('116509150001', 'Caja0004')}
            activeOpacity={0.7}
          >
            <Text style={styles.quickFillName}>CAJAYON, JACOB S.</Text>
            <Text style={styles.quickFillSub}>LRN: 116509150001 • Grade 12</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.quickFillOption}
            onPress={() => handleFillAccount('116508180004', 'Cami0004')}
            activeOpacity={0.7}
          >
            <Text style={styles.quickFillName}>CAMINCE, JOVIC</Text>
            <Text style={styles.quickFillSub}>LRN: 116508180004 • Active Learner</Text>
          </TouchableOpacity>
        </View>
      </Modal>

      {/* Alert Notice Modal matching UsisAlertModal */}
      <UsisAlertModal
        open={Boolean(loginError)}
        title="Login Failed"
        message={loginError || ''}
        tone="danger"
        confirmLabel="OK"
        onClose={() => setLoginError(null)}
      />
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  keyboardContainer: {
    flex: 1,
    backgroundColor: THEME.colors.canvas,
  },
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: THEME.spacing.lg,
    paddingVertical: THEME.spacing.xl,
    justifyContent: 'center',
    maxWidth: 520,
    alignSelf: 'center',
    width: '100%',
  },
  utilityBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: THEME.spacing.sm,
    paddingHorizontal: THEME.spacing.xs,
    marginBottom: THEME.spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: THEME.colors.lineSubtle,
  },
  utilityLeft: {
    fontSize: THEME.typography.sizes.caption,
    color: THEME.colors.inkMuted,
    fontWeight: THEME.typography.weights.regular,
  },
  utilityRight: {
    fontSize: THEME.typography.sizes.caption,
    color: THEME.colors.depedBlue,
    fontWeight: THEME.typography.weights.semibold,
  },
  modalCard: {
    backgroundColor: THEME.colors.surface,
    borderRadius: THEME.radius.lg,
    borderWidth: 1,
    borderColor: THEME.colors.line,
    overflow: 'hidden',
    ...THEME.shadows.card,
  },
  stripeContainer: {
    flexDirection: 'row',
    height: 4,
    width: '100%',
  },
  stripeBlue: {
    flex: 1,
    backgroundColor: THEME.colors.depedBlue,
  },
  stripeRed: {
    flex: 1,
    backgroundColor: THEME.colors.depedRed,
  },
  stripeYellow: {
    flex: 1,
    backgroundColor: THEME.colors.depedYellow,
  },
  modalHeader: {
    alignItems: 'center',
    paddingTop: THEME.spacing.lg,
    paddingBottom: THEME.spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: THEME.colors.lineSubtle,
  },
  logo: {
    width: 44,
    height: 44,
    marginBottom: THEME.spacing.sm,
  },
  modalTitle: {
    fontSize: THEME.typography.sizes.title,
    fontWeight: THEME.typography.weights.bold,
    color: THEME.colors.ink,
    letterSpacing: -0.3,
  },
  form: {
    padding: THEME.spacing.lg,
  },
  submitButton: {
    backgroundColor: THEME.colors.depedBlue,
    paddingVertical: 12,
    borderRadius: THEME.radius.sm,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: THEME.spacing.sm,
  },
  submitButtonDisabled: {
    backgroundColor: '#93c5fd',
  },
  submittingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  spinner: {
    marginRight: 8,
  },
  submitButtonText: {
    color: '#ffffff',
    fontSize: THEME.typography.sizes.body,
    fontWeight: THEME.typography.weights.semibold,
  },
  helperContainer: {
    marginTop: THEME.spacing.md,
    alignItems: 'center',
  },
  helperLink: {
    fontSize: THEME.typography.sizes.caption,
    color: THEME.colors.depedBlue,
    textDecorationLine: 'underline',
    textAlign: 'center',
  },
  footer: {
    marginTop: THEME.spacing.xl,
    alignItems: 'center',
  },
  footerKicker: {
    fontSize: 10,
    fontWeight: THEME.typography.weights.semibold,
    color: THEME.colors.inkMuted,
    letterSpacing: 0.5,
    textAlign: 'center',
  },
  footerLegal: {
    fontSize: 9,
    color: THEME.colors.inkMuted,
    marginTop: 4,
    textAlign: 'center',
  },
  helpModalBody: {
    paddingVertical: 8,
  },
  helpText: {
    fontSize: 13,
    color: THEME.colors.inkSecondary,
    lineHeight: 18,
  },
  quickFillOption: {
    backgroundColor: THEME.colors.canvas,
    borderWidth: 1,
    borderColor: THEME.colors.line,
    borderRadius: 8,
    padding: 10,
    marginTop: 6,
  },
  quickFillName: {
    fontSize: 13,
    fontWeight: '700',
    color: THEME.colors.depedBlue,
  },
  quickFillSub: {
    fontSize: 11,
    color: THEME.colors.inkMuted,
    marginTop: 2,
  },
});

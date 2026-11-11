import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { THEME } from '../constants/theme';
import { Card } from '../components/Card';
import { Button } from '../components/Button';
import { Modal } from '../components/Modal';
import { FloatingInput } from '../components/FloatingInput';
import { UsisAlertModal } from '../components/UsisAlertModal';
import { AttendanceScreen } from './AttendanceScreen';
import {
  fetchDocumentRequestsFromSupabase,
  createDocumentRequestInSupabase,
} from '../services/supabaseClient';
import { DocumentRequest, LearnerProfile } from '../types';

interface ServicesScreenProps {
  learner?: LearnerProfile;
  initialService?: string | null;
  onClearInitialService?: () => void;
}

type ActiveSubView =
  | 'catalog'
  | 'attendance'
  | 'document-requests'
  | 'enrollment-history'
  | 'student-support'
  | 'help-ticket'
  | 'microsoft-account'
  | 'merch'
  | 'id-service';

export const ServicesScreen: React.FC<ServicesScreenProps> = ({
  learner,
  initialService,
  onClearInitialService,
}) => {
  const [subView, setSubView] = useState<ActiveSubView>('catalog');

  // Document Requests state (Real database state)
  const [requests, setRequests] = useState<DocumentRequest[]>([]);
  const [isLoadingDocs, setIsLoadingDocs] = useState(true);
  const [isDocModalOpen, setIsDocModalOpen] = useState(false);
  const [selectedDocType, setSelectedDocType] = useState<
    'Form 137 / SF10' | 'Good Moral Certificate' | 'Certificate of Enrollment' | 'Form 138 / Report Card'
  >('Certificate of Enrollment');
  const [docPurpose, setDocPurpose] = useState('');
  const [isSubmittingDoc, setIsSubmittingDoc] = useState(false);
  const [docAlert, setDocAlert] = useState<{ title: string; message: string; tone: 'success' | 'danger' } | null>(null);

  // Help Ticket state
  const [isTicketModalOpen, setIsTicketModalOpen] = useState(false);
  const [ticketSubject, setTicketSubject] = useState('');
  const [ticketDescription, setTicketDescription] = useState('');
  const [ticketSuccessMessage, setTicketSuccessMessage] = useState<string | null>(null);

  useEffect(() => {
    if (initialService) {
      if (initialService === 'attendance') setSubView('attendance');
      else if (initialService === 'document-requests') setSubView('document-requests');
      else if (initialService === 'enrollment-history') setSubView('enrollment-history');
      else if (initialService === 'support' || initialService === 'student-support') setSubView('student-support');
      else if (initialService === 'help-ticket') setSubView('help-ticket');
      else if (initialService === 'm365' || initialService === 'microsoft-account') setSubView('microsoft-account');
      else if (initialService === 'merch') setSubView('merch');
      if (onClearInitialService) onClearInitialService();
    }
  }, [initialService]);

  // Fetch real document requests from Supabase
  useEffect(() => {
    if (!learner) {
      setIsLoadingDocs(false);
      return;
    }
    let isMounted = true;
    (async () => {
      setIsLoadingDocs(true);
      try {
        const liveRequests = await fetchDocumentRequestsFromSupabase(learner.id, learner.lrn);
        if (isMounted) {
          setRequests(liveRequests || []);
        }
      } catch {
        if (isMounted) setRequests([]);
      } finally {
        if (isMounted) setIsLoadingDocs(false);
      }
    })();
    return () => {
      isMounted = false;
    };
  }, [learner?.id, learner?.lrn]);

  const handleCreateDocumentRequest = async () => {
    if (!docPurpose.trim()) {
      setDocAlert({
        title: 'Purpose Required',
        message: 'Please describe the purpose or requirement for this document request.',
        tone: 'danger',
      });
      return;
    }

    if (!learner) return;

    setIsSubmittingDoc(true);
    try {
      const res = await createDocumentRequestInSupabase({
        learnerId: learner.id,
        lrn: learner.lrn,
        documentType: selectedDocType,
        purpose: docPurpose.trim(),
      });

      if (res.success && res.request) {
        setRequests([res.request, ...requests]);
        setIsDocModalOpen(false);
        setDocPurpose('');
        setDocAlert({
          title: 'Document Request Submitted',
          message: `Your request (${res.request.trackingNumber}) has been queued to the Leon NHS Registrar.`,
          tone: 'success',
        });
      } else {
        setDocAlert({
          title: 'Submission Failed',
          message: res.error || 'Unable to submit request. Please try again.',
          tone: 'danger',
        });
      }
    } catch (err: any) {
      setDocAlert({
        title: 'Connection Error',
        message: err?.message || 'A network error occurred. Please try again.',
        tone: 'danger',
      });
    } finally {
      setIsSubmittingDoc(false);
    }
  };

  const handleSubmitTicket = () => {
    if (!ticketSubject.trim() || !ticketDescription.trim()) {
      Alert.alert('Incomplete Form', 'Please enter a ticket subject and description.');
      return;
    }
    const ticketId = `TKT-${Math.floor(100000 + Math.random() * 900000)}`;
    setIsTicketModalOpen(false);
    setTicketSubject('');
    setTicketDescription('');
    setTicketSuccessMessage(`Help ticket #${ticketId} submitted to the Registrar.`);
  };

  // Sub-views
  if (subView === 'attendance') {
    return (
      <AttendanceScreen
        learner={learner}
        onBack={() => setSubView('catalog')}
      />
    );
  }

  if (subView === 'document-requests') {
    return (
      <ScrollView style={styles.container} contentContainerStyle={styles.content}>
        <TouchableOpacity style={styles.backButton} onPress={() => setSubView('catalog')} activeOpacity={0.7}>
          <Text style={styles.backButtonText}>← Back to Services Guide</Text>
        </TouchableOpacity>

        <Card style={styles.bannerCard} variant="tint">
          <Text style={styles.bannerTitle}>Document Requests</Text>
          <Text style={styles.bannerSubtitle}>
            Request official school documents and certifications from the Registrar.
          </Text>
          <Button
            title="+ New Document Request"
            onPress={() => setIsDocModalOpen(true)}
            size="sm"
            style={styles.requestButton}
          />
        </Card>

        <View style={styles.sectionHeaderRow}>
          <Text style={styles.sectionHeading}>My Document Requests</Text>
          {isLoadingDocs && <ActivityIndicator size="small" color={THEME.colors.depedBlue} />}
        </View>

        {isLoadingDocs ? (
          <View style={styles.loaderWrap}>
            <ActivityIndicator size="large" color={THEME.colors.depedBlue} />
            <Text style={styles.loaderText}>Loading requests from database...</Text>
          </View>
        ) : requests.length === 0 ? (
          <Card style={styles.emptyCard}>
            <Text style={styles.emptyTitle}>No Document Requests Found</Text>
            <Text style={styles.emptySub}>
              You have not submitted any document requests yet. Tap '+ New Document Request' to request Form 137 / SF10, Good Moral, or Certificate of Enrollment.
            </Text>
          </Card>
        ) : (
          requests.map((req) => (
            <Card key={req.id} style={styles.requestCard}>
              <View style={styles.requestHeader}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.trackingNum}>{req.trackingNumber}</Text>
                  <Text style={styles.docTypeTitle}>{req.documentType}</Text>
                </View>
                <View
                  style={[
                    styles.statusPill,
                    req.status === 'Completed'
                      ? styles.statusCompleted
                      : req.status === 'Ready for Pickup'
                      ? styles.statusReady
                      : styles.statusPending,
                  ]}
                >
                  <Text style={styles.statusPillText}>{req.status}</Text>
                </View>
              </View>
              <Text style={styles.purposeText}>Purpose: {req.purpose}</Text>
              <View style={styles.requestFooter}>
                <Text style={styles.footerDate}>Requested: {req.requestDate}</Text>
                {req.estimatedRelease && (
                  <Text style={styles.footerRelease}>Est. Release: {req.estimatedRelease}</Text>
                )}
              </View>
            </Card>
          ))
        )}

        {/* New Request Modal */}
        <Modal
          visible={isDocModalOpen}
          title="New Document Request"
          subtitle="Request an official school record from Leon NHS Registrar."
          onClose={() => setIsDocModalOpen(false)}
          primaryAction={{
            label: isSubmittingDoc ? 'Submitting...' : 'Submit Request',
            onPress: handleCreateDocumentRequest,
          }}
          secondaryAction={{
            label: 'Cancel',
            onPress: () => setIsDocModalOpen(false),
          }}
        >
          <View style={styles.modalBody}>
            <Text style={styles.inputLabel}>Select Document Type</Text>
            {(
              [
                'Certificate of Enrollment',
                'Good Moral Certificate',
                'Form 137 / SF10',
                'Form 138 / Report Card',
              ] as const
            ).map((item) => (
              <TouchableOpacity
                key={item}
                style={[
                  styles.docOption,
                  selectedDocType === item && styles.docOptionActive,
                ]}
                onPress={() => setSelectedDocType(item)}
                activeOpacity={0.7}
              >
                <Text
                  style={[
                    styles.docOptionText,
                    selectedDocType === item && styles.docOptionTextActive,
                  ]}
                >
                  {item}
                </Text>
              </TouchableOpacity>
            ))}

            <View style={{ marginTop: 12 }}>
              <FloatingInput
                label="Purpose / School or Agency Requirement"
                value={docPurpose}
                onChangeText={setDocPurpose}
                placeholder="e.g. Scholarship Application, Passport, Transfer"
              />
            </View>
          </View>
        </Modal>

        <UsisAlertModal
          open={Boolean(docAlert)}
          title={docAlert?.title || ''}
          message={docAlert?.message || ''}
          tone={docAlert?.tone || 'info'}
          confirmLabel="OK"
          onClose={() => setDocAlert(null)}
        />
      </ScrollView>
    );
  }

  if (subView === 'enrollment-history') {
    return (
      <ScrollView style={styles.container} contentContainerStyle={styles.content}>
        <TouchableOpacity style={styles.backButton} onPress={() => setSubView('catalog')} activeOpacity={0.7}>
          <Text style={styles.backButtonText}>← Back to Services Guide</Text>
        </TouchableOpacity>

        <Card style={styles.bannerCard} variant="tint">
          <Text style={styles.bannerTitle}>Enrollment History</Text>
          <Text style={styles.bannerSubtitle}>
            Review your annual enrollment records, registered class sections, and enrollment status from the database.
          </Text>
        </Card>

        <Text style={styles.sectionHeading}>Current Enrollment Record</Text>
        <Card style={styles.infoCard}>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>School Year</Text>
            <Text style={styles.infoVal}>{learner?.schoolYear || '2026-2027'}</Text>
          </View>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Grade Level</Text>
            <Text style={styles.infoVal}>{learner?.gradeLevel || 'Grade 12'}</Text>
          </View>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Section</Text>
            <Text style={styles.infoVal}>{learner?.section || 'ZARA'}</Text>
          </View>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Enrollment Status</Text>
            <Text style={[styles.infoVal, { color: THEME.colors.depedBlue, fontWeight: '700' }]}>
              {learner?.status || 'Enrolled'}
            </Text>
          </View>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Curriculum Track</Text>
            <Text style={styles.infoVal}>{learner?.trackStrand || 'Senior High School'}</Text>
          </View>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Class Adviser</Text>
            <Text style={styles.infoVal}>{learner?.adviserName || 'Class Adviser'}</Text>
          </View>
        </Card>

        <Text style={styles.sectionHeading}>Past Enrollment Logs</Text>
        {learner?.enrollmentHistory && learner.enrollmentHistory.length > 0 ? (
          learner.enrollmentHistory.map((item, idx) => (
            <Card key={item.id || idx} style={styles.historyCard}>
              <View style={styles.historyHeader}>
                <Text style={styles.historySy}>
                  SY {item.schoolYear || '2025-2026'} • {item.gradeLevel || 'Grade Level'}
                </Text>
                <Text style={styles.historyStatus}>{item.status || 'Completed'}</Text>
              </View>
              <Text style={styles.historySub}>Section: {item.section || 'Class Section'} • Leon National High School</Text>
              {item.enrollmentDate ? (
                <Text style={styles.historySub}>Enrolled: {item.enrollmentDate}</Text>
              ) : null}
            </Card>
          ))
        ) : (
          <Card style={styles.emptyCard}>
            <Text style={styles.emptyTitle}>No Prior Enrollment History</Text>
            <Text style={styles.emptySub}>
              Initial enrollment record active for {learner?.gradeLevel} (SY {learner?.schoolYear}).
            </Text>
          </Card>
        )}
      </ScrollView>
    );
  }

  if (subView === 'student-support') {
    return (
      <ScrollView style={styles.container} contentContainerStyle={styles.content}>
        <TouchableOpacity style={styles.backButton} onPress={() => setSubView('catalog')} activeOpacity={0.7}>
          <Text style={styles.backButtonText}>← Back to Services Guide</Text>
        </TouchableOpacity>

        <Card style={styles.bannerCard} variant="tint">
          <Text style={styles.bannerTitle}>Learner Support & Guidance</Text>
          <Text style={styles.bannerSubtitle}>
            Confidential guidance counseling, clinic visits, Child Protection, and student wellness services.
          </Text>
        </Card>

        <Card style={styles.infoCard}>
          <Text style={styles.cardHeaderTitle}>Guidance and Counseling Office</Text>
          <Text style={styles.cardBodyCopy}>
            The Guidance Office provides confidential personal, social, and academic counseling to ensure every learner thrives in a safe and supportive school environment.
          </Text>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Office Hours</Text>
            <Text style={styles.infoVal}>Monday - Friday • 8:00 AM - 5:00 PM</Text>
          </View>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Guidance Counselor</Text>
            <Text style={styles.infoVal}>Ms. R. Villanueva, RGC</Text>
          </View>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Location</Text>
            <Text style={styles.infoVal}>Admin Building, 2nd Floor, Room 204</Text>
          </View>
        </Card>

        <Card style={styles.infoCard}>
          <Text style={styles.cardHeaderTitle}>School Clinic & Health Services</Text>
          <Text style={styles.cardBodyCopy}>
            Free first aid, health appraisal, nutritional counseling, and basic medical assessment.
          </Text>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>School Nurse</Text>
            <Text style={styles.infoVal}>Nurse J. Alonto, RN</Text>
          </View>
        </Card>
      </ScrollView>
    );
  }

  if (subView === 'help-ticket') {
    return (
      <ScrollView style={styles.container} contentContainerStyle={styles.content}>
        <TouchableOpacity style={styles.backButton} onPress={() => setSubView('catalog')} activeOpacity={0.7}>
          <Text style={styles.backButtonText}>← Back to Services Guide</Text>
        </TouchableOpacity>

        <Card style={styles.bannerCard} variant="tint">
          <Text style={styles.bannerTitle}>Learner Help Ticket</Text>
          <Text style={styles.bannerSubtitle}>
            Submit an official support inquiry or issue report to the Leon NHS Administration.
          </Text>
          <Button
            title="+ Submit New Ticket"
            onPress={() => setIsTicketModalOpen(true)}
            size="sm"
            style={styles.requestButton}
          />
        </Card>

        {ticketSuccessMessage && (
          <Card style={[styles.infoCard, { backgroundColor: '#ecfdf5', borderColor: '#10b981' }]}>
            <Text style={{ color: '#047857', fontWeight: '600' }}>{ticketSuccessMessage}</Text>
          </Card>
        )}

        <Modal
          visible={isTicketModalOpen}
          title="Submit Help Ticket"
          subtitle="Your ticket will be routed to the appropriate department."
          onClose={() => setIsTicketModalOpen(false)}
          primaryAction={{
            label: 'Submit Ticket',
            onPress: handleSubmitTicket,
          }}
          secondaryAction={{
            label: 'Cancel',
            onPress: () => setIsTicketModalOpen(false),
          }}
        >
          <View style={styles.modalBody}>
            <FloatingInput
              label="Subject / Topic"
              value={ticketSubject}
              onChangeText={setTicketSubject}
              placeholder="e.g. Schedule concern, LRN issue, RFID tap error"
            />
            <View style={{ marginTop: 12 }}>
              <FloatingInput
                label="Detailed Description"
                value={ticketDescription}
                onChangeText={setTicketDescription}
                placeholder="Provide details about your inquiry..."
              />
            </View>
          </View>
        </Modal>
      </ScrollView>
    );
  }

  if (subView === 'microsoft-account') {
    return (
      <ScrollView style={styles.container} contentContainerStyle={styles.content}>
        <TouchableOpacity style={styles.backButton} onPress={() => setSubView('catalog')} activeOpacity={0.7}>
          <Text style={styles.backButtonText}>← Back to Services Guide</Text>
        </TouchableOpacity>

        <Card style={styles.bannerCard} variant="tint">
          <Text style={styles.bannerTitle}>Microsoft 365 Account</Text>
          <Text style={styles.bannerSubtitle}>
            Official Department of Education Microsoft account for MS Teams, OneDrive, and Outlook.
          </Text>
        </Card>

        <Card style={styles.infoCard}>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Account Status</Text>
            <Text style={[styles.infoVal, { color: THEME.colors.success, fontWeight: '700' }]}>Active</Text>
          </View>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Official Email / UPN</Text>
            <Text style={styles.infoVal}>{learner?.email || `${learner?.lrn}@r6.deped.gov.ph`}</Text>
          </View>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Subscription Tier</Text>
            <Text style={styles.infoVal}>Microsoft 365 A3 for Students</Text>
          </View>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Cloud Storage</Text>
            <Text style={styles.infoVal}>1 TB OneDrive Cloud Storage</Text>
          </View>
        </Card>

        <Card style={styles.infoCard}>
          <Text style={styles.cardHeaderTitle}>Password Reset & Support</Text>
          <Text style={styles.cardBodyCopy}>
            To reset your Microsoft 365 password, approach the School ICT Coordinator or use the Help Ticket service.
          </Text>
        </Card>
      </ScrollView>
    );
  }

  if (subView === 'merch') {
    return (
      <ScrollView style={styles.container} contentContainerStyle={styles.content}>
        <TouchableOpacity style={styles.backButton} onPress={() => setSubView('catalog')} activeOpacity={0.7}>
          <Text style={styles.backButtonText}>← Back to Services Guide</Text>
        </TouchableOpacity>

        <Card style={styles.bannerCard} variant="tint">
          <Text style={styles.bannerTitle}>School Merchandise Hub</Text>
          <Text style={styles.bannerSubtitle}>
            Official Leon NHS school uniform patches, PE uniforms, and council accessories.
          </Text>
        </Card>

        <Card style={styles.infoCard}>
          <Text style={styles.cardHeaderTitle}>Official School Patch & ID Lanyard</Text>
          <Text style={styles.cardBodyCopy}>Embroidered institutional patch and USIS sublimation lanyard.</Text>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Price</Text>
            <Text style={[styles.infoVal, { fontWeight: '700' }]}>₱120.00</Text>
          </View>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Availability</Text>
            <Text style={[styles.infoVal, { color: THEME.colors.success }]}>In Stock</Text>
          </View>
        </Card>

        <Card style={styles.infoCard}>
          <Text style={styles.cardHeaderTitle}>Senior High PE Uniform Set</Text>
          <Text style={styles.cardBodyCopy}>Official DepEd dry-fit shirt and jogging pants.</Text>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Price</Text>
            <Text style={[styles.infoVal, { fontWeight: '700' }]}>₱450.00</Text>
          </View>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Availability</Text>
            <Text style={[styles.infoVal, { color: THEME.colors.success }]}>Available for Order</Text>
          </View>
        </Card>
      </ScrollView>
    );
  }

  // Primary 10-Item Services Catalog matching web servicesCatalog.ts
  const catalogServices = [
    {
      num: '01',
      title: 'Attendance Service',
      description: 'View your recorded attendance entries from the RFID attendance subsystem.',
      action: 'View Attendance',
      onPress: () => setSubView('attendance'),
      disabled: false,
    },
    {
      num: '02',
      title: 'Enrollment History',
      description: 'View your yearly enrollment records, class sections, and latest enrollment status.',
      action: 'View History',
      onPress: () => setSubView('enrollment-history'),
      disabled: false,
    },
    {
      num: '03',
      title: 'Document Requests',
      description: 'Request school documents and monitor request progress.',
      action: 'View Requests',
      onPress: () => setSubView('document-requests'),
      disabled: false,
    },
    {
      num: '04',
      title: 'Student Support',
      description: 'Access guidance and referral services when available.',
      action: 'Open Support',
      onPress: () => setSubView('student-support'),
      disabled: false,
    },
    {
      num: '05',
      title: 'Help Ticket',
      description: 'Submit a learner help ticket using your registrar profile details.',
      action: 'Open Ticket',
      onPress: () => setSubView('help-ticket'),
      disabled: false,
    },
    {
      num: '06',
      title: 'Microsoft Account',
      description: 'View your school Microsoft email status or create one if none is linked yet.',
      action: 'Open Account',
      onPress: () => setSubView('microsoft-account'),
      disabled: false,
    },
    {
      num: '07',
      title: 'PTA Fee',
      description: 'PTA fee services are temporarily unavailable and will reopen soon.',
      action: 'Coming Soon',
      disabled: true,
      disabledNote: 'PTA fee services are temporarily disabled.',
    },
    {
      num: '08',
      title: 'Merch',
      description: 'Browse school merchandise and place your order request.',
      action: 'Open Merch',
      onPress: () => setSubView('merch'),
      disabled: false,
    },
    {
      num: '09',
      title: 'Merch Control',
      description: 'Manage class-section merchandise visibility and view learner order details.',
      action: 'Open Merch Control',
      onPress: () => Alert.alert('Merch Control', 'Access restricted to authorized section coordinators.'),
      disabled: false,
    },
    {
      num: '10',
      title: 'ID',
      description: 'Request a learner ID creation during an open order period.',
      action: 'Unavailable',
      disabled: true,
      disabledNote: 'ID service is not published yet.',
    },
  ];

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {/* Banner matching web portal-panel */}
      <Card style={styles.bannerCard} variant="tint">
        <Text style={styles.bannerTitle}>Services Guide</Text>
        <Text style={styles.bannerSubtitle}>
          Browse available learner services in order and select any service to open its page.
        </Text>
      </Card>

      {/* Services List matching web learner-services-list */}
      <View style={styles.servicesList}>
        {catalogServices.map((svc) => (
          <TouchableOpacity
            key={svc.num}
            style={[
              styles.serviceCard,
              svc.disabled && styles.serviceCardDisabled,
            ]}
            onPress={svc.disabled ? undefined : svc.onPress}
            activeOpacity={svc.disabled ? 1 : 0.7}
          >
            <View style={styles.orderNumberWrap}>
              <Text style={styles.orderNumberText}>{svc.num}</Text>
            </View>

            <View style={styles.serviceContent}>
              <View style={styles.titleRow}>
                <Text style={styles.serviceTitleText}>{svc.title}</Text>
                {svc.disabledNote && (
                  <Text style={styles.disabledBadge}>{svc.disabledNote}</Text>
                )}
              </View>
              <Text style={styles.serviceDescText}>{svc.description}</Text>
            </View>

            <View style={styles.actionWrap}>
              <Text
                style={[
                  styles.actionText,
                  svc.disabled && styles.actionTextDisabled,
                ]}
              >
                {svc.action}
              </Text>
            </View>
          </TouchableOpacity>
        ))}
      </View>
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
  bannerCard: {
    marginBottom: THEME.spacing.md,
  },
  bannerTitle: {
    fontSize: THEME.typography.sizes.title,
    fontWeight: THEME.typography.weights.bold,
    color: THEME.colors.ink,
    marginBottom: 4,
  },
  bannerSubtitle: {
    fontSize: THEME.typography.sizes.caption,
    color: THEME.colors.inkSecondary,
    lineHeight: 18,
  },
  requestButton: {
    marginTop: THEME.spacing.md,
    alignSelf: 'flex-start',
  },
  servicesList: {
    gap: 8,
  },
  serviceCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: THEME.colors.surface,
    borderWidth: 1,
    borderColor: THEME.colors.line,
    borderRadius: THEME.radius.md,
    padding: THEME.spacing.md,
    marginBottom: 6,
    ...THEME.shadows.card,
  },
  serviceCardDisabled: {
    opacity: 0.65,
    backgroundColor: '#fafafa',
  },
  orderNumberWrap: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#e6edf8',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  orderNumberText: {
    fontSize: 12,
    fontWeight: THEME.typography.weights.bold,
    color: THEME.colors.depedBlue,
  },
  serviceContent: {
    flex: 1,
    marginRight: 8,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 6,
    marginBottom: 2,
  },
  serviceTitleText: {
    fontSize: 14,
    fontWeight: THEME.typography.weights.bold,
    color: THEME.colors.ink,
  },
  disabledBadge: {
    fontSize: 10,
    color: THEME.colors.depedRed,
    fontWeight: THEME.typography.weights.medium,
  },
  serviceDescText: {
    fontSize: 11,
    color: THEME.colors.inkMuted,
    lineHeight: 16,
  },
  actionWrap: {
    paddingLeft: 6,
  },
  actionText: {
    fontSize: 12,
    fontWeight: THEME.typography.weights.semibold,
    color: THEME.colors.depedBlue,
  },
  actionTextDisabled: {
    color: THEME.colors.inkMuted,
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: THEME.spacing.xs,
  },
  sectionHeading: {
    fontSize: THEME.typography.sizes.caption,
    fontWeight: THEME.typography.weights.bold,
    color: THEME.colors.inkMuted,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: THEME.spacing.sm,
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
    marginBottom: THEME.spacing.sm,
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
  requestCard: {
    marginBottom: THEME.spacing.sm,
  },
  requestHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 6,
  },
  trackingNum: {
    fontSize: 10,
    fontWeight: THEME.typography.weights.bold,
    color: THEME.colors.depedBlue,
    letterSpacing: 0.5,
  },
  docTypeTitle: {
    fontSize: 14,
    fontWeight: THEME.typography.weights.semibold,
    color: THEME.colors.ink,
  },
  statusPill: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: THEME.radius.sm,
  },
  statusPending: {
    backgroundColor: THEME.colors.warningLight,
  },
  statusReady: {
    backgroundColor: '#dbeafe',
  },
  statusCompleted: {
    backgroundColor: THEME.colors.successLight,
  },
  statusPillText: {
    fontSize: 11,
    fontWeight: THEME.typography.weights.bold,
    color: THEME.colors.ink,
  },
  purposeText: {
    fontSize: 12,
    color: THEME.colors.inkSecondary,
    marginBottom: 8,
  },
  requestFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    borderTopWidth: 1,
    borderTopColor: THEME.colors.lineSubtle,
    paddingTop: 6,
  },
  footerDate: {
    fontSize: 11,
    color: THEME.colors.inkMuted,
  },
  footerRelease: {
    fontSize: 11,
    color: THEME.colors.depedBlue,
    fontWeight: THEME.typography.weights.medium,
  },
  infoCard: {
    marginBottom: THEME.spacing.md,
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
    flex: 1.5,
    textAlign: 'right',
  },
  historyCard: {
    marginBottom: THEME.spacing.sm,
  },
  historyHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  historySy: {
    fontSize: 13,
    fontWeight: THEME.typography.weights.bold,
    color: THEME.colors.ink,
  },
  historyStatus: {
    fontSize: 11,
    fontWeight: THEME.typography.weights.semibold,
    color: THEME.colors.success,
  },
  historySub: {
    fontSize: 11,
    color: THEME.colors.inkMuted,
    marginTop: 2,
  },
  cardHeaderTitle: {
    fontSize: 14,
    fontWeight: THEME.typography.weights.bold,
    color: THEME.colors.ink,
    marginBottom: 4,
  },
  cardBodyCopy: {
    fontSize: 12,
    color: THEME.colors.inkSecondary,
    lineHeight: 18,
    marginBottom: 8,
  },
  modalBody: {
    paddingVertical: 8,
  },
  inputLabel: {
    fontSize: 12,
    fontWeight: THEME.typography.weights.semibold,
    color: THEME.colors.inkSecondary,
    marginBottom: 8,
  },
  docOption: {
    padding: 10,
    borderRadius: THEME.radius.sm,
    borderWidth: 1,
    borderColor: THEME.colors.line,
    marginBottom: 6,
  },
  docOptionActive: {
    borderColor: THEME.colors.depedBlue,
    backgroundColor: '#e6edf8',
  },
  docOptionText: {
    fontSize: 13,
    color: THEME.colors.ink,
  },
  docOptionTextActive: {
    color: THEME.colors.depedBlue,
    fontWeight: THEME.typography.weights.bold,
  },
});

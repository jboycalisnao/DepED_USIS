import React, { useState, useEffect } from 'react';
import {
  StyleSheet,
  View,
  Text,
  TouchableOpacity,
  ActivityIndicator,
  Platform,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import {
  SafeAreaProvider,
  SafeAreaView,
  useSafeAreaInsets,
} from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { THEME } from './src/constants/theme';
import { Header } from './src/components/Header';
import { LoginScreen } from './src/screens/LoginScreen';
import { DashboardScreen } from './src/screens/DashboardScreen';
import { GradesScreen } from './src/screens/GradesScreen';
import { ServicesScreen } from './src/screens/ServicesScreen';
import { ProfileScreen } from './src/screens/ProfileScreen';
import { getLearnerSession } from './src/services/authStorage';
import { LearnerProfile, PortalTab } from './src/types';

function AppContent() {
  const [learner, setLearner] = useState<LearnerProfile | null>(null);
  const [activeTab, setActiveTab] = useState<PortalTab>('dashboard');
  const [targetService, setTargetService] = useState<string | null>(null);
  const [isInitializing, setIsInitializing] = useState(true);
  const insets = useSafeAreaInsets();

  useEffect(() => {
    (async () => {
      try {
        const session = await getLearnerSession();
        if (session) {
          setLearner(session);
        }
      } finally {
        setIsInitializing(false);
      }
    })();
  }, []);

  const handleLoginSuccess = (profile: LearnerProfile) => {
    setLearner(profile);
    setActiveTab('dashboard');
  };

  const handleLogout = () => {
    setLearner(null);
    setActiveTab('dashboard');
  };

  const handleNavigateTab = (tab: PortalTab, subService?: string) => {
    setActiveTab(tab);
    if (subService) {
      setTargetService(subService);
    }
  };

  if (isInitializing) {
    return (
      <View style={styles.loadingScreen}>
        <ActivityIndicator size="large" color={THEME.colors.depedBlue} />
        <Text style={styles.loadingText}>Initializing USIS Portal...</Text>
      </View>
    );
  }

  // Safe area padding calculation for Android 3-button navigation:
  // The Android 3-button navigation bar (square, circle, triangle) is 48-56dp tall.
  // We guarantee at least 56dp inset on Android (or insets.bottom + 10dp if system reports higher)
  // so the tab buttons sit completely above the system navigation buttons.
  const androidBottomPadding = Math.max(insets.bottom, 48) + 12;
  const bottomPadding = Platform.OS === 'android' ? androidBottomPadding : Math.max(insets.bottom, 12) + 6;

  return (
    <SafeAreaView style={styles.safeContainer} edges={['top', 'left', 'right']}>
      <StatusBar style="dark" backgroundColor={THEME.colors.surface} />
      {!learner ? (
        <LoginScreen onLoginSuccess={handleLoginSuccess} />
      ) : (
        <View style={styles.portalContainer}>
          {/* USIS Unified Header */}
          <Header
            schoolName={learner.schoolName}
            learnerSub={`${learner.gradeLevel} - ${learner.section} • ${learner.fullName}`}
            statusBadge={learner.status}
          />

          {/* Main Content Area */}
          <View style={styles.screenBody}>
            {activeTab === 'dashboard' && (
              <DashboardScreen
                learner={learner}
                onNavigateTab={handleNavigateTab}
              />
            )}
            {activeTab === 'grades' && <GradesScreen learner={learner} />}
            {activeTab === 'services' && (
              <ServicesScreen
                learner={learner}
                initialService={targetService}
                onClearInitialService={() => setTargetService(null)}
              />
            )}
            {activeTab === 'profile' && (
              <ProfileScreen learner={learner} onLogout={handleLogout} />
            )}
          </View>

          {/* 4-Tab Bottom Navigation matching School Portal (Dashboard, Grades, Services, Profile) */}
          <View
            style={[
              styles.tabBar,
              {
                paddingBottom: bottomPadding,
                minHeight: 52 + bottomPadding,
              },
            ]}
          >
            <TabButton
              label="Home"
              iconActive="home"
              iconInactive="home-outline"
              active={activeTab === 'dashboard'}
              onPress={() => setActiveTab('dashboard')}
            />
            <TabButton
              label="Grades"
              iconActive="school"
              iconInactive="school-outline"
              active={activeTab === 'grades'}
              onPress={() => setActiveTab('grades')}
            />
            <TabButton
              label="Services"
              iconActive="grid"
              iconInactive="grid-outline"
              active={activeTab === 'services'}
              onPress={() => setActiveTab('services')}
            />
            <TabButton
              label="Profile"
              iconActive="person"
              iconInactive="person-outline"
              active={activeTab === 'profile'}
              onPress={() => setActiveTab('profile')}
            />
          </View>
        </View>
      )}
    </SafeAreaView>
  );
}

export default function App() {
  return (
    <SafeAreaProvider>
      <AppContent />
    </SafeAreaProvider>
  );
}

interface TabButtonProps {
  label: string;
  iconActive: keyof typeof Ionicons.glyphMap;
  iconInactive: keyof typeof Ionicons.glyphMap;
  active: boolean;
  onPress: () => void;
}

const TabButton: React.FC<TabButtonProps> = ({
  label,
  iconActive,
  iconInactive,
  active,
  onPress,
}) => (
  <TouchableOpacity
    activeOpacity={0.7}
    onPress={onPress}
    style={[styles.tabButton, active && styles.tabButtonActive]}
    hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
  >
    <Ionicons
      name={active ? iconActive : iconInactive}
      size={22}
      color={active ? THEME.colors.depedBlue : THEME.colors.inkSecondary}
      style={styles.tabIcon}
    />
    <Text style={[styles.tabLabel, active && styles.tabLabelActive]}>
      {label}
    </Text>
  </TouchableOpacity>
);

const styles = StyleSheet.create({
  safeContainer: {
    flex: 1,
    backgroundColor: THEME.colors.canvas,
  },
  loadingScreen: {
    flex: 1,
    backgroundColor: THEME.colors.canvas,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    fontSize: THEME.typography.sizes.body,
    color: THEME.colors.inkSecondary,
    marginTop: THEME.spacing.md,
  },
  portalContainer: {
    flex: 1,
    backgroundColor: THEME.colors.canvas,
  },
  screenBody: {
    flex: 1,
  },
  tabBar: {
    flexDirection: 'row',
    backgroundColor: THEME.colors.surface,
    borderTopWidth: 1,
    borderTopColor: THEME.colors.line,
    paddingTop: 8,
    paddingHorizontal: THEME.spacing.md,
    justifyContent: 'space-around',
    alignItems: 'flex-start',
    ...THEME.shadows.card,
  },
  tabButton: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 4,
    paddingHorizontal: 12,
    borderRadius: THEME.radius.sm,
    minWidth: 64,
  },
  tabButtonActive: {
    backgroundColor: '#e6edf8',
  },
  tabIcon: {
    marginBottom: 3,
  },
  tabLabel: {
    fontSize: 11,
    fontWeight: THEME.typography.weights.medium,
    color: THEME.colors.inkSecondary,
  },
  tabLabelActive: {
    color: THEME.colors.depedBlue,
    fontWeight: THEME.typography.weights.bold,
  },
});

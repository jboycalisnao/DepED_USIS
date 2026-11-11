import React from 'react';
import { View, Text, Image, StyleSheet } from 'react-native';
import { THEME } from '../constants/theme';

interface HeaderProps {
  moduleKicker?: string;
  moduleTitle?: string;
  schoolName?: string;
  learnerSub?: string;
  statusBadge?: string;
  rightAction?: React.ReactNode;
}

export const Header: React.FC<HeaderProps> = ({
  moduleKicker = 'DEPED USIS',
  moduleTitle = 'School Portal',
  schoolName = 'Leon National High School',
  learnerSub,
  statusBadge,
  rightAction,
}) => {
  return (
    <View style={styles.container}>
      {/* Top Utility Bar matching .kit-header__utility */}
      <View style={styles.utilityBar}>
        <Text style={styles.utilitySchool}>{schoolName}</Text>
        <Text style={styles.utilityModule}>School Portal</Text>
      </View>

      {/* Main Identity Row matching .kit-header__main */}
      <View style={styles.mainRow}>
        <View style={styles.identityGroup}>
          <Image
            source={require('../../assets/favicon.png')}
            style={styles.logo}
            resizeMode="contain"
          />
          <View style={styles.moduleBlock}>
            <Text style={styles.moduleKicker}>{moduleKicker}</Text>
            <Text style={styles.moduleTitle}>{moduleTitle}</Text>
          </View>
        </View>

        {statusBadge ? (
          <View style={styles.statusPill}>
            <View style={styles.statusDot} />
            <Text style={styles.statusText}>{statusBadge}</Text>
          </View>
        ) : rightAction ? (
          <View>{rightAction}</View>
        ) : null}
      </View>

      {/* Learner Info Banner */}
      {learnerSub ? (
        <View style={styles.learnerBar}>
          <Text style={styles.learnerText} numberOfLines={1}>
            {learnerSub}
          </Text>
        </View>
      ) : null}

      {/* Bottom DepEd Blue Institutional Stripe matching header.css border-bottom */}
      <View style={styles.bottomStripe} />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: THEME.colors.surface,
  },
  utilityBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: THEME.spacing.lg,
    paddingVertical: THEME.spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: THEME.colors.line,
  },
  utilitySchool: {
    fontSize: 12,
    color: THEME.colors.inkMuted,
    fontWeight: THEME.typography.weights.regular,
  },
  utilityModule: {
    fontSize: 12,
    color: THEME.colors.depedBlue,
    fontWeight: THEME.typography.weights.semibold,
  },
  mainRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: THEME.spacing.lg,
    paddingVertical: THEME.spacing.md,
  },
  identityGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  logo: {
    width: 44,
    height: 44,
  },
  moduleBlock: {
    marginLeft: THEME.spacing.md,
    paddingLeft: THEME.spacing.md,
    borderLeftWidth: 3,
    borderLeftColor: THEME.colors.lineDivider,
    justifyContent: 'center',
  },
  moduleKicker: {
    fontSize: 10,
    fontWeight: THEME.typography.weights.bold,
    color: THEME.colors.depedRed, // Official DepEd Red kicker
    letterSpacing: 0.5,
  },
  moduleTitle: {
    fontSize: THEME.typography.sizes.subheading,
    fontWeight: THEME.typography.weights.bold,
    color: THEME.colors.depedBlue, // Official DepEd Blue title
  },
  statusPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: THEME.colors.successLight,
    paddingHorizontal: THEME.spacing.sm,
    paddingVertical: 3,
    borderRadius: THEME.radius.full,
    borderWidth: 1,
    borderColor: THEME.colors.successBorder,
  },
  statusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: THEME.colors.success,
    marginRight: 4,
  },
  statusText: {
    fontSize: THEME.typography.sizes.tag,
    fontWeight: THEME.typography.weights.bold,
    color: THEME.colors.success,
  },
  learnerBar: {
    backgroundColor: THEME.colors.surfaceAlt,
    paddingHorizontal: THEME.spacing.lg,
    paddingVertical: 4,
    borderTopWidth: 1,
    borderTopColor: THEME.colors.lineSubtle,
  },
  learnerText: {
    fontSize: 11,
    color: THEME.colors.inkSecondary,
    fontWeight: THEME.typography.weights.medium,
  },
  bottomStripe: {
    height: 3,
    backgroundColor: THEME.colors.depedBlue, // 3px DepEd Blue bottom bar
    width: '100%',
  },
});

import React from 'react';
import { View, StyleSheet, ViewStyle, StyleProp } from 'react-native';
import { THEME } from '../constants/theme';

interface CardProps {
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
  variant?: 'default' | 'flat' | 'tint';
}

export const Card: React.FC<CardProps> = ({ children, style, variant = 'default' }) => {
  return (
    <View
      style={[
        styles.base,
        variant === 'default' && styles.default,
        variant === 'flat' && styles.flat,
        variant === 'tint' && styles.tint,
        style,
      ]}
    >
      {children}
    </View>
  );
};

const styles = StyleSheet.create({
  base: {
    borderRadius: THEME.radius.box, // 12px per AGENTS.md
    padding: THEME.spacing.lg,
    backgroundColor: THEME.colors.surface,
  },
  default: {
    borderWidth: 1,
    borderColor: THEME.colors.line,
    ...THEME.shadows.card,
  },
  flat: {
    borderWidth: 1,
    borderColor: THEME.colors.line,
  },
  tint: {
    backgroundColor: '#f0f5fc',
    borderWidth: 1,
    borderColor: '#c7d9f7',
  },
});

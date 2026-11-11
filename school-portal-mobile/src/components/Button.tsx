import React from 'react';
import {
  TouchableOpacity,
  Text,
  StyleSheet,
  ActivityIndicator,
  ViewStyle,
  TextStyle,
  StyleProp,
  View,
} from 'react-native';
import { THEME } from '../constants/theme';

interface ButtonProps {
  title: string;
  onPress: () => void;
  variant?: 'primary' | 'secondary' | 'danger' | 'outline' | 'ghost';
  size?: 'sm' | 'md' | 'lg';
  loading?: boolean;
  disabled?: boolean;
  icon?: React.ReactNode;
  style?: StyleProp<ViewStyle>;
  textStyle?: StyleProp<TextStyle>;
}

export const Button: React.FC<ButtonProps> = ({
  title,
  onPress,
  variant = 'primary',
  size = 'md',
  loading = false,
  disabled = false,
  icon,
  style,
  textStyle,
}) => {
  const isDisabled = disabled || loading;

  return (
    <TouchableOpacity
      activeOpacity={0.8}
      onPress={onPress}
      disabled={isDisabled}
      style={[
        styles.base,
        styles[variant],
        styles[`size_${size}`],
        isDisabled && styles.disabled,
        style,
      ]}
      hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
    >
      {loading ? (
        <ActivityIndicator
          size="small"
          color={variant === 'outline' || variant === 'ghost' ? THEME.colors.depedBlue : '#ffffff'}
        />
      ) : (
        <View style={styles.content}>
          {icon ? <View style={styles.iconContainer}>{icon}</View> : null}
          <Text
            style={[
              styles.text,
              styles[`text_${variant}`],
              styles[`textSize_${size}`],
              isDisabled && styles.textDisabled,
              textStyle,
            ]}
          >
            {title}
          </Text>
        </View>
      )}
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  base: {
    borderRadius: THEME.radius.sm,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconContainer: {
    marginRight: THEME.spacing.sm,
  },
  // Sizes (Strict touch ergonomics: >= 44pt touch area per mobile-template.md)
  size_sm: {
    minHeight: 36,
    paddingHorizontal: THEME.spacing.md,
    paddingVertical: THEME.spacing.xs,
  },
  size_md: {
    minHeight: 44, // 44pt target
    paddingHorizontal: THEME.spacing.lg,
    paddingVertical: THEME.spacing.sm,
  },
  size_lg: {
    minHeight: 48,
    paddingHorizontal: THEME.spacing.xl,
    paddingVertical: THEME.spacing.md,
  },
  // Variants
  primary: {
    backgroundColor: THEME.colors.depedBlue,
  },
  secondary: {
    backgroundColor: THEME.colors.surfaceAlt,
    borderWidth: 1,
    borderColor: THEME.colors.line,
  },
  danger: {
    backgroundColor: THEME.colors.danger,
  },
  outline: {
    backgroundColor: 'transparent',
    borderWidth: 1.5,
    borderColor: THEME.colors.depedBlue,
  },
  ghost: {
    backgroundColor: 'transparent',
  },
  disabled: {
    opacity: 0.5,
    backgroundColor: THEME.colors.line,
  },
  // Text Styles
  text: {
    fontWeight: THEME.typography.weights.semibold,
  },
  text_primary: {
    color: '#ffffff',
  },
  text_secondary: {
    color: THEME.colors.ink,
  },
  text_danger: {
    color: '#ffffff',
  },
  text_outline: {
    color: THEME.colors.depedBlue,
  },
  text_ghost: {
    color: THEME.colors.depedBlue,
  },
  textDisabled: {
    color: THEME.colors.inkMuted,
  },
  textSize_sm: {
    fontSize: THEME.typography.sizes.caption,
  },
  textSize_md: {
    fontSize: THEME.typography.sizes.body,
  },
  textSize_lg: {
    fontSize: THEME.typography.sizes.subheading,
  },
});

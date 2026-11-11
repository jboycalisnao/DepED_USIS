import React from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  TextInputProps,
  StyleProp,
  ViewStyle,
} from 'react-native';
import { THEME } from '../constants/theme';

interface InputProps extends TextInputProps {
  label: string;
  error?: string;
  helperText?: string;
  containerStyle?: StyleProp<ViewStyle>;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
}

export const Input: React.FC<InputProps> = ({
  label,
  error,
  helperText,
  containerStyle,
  leftIcon,
  rightIcon,
  style,
  ...rest
}) => {
  return (
    <View style={[styles.container, containerStyle]}>
      <Text style={styles.label}>{label}</Text>
      <View
        style={[
          styles.inputWrapper,
          error ? styles.inputError : null,
        ]}
      >
        {leftIcon ? <View style={styles.leftIconWrapper}>{leftIcon}</View> : null}
        <TextInput
          placeholderTextColor={THEME.colors.textMuted}
          style={[styles.input, style]}
          {...rest}
        />
        {rightIcon ? <View style={styles.rightIconWrapper}>{rightIcon}</View> : null}
      </View>
      {error ? (
        <Text style={styles.errorText}>{error}</Text>
      ) : helperText ? (
        <Text style={styles.helperText}>{helperText}</Text>
      ) : null}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginBottom: THEME.spacing.md,
  },
  label: {
    fontSize: THEME.typography.sizes.caption,
    fontWeight: THEME.typography.weights.medium,
    color: THEME.colors.textSecondary,
    marginBottom: THEME.spacing.xs,
  },
  inputWrapper: {
    minHeight: 46, // >= 44pt touch area
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: THEME.colors.border,
    borderRadius: THEME.radius.sm,
    backgroundColor: THEME.colors.surface,
    paddingHorizontal: THEME.spacing.md,
  },
  inputError: {
    borderColor: THEME.colors.danger,
    backgroundColor: THEME.colors.dangerLight,
  },
  input: {
    flex: 1,
    fontSize: THEME.typography.sizes.body,
    color: THEME.colors.textPrimary,
    paddingVertical: THEME.spacing.sm,
  },
  leftIconWrapper: {
    marginRight: THEME.spacing.sm,
  },
  rightIconWrapper: {
    marginLeft: THEME.spacing.sm,
  },
  errorText: {
    fontSize: THEME.typography.sizes.tag,
    color: THEME.colors.danger,
    marginTop: THEME.spacing.xs,
  },
  helperText: {
    fontSize: THEME.typography.sizes.tag,
    color: THEME.colors.textMuted,
    marginTop: THEME.spacing.xs,
  },
});

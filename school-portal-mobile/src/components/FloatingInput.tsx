import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  TouchableOpacity,
  TextInputProps,
  StyleProp,
  ViewStyle,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { THEME } from '../constants/theme';

interface FloatingInputProps extends TextInputProps {
  label: string;
  value: string;
  onChangeText: (text: string) => void;
  isPassword?: boolean;
  disabled?: boolean;
  error?: string;
  containerStyle?: StyleProp<ViewStyle>;
}

export const FloatingInput: React.FC<FloatingInputProps> = ({
  label,
  value,
  onChangeText,
  isPassword = false,
  disabled = false,
  error,
  containerStyle,
  ...rest
}) => {
  const [isFocused, setIsFocused] = useState(false);
  const [isPasswordVisible, setIsPasswordVisible] = useState(false);

  const isFloating = isFocused || (value && value.length > 0);

  return (
    <View style={[styles.wrapper, containerStyle]}>
      <View
        style={[
          styles.container,
          isFocused && styles.containerFocused,
          error ? styles.containerError : null,
          disabled && styles.containerDisabled,
        ]}
      >
        <Text
          style={[
            styles.label,
            isFloating ? styles.labelFloating : styles.labelPlaceholder,
          ]}
        >
          {label}
        </Text>

        <TextInput
          value={value}
          onChangeText={onChangeText}
          editable={!disabled}
          onFocus={() => setIsFocused(true)}
          onBlur={() => setIsFocused(false)}
          secureTextEntry={isPassword && !isPasswordVisible}
          style={[
            styles.input,
            isFloating && styles.inputWithFloatingLabel,
          ]}
          placeholderTextColor="transparent"
          {...rest}
        />

        {isPassword && (
          <TouchableOpacity
            style={styles.eyeButton}
            onPress={() => setIsPasswordVisible((prev) => !prev)}
            disabled={disabled}
            hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
            activeOpacity={0.7}
          >
            <Ionicons
              name={isPasswordVisible ? 'eye-off-outline' : 'eye-outline'}
              size={20}
              color={THEME.colors.inkSecondary}
            />
          </TouchableOpacity>
        )}
      </View>
      {error ? <Text style={styles.errorText}>{error}</Text> : null}
    </View>
  );
};

const styles = StyleSheet.create({
  wrapper: {
    marginBottom: THEME.spacing.md,
  },
  container: {
    minHeight: 62,
    borderRadius: THEME.radius.sm,
    borderWidth: 1,
    borderColor: THEME.colors.line,
    backgroundColor: THEME.colors.surfaceAlt,
    paddingHorizontal: THEME.spacing.lg,
    justifyContent: 'center',
    position: 'relative',
  },
  containerFocused: {
    borderColor: THEME.colors.borderFocus,
    backgroundColor: THEME.colors.surface,
  },
  containerError: {
    borderColor: THEME.colors.danger,
    backgroundColor: THEME.colors.dangerLight,
  },
  containerDisabled: {
    opacity: 0.6,
    backgroundColor: '#f1f5f9',
  },
  label: {
    position: 'absolute',
    left: THEME.spacing.lg,
    color: THEME.colors.inkSecondary,
    fontWeight: THEME.typography.weights.regular,
  },
  labelPlaceholder: {
    top: 20,
    fontSize: THEME.typography.sizes.body,
  },
  labelFloating: {
    top: 8,
    fontSize: 11,
    color: THEME.colors.depedBlue,
    fontWeight: THEME.typography.weights.medium,
  },
  input: {
    fontSize: THEME.typography.sizes.body,
    color: THEME.colors.ink,
    paddingVertical: 0,
    paddingRight: 32,
    fontWeight: THEME.typography.weights.regular,
  },
  inputWithFloatingLabel: {
    paddingTop: 16,
    paddingBottom: 2,
  },
  eyeButton: {
    position: 'absolute',
    right: THEME.spacing.lg,
    top: 20,
    padding: 2,
  },
  errorText: {
    fontSize: THEME.typography.sizes.tag,
    color: THEME.colors.danger,
    marginTop: 4,
    marginLeft: 2,
  },
});

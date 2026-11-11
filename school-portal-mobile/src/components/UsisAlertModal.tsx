import React from 'react';
import {
  Modal,
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TouchableWithoutFeedback,
} from 'react-native';
import { THEME } from '../constants/theme';

interface UsisAlertModalProps {
  open: boolean;
  title: string;
  message: string;
  tone?: 'info' | 'success' | 'warning' | 'danger';
  confirmLabel?: string;
  cancelLabel?: string;
  onClose: () => void;
  onConfirm?: () => void;
}

export const UsisAlertModal: React.FC<UsisAlertModalProps> = ({
  open,
  title,
  message,
  tone = 'info',
  confirmLabel = 'OK',
  cancelLabel = 'Cancel',
  onClose,
  onConfirm,
}) => {
  if (!open) return null;

  return (
    <Modal
      visible={open}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <TouchableWithoutFeedback onPress={onClose}>
        <View style={styles.backdrop}>
          <TouchableWithoutFeedback>
            <View style={[styles.dialog, styles[`tone_${tone}`]]}>
              <View style={styles.content}>
                <Text style={styles.title}>{title}</Text>
                <Text style={styles.message}>{message}</Text>
              </View>

              <View style={styles.actions}>
                {onConfirm ? (
                  <TouchableOpacity
                    style={styles.cancelButton}
                    onPress={onClose}
                    activeOpacity={0.7}
                    hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                  >
                    <Text style={styles.cancelText}>{cancelLabel}</Text>
                  </TouchableOpacity>
                ) : null}

                <TouchableOpacity
                  style={[
                    styles.confirmButton,
                    onConfirm ? styles.confirmButtonPrimary : styles.confirmButtonBlue,
                  ]}
                  onPress={() => {
                    if (onConfirm) onConfirm();
                    onClose();
                  }}
                  activeOpacity={0.8}
                  hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                >
                  <Text style={styles.confirmText}>{confirmLabel}</Text>
                </TouchableOpacity>
              </View>
            </View>
          </TouchableWithoutFeedback>
        </View>
      </TouchableWithoutFeedback>
    </Modal>
  );
};

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(18, 35, 61, 0.45)', // Matching .modal-backdrop
    justifyContent: 'center',
    alignItems: 'center',
    padding: THEME.spacing.lg,
  },
  dialog: {
    width: '100%',
    maxWidth: 380,
    backgroundColor: THEME.colors.surface,
    borderRadius: THEME.radius.sm,
    borderWidth: 1,
    borderColor: THEME.colors.line,
    ...THEME.shadows.modal,
    overflow: 'hidden',
  },
  tone_danger: {
    borderTopWidth: 4,
    borderTopColor: THEME.colors.danger,
  },
  tone_warning: {
    borderTopWidth: 4,
    borderTopColor: THEME.colors.warning,
  },
  tone_success: {
    borderTopWidth: 4,
    borderTopColor: THEME.colors.success,
  },
  tone_info: {
    borderTopWidth: 4,
    borderTopColor: THEME.colors.depedBlue,
  },
  content: {
    padding: THEME.spacing.xl,
  },
  title: {
    fontSize: THEME.typography.sizes.subheading,
    fontWeight: THEME.typography.weights.bold,
    color: THEME.colors.ink,
    marginBottom: THEME.spacing.sm,
  },
  message: {
    fontSize: THEME.typography.sizes.body,
    color: THEME.colors.inkSecondary,
    lineHeight: 20,
    fontWeight: THEME.typography.weights.regular,
  },
  actions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    alignItems: 'center',
    padding: THEME.spacing.md,
    gap: THEME.spacing.sm,
    borderTopWidth: 1,
    borderTopColor: THEME.colors.lineSubtle,
    backgroundColor: THEME.colors.surfaceAlt,
  },
  cancelButton: {
    minHeight: 40,
    paddingHorizontal: THEME.spacing.lg,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: THEME.radius.sm,
  },
  cancelText: {
    fontSize: THEME.typography.sizes.body,
    color: THEME.colors.inkSecondary,
    fontWeight: THEME.typography.weights.medium,
  },
  confirmButton: {
    minHeight: 40,
    minWidth: 80,
    paddingHorizontal: THEME.spacing.xl,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: THEME.radius.sm,
  },
  confirmButtonBlue: {
    backgroundColor: THEME.colors.depedBlue, // Matching .alert-modal__blue
  },
  confirmButtonPrimary: {
    backgroundColor: THEME.colors.depedBlue,
  },
  confirmText: {
    fontSize: THEME.typography.sizes.body,
    color: '#ffffff',
    fontWeight: THEME.typography.weights.semibold,
  },
});

import React from 'react';
import {
  Modal as RNModal,
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TouchableWithoutFeedback,
  ScrollView,
} from 'react-native';
import { THEME } from '../constants/theme';
import { Button } from './Button';

interface ModalProps {
  visible: boolean;
  title: string;
  subtitle?: string;
  onClose: () => void;
  children: React.ReactNode;
  primaryAction?: {
    label: string;
    onPress: () => void;
    loading?: boolean;
    variant?: 'primary' | 'danger';
  };
  secondaryAction?: {
    label: string;
    onPress: () => void;
  };
}

export const Modal: React.FC<ModalProps> = ({
  visible,
  title,
  subtitle,
  onClose,
  children,
  primaryAction,
  secondaryAction,
}) => {
  return (
    <RNModal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <TouchableWithoutFeedback onPress={onClose}>
        <View style={styles.overlay}>
          <TouchableWithoutFeedback>
            <View style={styles.dialog}>
              <View style={styles.header}>
                <View style={styles.titleContainer}>
                  <Text style={styles.title}>{title}</Text>
                  {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
                </View>
                <TouchableOpacity
                  onPress={onClose}
                  style={styles.closeButton}
                  hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
                >
                  <Text style={styles.closeIcon}>✕</Text>
                </TouchableOpacity>
              </View>

              <ScrollView style={styles.body} bounces={false}>
                {children}
              </ScrollView>

              {(primaryAction || secondaryAction) && (
                <View style={styles.footer}>
                  {secondaryAction ? (
                    <Button
                      title={secondaryAction.label}
                      onPress={secondaryAction.onPress}
                      variant="secondary"
                      style={styles.actionButton}
                    />
                  ) : null}
                  {primaryAction ? (
                    <Button
                      title={primaryAction.label}
                      onPress={primaryAction.onPress}
                      variant={primaryAction.variant || 'primary'}
                      loading={primaryAction.loading}
                      style={styles.actionButton}
                    />
                  ) : null}
                </View>
              )}
            </View>
          </TouchableWithoutFeedback>
        </View>
      </TouchableWithoutFeedback>
    </RNModal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.55)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: THEME.spacing.lg,
  },
  dialog: {
    width: '100%',
    maxWidth: 440,
    backgroundColor: THEME.colors.surface,
    borderRadius: THEME.radius.box, // 12px box per AGENTS.md
    borderWidth: 1,
    borderColor: THEME.colors.border,
    ...THEME.shadows.modal,
    overflow: 'hidden',
    maxHeight: '85%',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    padding: THEME.spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: THEME.colors.border,
    backgroundColor: '#ffffff',
  },
  titleContainer: {
    flex: 1,
    paddingRight: THEME.spacing.md,
  },
  title: {
    fontSize: THEME.typography.sizes.subheading,
    fontWeight: THEME.typography.weights.bold,
    color: THEME.colors.textPrimary,
  },
  subtitle: {
    fontSize: THEME.typography.sizes.caption,
    color: THEME.colors.textSecondary,
    marginTop: 2,
  },
  closeButton: {
    width: 32,
    height: 32,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: THEME.radius.sm,
    backgroundColor: THEME.colors.surfaceAlt,
  },
  closeIcon: {
    fontSize: 14,
    color: THEME.colors.textSecondary,
    fontWeight: THEME.typography.weights.bold,
  },
  body: {
    padding: THEME.spacing.lg,
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: THEME.spacing.sm,
    padding: THEME.spacing.md,
    borderTopWidth: 1,
    borderTopColor: THEME.colors.border,
    backgroundColor: THEME.colors.surfaceAlt,
  },
  actionButton: {
    minWidth: 100,
  },
});

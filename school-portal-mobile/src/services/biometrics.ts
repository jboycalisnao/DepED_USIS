import * as LocalAuthentication from 'expo-local-authentication';
import { Platform, Alert } from 'react-native';

export interface BiometricAuthResult {
  success: boolean;
  type?: string;
  reason?: string;
  error?: unknown;
}

/**
 * Biometric Passkey Pattern
 * Reusable biometric authentication matching Section 4 of mobile-template.md.
 */
export async function authenticateWithBiometrics(
  customMessage = 'Authenticate with Biometric Passkey'
): Promise<BiometricAuthResult> {
  try {
    if (Platform.OS === 'web') {
      return { success: true, type: 'WebAuthn/Simulated' };
    }

    // 1. Verify device hardware
    const hasHardware = await LocalAuthentication.hasHardwareAsync();
    if (!hasHardware) {
      Alert.alert('Unsupported', 'This device does not support biometric authentication.');
      return { success: false, reason: 'NO_HARDWARE' };
    }

    // 2. Verify biometric enrollment
    const isEnrolled = await LocalAuthentication.isEnrolledAsync();
    if (!isEnrolled) {
      Alert.alert(
        'Not Enrolled',
        'No biometrics found. Please set up a fingerprint or Face ID in device settings.'
      );
      return { success: false, reason: 'NOT_ENROLLED' };
    }

    // 3. Prompt user
    const result = await LocalAuthentication.authenticateAsync({
      promptMessage: customMessage,
      fallbackLabel: 'Use Device PIN / Passcode',
      cancelLabel: 'Cancel',
      disableDeviceFallback: false,
    });

    return result;
  } catch (error: any) {
    Alert.alert('Authentication Error', error?.message || 'An unexpected biometric error occurred.');
    return { success: false, error };
  }
}

/**
 * Check if the device has biometric authentication hardware and enrolled credentials.
 */
export async function checkBiometricAvailability(): Promise<{
  available: boolean;
  biometryType: string;
}> {
  if (Platform.OS === 'web') {
    return { available: true, biometryType: 'Web Passkey' };
  }

  try {
    const hasHardware = await LocalAuthentication.hasHardwareAsync();
    const isEnrolled = await LocalAuthentication.isEnrolledAsync();
    const types = await LocalAuthentication.supportedAuthenticationTypesAsync();

    let biometryType = 'Biometrics';
    if (types.includes(LocalAuthentication.AuthenticationType.FACIAL_RECOGNITION)) {
      biometryType = 'Face ID';
    } else if (types.includes(LocalAuthentication.AuthenticationType.FINGERPRINT)) {
      biometryType = 'Fingerprint';
    }

    return {
      available: hasHardware && isEnrolled,
      biometryType,
    };
  } catch {
    return { available: false, biometryType: 'None' };
  }
}

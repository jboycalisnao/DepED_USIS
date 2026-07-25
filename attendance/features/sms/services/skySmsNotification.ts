type SkySmsSendPayload = {
  apiKey?: string;
  phoneNumber: string;
  message: string;
};

type SkySmsSendResponse = {
  ok: boolean;
  message?: string;
  details?: unknown;
  forwarded?: unknown;
  gatewayStatus?: number;
  gatewayResponseText?: string;
  gatewayRequest?: unknown;
};

const normalize = (value: unknown) => String(value ?? '').trim();

const stringifyDetails = (value: unknown) => {
  if (value == null) return '';
  if (typeof value === 'string') return value;
  try {
    return JSON.stringify(value);
  } catch {
    return String(value);
  }
};

export const normalizePhilippineMobileNumber = (value: string) => {
  const digits = normalize(value).replace(/[^\d+]/g, '');
  if (!digits) return '';

  if (/^\+639\d{9}$/.test(digits)) return digits;
  if (/^639\d{9}$/.test(digits)) return `+${digits}`;
  if (/^09\d{9}$/.test(digits)) return `+63${digits.slice(1)}`;

  return '';
};

export async function sendSkySmsNotification(payload: SkySmsSendPayload): Promise<SkySmsSendResponse> {
  const response = await fetch('/api/sms-notification', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      apiKey: normalize(payload.apiKey),
      phoneNumber: normalize(payload.phoneNumber),
      message: normalize(payload.message),
    }),
  });

  const rawText = await response.text().catch(() => '');
  let data: SkySmsSendResponse | null = null;
  try {
    data = rawText ? (JSON.parse(rawText) as SkySmsSendResponse) : null;
  } catch {
    data = null;
  }

  if (!response.ok || data?.ok === false) {
    const details = stringifyDetails(data?.details || data?.forwarded || data?.gatewayResponseText);
    const requestDetails = stringifyDetails(data?.gatewayRequest);
    const message = [
      data?.message || `Unable to send SMS (${response.status}).`,
      `Status ${data?.gatewayStatus || response.status}`,
      details ? `Details: ${details}` : '',
      requestDetails ? `Request: ${requestDetails}` : '',
    ].filter(Boolean).join(' ');
    throw new Error(message);
  }

  const forwardedDetails = stringifyDetails(data?.forwarded);
  return {
    ...(data || { ok: true }),
    message: forwardedDetails
      ? `${data?.message || 'SMS sent.'} Gateway: ${forwardedDetails}`
      : data?.message || 'SMS sent.',
  };
}

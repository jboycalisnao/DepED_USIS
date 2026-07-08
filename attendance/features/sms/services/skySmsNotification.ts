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
};

const normalize = (value: unknown) => String(value ?? '').trim();

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
    const message = data?.message || `Unable to send SMS (${response.status}).`;
    throw new Error(message);
  }

  return data || { ok: true, message: 'SMS sent.' };
}

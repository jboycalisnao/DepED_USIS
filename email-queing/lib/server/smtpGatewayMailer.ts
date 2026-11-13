import net from 'node:net';
import tls from 'node:tls';

export const ALLOWED_GATEWAY_DOMAIN = 'leonnhs.edu.ph';
const CRLF = '\r\n';
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const SMTP_QUEUE_INTERVAL_MS = 1000;

export type GatewaySmtpConfigStatus = {
  ok: true;
  configured: boolean;
  host: string;
  port: number;
  defaultFrom: string;
  defaultFromName: string;
  allowedDomain: string;
  missing: string[];
};

export type SendGatewayEmailInput = {
  fromEmail?: string;
  fromName?: string;
  to: string[];
  cc?: string[];
  replyTo?: string;
  subject: string;
  text: string;
  html?: string;
};

export type SendGatewayEmailResult = {
  ok: true;
  host: string;
  port: number;
  from: string;
  sentTo: string[];
  ccSent: string[];
};

type ResolvedGatewaySmtpConfig = {
  host: string;
  port: number;
  secure: boolean;
  username: string;
  password: string;
  defaultFrom: string;
  defaultFromName: string;
  skipAuth: boolean;
  missing: string[];
};

const normalize = (value: unknown) => String(value ?? '').trim();

const encodeBase64 = (value: string) => Buffer.from(value, 'utf8').toString('base64');

const sanitizeHeader = (value: string) => value.replace(/[\r\n]+/g, ' ').trim();

const encodeHeaderValue = (value: string): string => {
  const clean = sanitizeHeader(value);
  return /[^\x20-\x7E]/.test(clean) ? `=?UTF-8?B?${encodeBase64(clean)}?=` : clean;
};

export const normalizeEmailList = (input: unknown): string[] => {
  const rawList = Array.isArray(input)
    ? input
    : typeof input === 'string'
      ? input.split(/[;,]/)
      : [];

  const seen = new Set<string>();
  const out: string[] = [];
  for (const item of rawList) {
    const email = normalize(item).toLowerCase();
    if (!email || !EMAIL_REGEX.test(email) || seen.has(email)) continue;
    seen.add(email);
    out.push(email);
  }
  return out;
};

export const isAllowedGatewaySender = (email: string): boolean => {
  const clean = normalize(email).toLowerCase();
  return EMAIL_REGEX.test(clean) && clean.endsWith(`@${ALLOWED_GATEWAY_DOMAIN}`);
};

const resolveSmtpSecure = (value: string | undefined, port: number): boolean => {
  const normalized = normalize(value).toLowerCase();
  if (!normalized || normalized === 'auto') return port === 465;
  if (['true', '1', 'yes', 'ssl', 'tls', 'implicit', 'implicit-tls'].includes(normalized)) {
    return true;
  }
  if (['false', '0', 'no', 'starttls', 'explicit', 'explicit-tls'].includes(normalized)) {
    return false;
  }
  return port === 465;
};

const resolveEnvConfig = (
  env: Record<string, string | undefined> = process.env,
): ResolvedGatewaySmtpConfig => {
  const host =
    normalize(env.IA_SMTP_HOST || env.SMTP_HOST || env.ATTENDANCE_SMTP_HOST) ||
    'smtp-relay.gmail.com';
  const port = Number(
    normalize(env.IA_SMTP_PORT || env.SMTP_PORT || env.ATTENDANCE_SMTP_PORT) || 587,
  );
  const secure = resolveSmtpSecure(
    env.IA_SMTP_SECURE || env.SMTP_SECURE || env.ATTENDANCE_SMTP_SECURE,
    port,
  );
  const username = normalize(
    env.IA_SMTP_USER || env.SMTP_USER || env.ATTENDANCE_SMTP_USER,
  );
  const password = normalize(
    env.IA_SMTP_APP_PASSWORD ||
      env.IA_SMTP_PASSWORD ||
      env.SMTP_APP_PASSWORD ||
      env.SMTP_PASSWORD ||
      env.ATTENDANCE_SMTP_APP_PASSWORD ||
      env.ATTENDANCE_SMTP_PASSWORD,
  ).replace(/\s+/g, '');

  const rawFrom =
    normalize(env.IA_SMTP_FROM || env.SMTP_FROM || env.ATTENDANCE_SMTP_FROM) ||
    (isAllowedGatewaySender(username) ? username : `noreply@${ALLOWED_GATEWAY_DOMAIN}`);
  const defaultFrom = rawFrom.toLowerCase();

  const defaultFromName =
    normalize(env.IA_SMTP_FROM_NAME || env.SMTP_FROM_NAME) ||
    'Leon NHS - USIS Transactional Gateway';

  const isIpAllowlistRelay = host.toLowerCase() === 'smtp-relay.gmail.com' && !username && !password;
  const skipAuth = isIpAllowlistRelay;

  const missing = [
    !host ? 'SMTP_HOST' : '',
    !port || Number.isNaN(port) ? 'SMTP_PORT' : '',
    !skipAuth && !username ? 'SMTP_USER' : '',
    !skipAuth && !password ? 'SMTP_APP_PASSWORD' : '',
  ].filter(Boolean);

  return {
    host,
    port: Number.isNaN(port) ? 587 : port,
    secure,
    username,
    password,
    defaultFrom,
    defaultFromName,
    skipAuth,
    missing,
  };
};

export const getGatewaySmtpConfigStatus = (
  env: Record<string, string | undefined> = process.env,
): GatewaySmtpConfigStatus => {
  const cfg = resolveEnvConfig(env);
  return {
    ok: true,
    configured: cfg.missing.length === 0,
    host: cfg.host,
    port: cfg.port,
    defaultFrom: cfg.defaultFrom,
    defaultFromName: cfg.defaultFromName,
    allowedDomain: ALLOWED_GATEWAY_DOMAIN,
    missing: cfg.missing,
  };
};

class SmtpConnection {
  private socket: net.Socket | tls.TLSSocket;
  private buffer = '';

  constructor(socket: net.Socket | tls.TLSSocket) {
    this.socket = socket;
    this.socket.setEncoding('utf8');
    this.socket.on('data', (chunk) => {
      this.buffer += chunk;
    });
  }

  write(command: string) {
    this.socket.write(`${command}${CRLF}`);
  }

  close() {
    this.socket.end();
  }

  async read(expectedCodes: number[]): Promise<string> {
    const deadline = Date.now() + 15000;

    while (Date.now() < deadline) {
      const lines = this.buffer.split(/\r?\n/).filter(Boolean);
      let lastLine = '';
      for (let i = lines.length - 1; i >= 0; i -= 1) {
        if (/^\d{3} /.test(lines[i])) {
          lastLine = lines[i];
          break;
        }
      }

      if (lastLine) {
        this.buffer = '';
        const code = Number(lastLine.slice(0, 3));
        if (!expectedCodes.includes(code)) {
          throw new Error(`SMTP relay returned ${code}: ${lastLine}`);
        }
        return lines.join('\n');
      }

      await new Promise((resolve) => setTimeout(resolve, 40));
    }

    throw new Error('SMTP relay timed out waiting for a response.');
  }

  async command(command: string, expectedCodes: number[]): Promise<string> {
    this.write(command);
    return this.read(expectedCodes);
  }

  async upgradeToTls(host: string) {
    const upgraded = tls.connect({
      socket: this.socket,
      servername: host,
    });

    await new Promise<void>((resolve, reject) => {
      upgraded.once('secureConnect', resolve);
      upgraded.once('error', reject);
    });

    this.socket = upgraded;
    this.socket.setEncoding('utf8');
    this.socket.on('data', (chunk) => {
      this.buffer += chunk;
    });
  }
}

const connectSocket = async (host: string, port: number, secure: boolean) => {
  const socket = secure
    ? tls.connect({ host, port, servername: host })
    : net.connect({ host, port });

  await new Promise<void>((resolve, reject) => {
    const eventName = secure ? 'secureConnect' : 'connect';
    socket.once(eventName, resolve);
    socket.once('error', reject);
  });

  return new SmtpConnection(socket);
};

const isImplicitTlsModeMismatch = (error: unknown) => {
  const message = String((error as { message?: unknown })?.message || error || '').toLowerCase();
  return (
    message.includes('wrong version number') ||
    message.includes('ssl routines') ||
    message.includes('ssl3_get_record')
  );
};

const encodeBase64Lines = (value: string): string =>
  Buffer.from(value, 'utf8')
    .toString('base64')
    .replace(/.{1,76}/g, `$&${CRLF}`)
    .trimEnd();

const escapeHtml = (value: string): string =>
  value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');

const buildDefaultHtmlFromText = (text: string): string => {
  const paragraphs = text
    .replace(/\r\n/g, '\n')
    .split(/\n{2,}/)
    .map((block) => `<p style="margin:0 0 12px 0;">${escapeHtml(block).replace(/\n/g, '<br />')}</p>`)
    .join('');

  return `<!DOCTYPE html>
<html>
<body style="margin:0;padding:0;font-family:'Segoe UI',Arial,sans-serif;font-size:14px;line-height:1.6;color:#12233d;width:100%;">
<div style="width:100%;max-width:none;margin:0;padding:0;">
${paragraphs}
</div>
</body>
</html>`;
};

const createAlternativeSection = (text: string, html?: string): { header: string; body: string } => {
  const cleanHtml = normalize(html);
  if (cleanHtml) {
    const altBoundary = `usis-gw-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
    return {
      header: `Content-Type: multipart/alternative; boundary="${altBoundary}"`,
      body: [
        `--${altBoundary}`,
        'Content-Type: text/plain; charset=UTF-8',
        'Content-Transfer-Encoding: base64',
        '',
        encodeBase64Lines(text.replace(/\r?\n/g, CRLF)),
        `--${altBoundary}`,
        'Content-Type: text/html; charset=UTF-8',
        'Content-Transfer-Encoding: base64',
        '',
        encodeBase64Lines(cleanHtml.replace(/\r?\n/g, CRLF)),
        `--${altBoundary}--`,
      ].join(CRLF),
    };
  }

  return {
    header: `Content-Type: text/plain; charset=UTF-8${CRLF}Content-Transfer-Encoding: base64`,
    body: encodeBase64Lines(text.replace(/\r?\n/g, CRLF)),
  };
};

const createMimeMessage = (params: {
  from: string;
  fromName: string;
  to: string[];
  cc: string[];
  replyTo?: string;
  subject: string;
  text: string;
  html?: string;
}): string => {
  const safeFromHeader = params.fromName
    ? `"${encodeHeaderValue(params.fromName.replace(/"/g, ''))}" <${sanitizeHeader(params.from)}>`
    : sanitizeHeader(params.from);

  const baseHeaders = [
    `From: ${safeFromHeader}`,
    `To: ${params.to.map(sanitizeHeader).join(', ')}`,
    params.cc.length > 0 ? `Cc: ${params.cc.map(sanitizeHeader).join(', ')}` : '',
    params.replyTo && EMAIL_REGEX.test(params.replyTo)
      ? `Reply-To: ${sanitizeHeader(params.replyTo)}`
      : '',
    `Subject: ${encodeHeaderValue(params.subject)}`,
    `Date: ${new Date().toUTCString()}`,
    'MIME-Version: 1.0',
  ].filter(Boolean);

  const alt = createAlternativeSection(params.text, params.html);
  return `${[...baseHeaders, alt.header].join(CRLF)}${CRLF}${CRLF}${alt.body}${CRLF}.`;
};

let smtpQueueTail: Promise<void> = Promise.resolve();
let lastSmtpSentAt = 0;

const sleepMs = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms));

function enqueueSmtpSend<T>(task: () => Promise<T>): Promise<T> {
  const run = smtpQueueTail.then(async () => {
    const elapsed = Date.now() - lastSmtpSentAt;
    if (lastSmtpSentAt > 0 && elapsed < SMTP_QUEUE_INTERVAL_MS) {
      await sleepMs(SMTP_QUEUE_INTERVAL_MS - elapsed);
    }
    try {
      return await task();
    } finally {
      lastSmtpSentAt = Date.now();
    }
  });
  smtpQueueTail = run.then(
    () => undefined,
    () => undefined,
  );
  return run;
}

const transmitViaSmtp = async (
  cfg: ResolvedGatewaySmtpConfig,
  payload: {
    from: string;
    fromName: string;
    to: string[];
    cc: string[];
    replyTo?: string;
    subject: string;
    text: string;
    html?: string;
  },
) => {
  const connection = await connectSocket(cfg.host, cfg.port, cfg.secure);
  const heloName = 'deped-usis-gateway.local';
  const allRecipients = Array.from(new Set([...payload.to, ...payload.cc]));

  try {
    await connection.read([220]);
    await connection.command(`EHLO ${heloName}`, [250]);

    if (!cfg.secure) {
      await connection.command('STARTTLS', [220]);
      await connection.upgradeToTls(cfg.host);
      await connection.command(`EHLO ${heloName}`, [250]);
    }

    if (!cfg.skipAuth) {
      await connection.command(
        `AUTH PLAIN ${encodeBase64(`\u0000${cfg.username}\u0000${cfg.password}`)}`,
        [235],
      );
    }

    await connection.command(`MAIL FROM:<${payload.from}>`, [250]);

    for (const rcpt of allRecipients) {
      await connection.command(`RCPT TO:<${rcpt}>`, [250, 251]);
    }

    await connection.command('DATA', [354]);
    await connection.command(
      createMimeMessage({
        from: payload.from,
        fromName: payload.fromName,
        to: payload.to,
        cc: payload.cc,
        replyTo: payload.replyTo,
        subject: payload.subject,
        text: payload.text,
        html: payload.html,
      }),
      [250],
    );
    await connection.command('QUIT', [221]);
  } finally {
    connection.close();
  }
};

export const sendGatewaySmtpEmail = async (
  input: SendGatewayEmailInput,
  env: Record<string, string | undefined> = process.env,
): Promise<SendGatewayEmailResult> => {
  const cfg = resolveEnvConfig(env);
  if (cfg.missing.length > 0) {
    throw new Error(
      `Email gateway SMTP is not configured. Missing environment variables: ${cfg.missing.join(', ')}.`,
    );
  }

  const fromEmail = (normalize(input.fromEmail) || cfg.defaultFrom).toLowerCase();
  if (!isAllowedGatewaySender(fromEmail)) {
    throw new Error(
      `Sender email "${fromEmail}" must belong to the @${ALLOWED_GATEWAY_DOMAIN} institutional domain.`,
    );
  }

  const fromName = normalize(input.fromName) || cfg.defaultFromName;
  const to = normalizeEmailList(input.to);
  const toSet = new Set(to);
  const cc = normalizeEmailList(input.cc || []).filter((addr) => !toSet.has(addr));
  const subject = normalize(input.subject);
  const text = String(input.text ?? '').trim();

  if (to.length === 0) {
    throw new Error('At least one valid recipient email address is required.');
  }
  if (!subject) {
    throw new Error('Email subject is required.');
  }
  if (!text) {
    throw new Error('Email message body is required.');
  }

  const payload = {
    from: fromEmail,
    fromName,
    to,
    cc,
    replyTo: normalize(input.replyTo),
    subject,
    text,
    html: normalize(input.html) || buildDefaultHtmlFromText(text),
  };

  await enqueueSmtpSend(async () => {
    try {
      await transmitViaSmtp(cfg, payload);
    } catch (err) {
      if (cfg.secure && isImplicitTlsModeMismatch(err)) {
        await transmitViaSmtp({ ...cfg, secure: false }, payload);
      } else {
        throw err;
      }
    }
  });

  return {
    ok: true,
    host: cfg.host,
    port: cfg.port,
    from: fromEmail,
    sentTo: to,
    ccSent: cc,
  };
};

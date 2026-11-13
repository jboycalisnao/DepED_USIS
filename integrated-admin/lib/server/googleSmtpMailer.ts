import net from 'node:net';
import tls from 'node:tls';

export type GoogleSmtpConfigStatus = {
  ok: true;
  configured: boolean;
  host: string;
  port: number;
  from: string;
  fromName: string;
  missing: string[];
};

export type EmailAttachmentInput = {
  filename: string;
  contentType: string;
  content: Buffer;
};

export type RelayTestOverride = {
  host?: string;
  port?: number;
  requireAuth?: boolean;
};

export type SendGoogleSmtpEmailInput = {
  to: string[];
  cc?: string[];
  replyTo?: string;
  subject: string;
  text: string;
  html?: string;
  attachments?: EmailAttachmentInput[];
  relayTest?: RelayTestOverride;
};

export type SendGoogleSmtpEmailResult = {
  ok: true;
  host: string;
  port?: number;
  from: string;
  sentTo: string[];
  ccSent: string[];
};

type ResolvedSmtpConfig = {
  host: string;
  port: number;
  secure: boolean;
  username: string;
  password: string;
  from: string;
  fromName: string;
  missing: string[];
};

const CRLF = '\r\n';
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

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
): ResolvedSmtpConfig => {
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
  const from =
    normalize(env.IA_SMTP_FROM || env.SMTP_FROM || env.ATTENDANCE_SMTP_FROM) ||
    username;
  const fromName =
    normalize(env.IA_SMTP_FROM_NAME || env.SMTP_FROM_NAME) ||
    'Leon NHS USIS Integrated Admin (SCC)';

  const missing = [
    !host ? 'IA_SMTP_HOST' : '',
    !port || Number.isNaN(port) ? 'IA_SMTP_PORT' : '',
    !username ? 'IA_SMTP_USER' : '',
    !password ? 'IA_SMTP_APP_PASSWORD' : '',
    !from ? 'IA_SMTP_FROM' : '',
  ].filter(Boolean);

  return {
    host,
    port: Number.isNaN(port) ? 587 : port,
    secure,
    username,
    password,
    from,
    fromName,
    missing,
  };
};

export const getGoogleSmtpConfigStatus = (
  env: Record<string, string | undefined> = process.env,
): GoogleSmtpConfigStatus => {
  const cfg = resolveEnvConfig(env);
  return {
    ok: true,
    configured: cfg.missing.length === 0,
    host: cfg.host,
    port: cfg.port,
    from: cfg.from,
    fromName: cfg.fromName,
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
          throw new Error(`Email delivery server returned ${code}: ${lastLine}`);
        }
        return lines.join('\n');
      }

      await new Promise((resolve) => setTimeout(resolve, 40));
    }

    throw new Error('Email delivery server timed out waiting for a response.');
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

const encodeBase64BufferLines = (value: Buffer): string =>
  value
    .toString('base64')
    .replace(/.{1,76}/g, `$&${CRLF}`)
    .trimEnd();

const createAlternativeSection = (text: string, html?: string): { header: string; body: string } => {
  const cleanHtml = normalize(html);
  if (cleanHtml) {
    const altBoundary = `usis-alt-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
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
  attachments?: EmailAttachmentInput[];
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
  const attachments = (params.attachments || []).filter((att) => att?.content?.length > 0);

  if (attachments.length > 0) {
    const mixedBoundary = `usis-mix-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
    const headers = [
      ...baseHeaders,
      `Content-Type: multipart/mixed; boundary="${mixedBoundary}"`,
    ];

    const parts: string[] = [
      `--${mixedBoundary}`,
      alt.header,
      '',
      alt.body,
    ];

    for (const att of attachments) {
      const safeName = sanitizeHeader(att.filename || 'attachment.pdf').replace(/"/g, '');
      const safeType = sanitizeHeader(att.contentType || 'application/octet-stream');
      parts.push(
        `--${mixedBoundary}`,
        `Content-Type: ${safeType}; name="${safeName}"`,
        `Content-Disposition: attachment; filename="${safeName}"`,
        'Content-Transfer-Encoding: base64',
        '',
        encodeBase64BufferLines(att.content),
      );
    }
    parts.push(`--${mixedBoundary}--`);

    return `${headers.join(CRLF)}${CRLF}${CRLF}${parts.join(CRLF)}${CRLF}.`;
  }

  return `${[...baseHeaders, alt.header].join(CRLF)}${CRLF}${CRLF}${alt.body}${CRLF}.`;
};

const ALLOWED_TEST_HOSTS = new Set(['smtp.gmail.com', 'smtp-relay.gmail.com']);
const ALLOWED_TEST_PORTS = new Set([25, 465, 587]);
const SMTP_QUEUE_INTERVAL_MS = 1000;

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
  cfg: ResolvedSmtpConfig & { skipAuth?: boolean },
  payload: {
    to: string[];
    cc: string[];
    replyTo?: string;
    subject: string;
    text: string;
    html?: string;
    attachments?: EmailAttachmentInput[];
  },
) => {
  const connection = await connectSocket(cfg.host, cfg.port, cfg.secure);
  const heloName = 'deped-usis-ia.local';
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
      try {
        await connection.command(
          `AUTH PLAIN ${encodeBase64(`\u0000${cfg.username}\u0000${cfg.password}`)}`,
          [235],
        );
      } catch (authError) {
        const detail = authError instanceof Error ? authError.message : String(authError);
        if (detail.includes('535')) {
          throw new Error(
            `Email server rejected authentication for ${cfg.username} (${detail}). Verify that 2-Step Verification is active on ${cfg.username}, initial sign-in is completed, and the notification app password is valid for ${cfg.username}.`,
          );
        }
        throw authError;
      }
    }
    await connection.command(`MAIL FROM:<${cfg.from}>`, [250]);

    for (const rcpt of allRecipients) {
      await connection.command(`RCPT TO:<${rcpt}>`, [250, 251]);
    }

    await connection.command('DATA', [354]);
    await connection.command(
      createMimeMessage({
        from: cfg.from,
        fromName: cfg.fromName,
        to: payload.to,
        cc: payload.cc,
        replyTo: payload.replyTo,
        subject: payload.subject,
        text: payload.text,
        html: payload.html,
        attachments: payload.attachments,
      }),
      [250],
    );
    await connection.command('QUIT', [221]);
  } finally {
    connection.close();
  }
};

export const sendSmtpEmailNotification = async (
  input: SendGoogleSmtpEmailInput,
  env: Record<string, string | undefined> = process.env,
): Promise<SendGoogleSmtpEmailResult> => {
  const baseCfg = resolveEnvConfig(env);
  let effectiveHost = baseCfg.host;
  let effectivePort = baseCfg.port;
  let effectiveSecure = baseCfg.secure;
  const skipAuth = input.relayTest?.requireAuth === false;

  if (input.relayTest) {
    const reqHost = normalize(input.relayTest.host).toLowerCase();
    if (reqHost) {
      if (!ALLOWED_TEST_HOSTS.has(reqHost)) {
        throw new Error(`Test host "${reqHost}" is not allowed.`);
      }
      effectiveHost = reqHost;
    }
    if (input.relayTest.port != null) {
      const reqPort = Number(input.relayTest.port);
      if (!ALLOWED_TEST_PORTS.has(reqPort)) {
        throw new Error(`Test port ${reqPort} is not supported (use 25, 465, or 587).`);
      }
      effectivePort = reqPort;
      effectiveSecure = reqPort === 465;
    }
  }

  const effectiveMissing = skipAuth
    ? baseCfg.missing.filter((key) => key !== 'IA_SMTP_USER' && key !== 'IA_SMTP_APP_PASSWORD')
    : baseCfg.missing;

  if (effectiveMissing.length > 0) {
    throw new Error(
      `Email notification service is not configured. Missing environment variables: ${effectiveMissing.join(', ')}.`,
    );
  }

  const cfg: ResolvedSmtpConfig & { skipAuth?: boolean } = {
    ...baseCfg,
    host: effectiveHost,
    port: effectivePort,
    secure: effectiveSecure,
    skipAuth,
  };

  const to = normalizeEmailList(input.to);
  const toSet = new Set(to);
  const cc = normalizeEmailList(input.cc || []).filter((addr) => !toSet.has(addr));
  const subject = normalize(input.subject);
  const text = String(input.text ?? '').trim();

  if (to.length === 0) {
    throw new Error('At least one valid officer recipient email address is required.');
  }
  if (!subject) {
    throw new Error('Notification email subject is required.');
  }
  if (!text) {
    throw new Error('Notification email body is required.');
  }

  const payload = {
    to,
    cc,
    replyTo: normalize(input.replyTo),
    subject,
    text,
    html: normalize(input.html) || undefined,
    attachments: input.attachments,
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
    from: cfg.from,
    sentTo: to,
    ccSent: cc,
  };
};

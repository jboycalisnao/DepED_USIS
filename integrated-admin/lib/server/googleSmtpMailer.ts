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

export type SendGoogleSmtpEmailInput = {
  to: string[];
  cc?: string[];
  replyTo?: string;
  subject: string;
  text: string;
};

export type SendGoogleSmtpEmailResult = {
  ok: true;
  host: string;
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
    'smtp.gmail.com';
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
    'DepED USIS Integrated Admin (SCC)';

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
          throw new Error(`Google SMTP returned ${code}: ${lastLine}`);
        }
        return lines.join('\n');
      }

      await new Promise((resolve) => setTimeout(resolve, 40));
    }

    throw new Error('Google SMTP server timed out waiting for a response.');
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

const createMimeMessage = (params: {
  from: string;
  fromName: string;
  to: string[];
  cc: string[];
  replyTo?: string;
  subject: string;
  text: string;
}): string => {
  const safeFromHeader = params.fromName
    ? `"${encodeHeaderValue(params.fromName.replace(/"/g, ''))}" <${sanitizeHeader(params.from)}>`
    : sanitizeHeader(params.from);

  const headers = [
    `From: ${safeFromHeader}`,
    `To: ${params.to.map(sanitizeHeader).join(', ')}`,
    params.cc.length > 0 ? `Cc: ${params.cc.map(sanitizeHeader).join(', ')}` : '',
    params.replyTo && EMAIL_REGEX.test(params.replyTo)
      ? `Reply-To: ${sanitizeHeader(params.replyTo)}`
      : '',
    `Subject: ${encodeHeaderValue(params.subject)}`,
    `Date: ${new Date().toUTCString()}`,
    'MIME-Version: 1.0',
    'Content-Type: text/plain; charset=UTF-8',
    'Content-Transfer-Encoding: 8bit',
  ].filter(Boolean);

  // Dot-stuff lines beginning with '.' per RFC 5321
  const stuffedBody = params.text
    .replace(/\r?\n/g, CRLF)
    .split(CRLF)
    .map((line) => (line.startsWith('.') ? `.${line}` : line))
    .join(CRLF);

  return `${headers.join(CRLF)}${CRLF}${CRLF}${stuffedBody}${CRLF}.`;
};

const transmitViaSmtp = async (
  cfg: ResolvedSmtpConfig,
  payload: {
    to: string[];
    cc: string[];
    replyTo?: string;
    subject: string;
    text: string;
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

    await connection.command(
      `AUTH PLAIN ${encodeBase64(`\u0000${cfg.username}\u0000${cfg.password}`)}`,
      [235],
    );
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
  const cfg = resolveEnvConfig(env);
  if (cfg.missing.length > 0) {
    throw new Error(
      `Google SMTP is not configured. Missing environment variables: ${cfg.missing.join(', ')}.`,
    );
  }

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
  };

  try {
    await transmitViaSmtp(cfg, payload);
  } catch (err) {
    if (cfg.secure && isImplicitTlsModeMismatch(err)) {
      await transmitViaSmtp({ ...cfg, secure: false }, payload);
    } else {
      throw err;
    }
  }

  return {
    ok: true,
    host: cfg.host,
    from: cfg.from,
    sentTo: to,
    ccSent: cc,
  };
};

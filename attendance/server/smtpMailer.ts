import net from 'node:net';
import tls from 'node:tls';

export type SmtpMailOptions = {
  host: string;
  port: number;
  secure: boolean;
  username: string;
  password: string;
  from: string;
  to: string[];
  subject: string;
  text: string;
};

const CRLF = '\r\n';

const encodeBase64 = (value: string) => Buffer.from(value, 'utf8').toString('base64');

const sanitizeHeader = (value: string) => value.replace(/[\r\n]+/g, ' ').trim();

const normalizeAddressList = (value: string) =>
  value
    .split(/[;,]/)
    .map((address) => address.trim())
    .filter(Boolean);

export const parseSmtpRecipients = (value: string) => normalizeAddressList(value);

export const resolveSmtpSecure = (value: string | undefined, port: number) => {
  const normalized = String(value ?? '').trim().toLowerCase();
  if (!normalized || normalized === 'auto') return port === 465;
  if (['true', '1', 'yes', 'ssl', 'tls', 'implicit', 'implicit-tls'].includes(normalized)) return true;
  if (['false', '0', 'no', 'starttls', 'explicit', 'explicit-tls'].includes(normalized)) return false;
  return port === 465;
};

const createMessage = (options: SmtpMailOptions) => {
  const headers = [
    `From: ${sanitizeHeader(options.from)}`,
    `To: ${options.to.map(sanitizeHeader).join(', ')}`,
    `Subject: ${sanitizeHeader(options.subject)}`,
    'MIME-Version: 1.0',
    'Content-Type: text/plain; charset=UTF-8',
    'Content-Transfer-Encoding: 8bit',
  ];

  return `${headers.join(CRLF)}${CRLF}${CRLF}${options.text.replace(/\r?\n/g, CRLF)}${CRLF}.`;
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

  async read(expectedCodes: number[]) {
    const deadline = Date.now() + 15000;

    while (Date.now() < deadline) {
      const lines = this.buffer.split(/\r?\n/).filter(Boolean);
      let lastLine = '';
      for (let index = lines.length - 1; index >= 0; index -= 1) {
        if (/^\d{3} /.test(lines[index])) {
          lastLine = lines[index];
          break;
        }
      }

      if (lastLine) {
        this.buffer = '';
        const code = Number(lastLine.slice(0, 3));
        if (!expectedCodes.includes(code)) {
          throw new Error(`SMTP server returned ${code}: ${lastLine}`);
        }
        return lines.join('\n');
      }

      await new Promise((resolve) => setTimeout(resolve, 50));
    }

    throw new Error('SMTP server did not respond in time.');
  }

  async command(command: string, expectedCodes: number[]) {
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

const connectSocket = async (options: SmtpMailOptions) => {
  const socket = options.secure
    ? tls.connect({ host: options.host, port: options.port, servername: options.host })
    : net.connect({ host: options.host, port: options.port });

  await new Promise<void>((resolve, reject) => {
    const eventName = options.secure ? 'secureConnect' : 'connect';
    socket.once(eventName, resolve);
    socket.once('error', reject);
  });

  return new SmtpConnection(socket);
};

const isImplicitTlsModeMismatch = (error: unknown) => {
  const message = String((error as { message?: unknown })?.message || error || '').toLowerCase();
  return message.includes('wrong version number') || message.includes('ssl routines') || message.includes('ssl3_get_record');
};

const sendSmtpMailWithMode = async (options: SmtpMailOptions) => {
  const connection = await connectSocket(options);
  const heloName = 'deped-usis-attendance.local';

  try {
    await connection.read([220]);
    await connection.command(`EHLO ${heloName}`, [250]);

    if (!options.secure) {
      await connection.command('STARTTLS', [220]);
      await connection.upgradeToTls(options.host);
      await connection.command(`EHLO ${heloName}`, [250]);
    }

    await connection.command(`AUTH PLAIN ${encodeBase64(`\u0000${options.username}\u0000${options.password}`)}`, [235]);
    await connection.command(`MAIL FROM:<${options.from}>`, [250]);

    for (const recipient of options.to) {
      await connection.command(`RCPT TO:<${recipient}>`, [250, 251]);
    }

    await connection.command('DATA', [354]);
    await connection.command(createMessage(options), [250]);
    await connection.command('QUIT', [221]);
  } finally {
    connection.close();
  }
};

export const sendSmtpMail = async (options: SmtpMailOptions) => {
  try {
    await sendSmtpMailWithMode(options);
  } catch (error) {
    if (options.secure && isImplicitTlsModeMismatch(error)) {
      await sendSmtpMailWithMode({ ...options, secure: false });
      return;
    }
    throw error;
  }
};

// Server-only: SMTP-verzending via de eigen mailbox van het bedrijf.
// In de edge-runtime (Cloudflare Workers) kan nodemailer geen TCP-verbinding
// maken; daarom praten we daar zelf SMTP via cloudflare:sockets. Lokaal (Node)
// gebruiken we nodemailer.

export function smtpConfigured(): boolean {
  return Boolean(
    process.env["SMTP_HOST"] &&
      process.env["SMTP_USER"] &&
      process.env["SMTP_PASS"],
  );
}

type SendOpts = { to: string; subject: string; html: string };

export async function sendViaSmtp(opts: SendOpts) {
  try {
    const { connect } = await import(
      /* @vite-ignore */ "cloudflare:sockets" as string
    );
    return await sendViaWorkerSocket(connect, opts);
  } catch (err) {
    if (isModuleMissing(err)) return await sendViaNodemailer(opts);
    throw err;
  }
}

function isModuleMissing(err: unknown) {
  const msg = err instanceof Error ? err.message : String(err);
  return (
    msg.includes("cloudflare:sockets") ||
    msg.includes("Cannot find module") ||
    msg.includes("Failed to resolve")
  );
}

async function sendViaNodemailer(opts: SendOpts) {
  const nodemailer = (await import("nodemailer")).default;
  const port = Number(process.env["SMTP_PORT"] ?? "465");
  const transporter = nodemailer.createTransport({
    host: process.env["SMTP_HOST"]!,
    port,
    secure: port === 465,
    auth: {
      user: process.env["SMTP_USER"]!,
      pass: process.env["SMTP_PASS"]!,
    },
  });

  return await transporter.sendMail({
    from: process.env["SMTP_FROM"] ?? process.env["SMTP_USER"]!,
    to: opts.to,
    subject: opts.subject,
    html: opts.html,
  });
}

/** Minimale SMTP-client over een TLS-socket (poort 465, implicit TLS). */
async function sendViaWorkerSocket(
  connect: (
    address: { hostname: string; port: number },
    options?: Record<string, unknown>,
  ) => {
    readable: ReadableStream<Uint8Array>;
    writable: WritableStream<Uint8Array>;
    close: () => Promise<void>;
  },
  opts: SendOpts,
) {
  const host = process.env["SMTP_HOST"]!;
  const user = process.env["SMTP_USER"]!;
  const pass = process.env["SMTP_PASS"]!;
  const from = process.env["SMTP_FROM"] ?? user;
  const port = Number(process.env["SMTP_PORT"] ?? "465");

  const socket = connect(
    { hostname: host, port },
    { secureTransport: "on", allowHalfOpen: false },
  );

  const writer = socket.writable.getWriter();
  const reader = socket.readable.getReader();
  const encoder = new TextEncoder();
  const decoder = new TextDecoder();
  let buffer = "";

  function isComplete(text: string) {
    const lines = text.replace(/\r\n$/, "").split("\r\n");
    const last = lines[lines.length - 1] ?? "";
    return /^\d{3} /.test(last);
  }

  async function read(expected: number[]): Promise<string> {
    while (!(buffer.endsWith("\n") && isComplete(buffer))) {
      const { value, done } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });
    }
    const response = buffer;
    buffer = "";
    const code = Number(response.slice(0, 3));
    if (!expected.includes(code)) {
      throw new Error(`SMTP ${code}: ${response.trim()}`);
    }
    return response;
  }

  async function send(line: string, expected: number[]) {
    await writer.write(encoder.encode(line + "\r\n"));
    return await read(expected);
  }

  const recipients = opts.to
    .split(",")
    .map((address) => address.trim())
    .filter(Boolean);

  try {
    await read([220]);
    await send(`EHLO ${host}`, [250]);
    await send("AUTH LOGIN", [334]);
    await send(btoa(user), [334]);
    await send(btoa(pass), [235]);
    await send(`MAIL FROM:<${from}>`, [250]);
    for (const rcpt of recipients) {
      await send(`RCPT TO:<${rcpt}>`, [250, 251]);
    }
    await send("DATA", [354]);

    const body = buildMessage({ from, recipients, ...opts });
    await writer.write(encoder.encode(body + "\r\n.\r\n"));
    await read([250]);

    try {
      await send("QUIT", [221]);
    } catch {
      // afsluiten mag stil mislukken
    }

    return { accepted: recipients };
  } finally {
    try {
      writer.releaseLock();
      reader.releaseLock();
      await socket.close();
    } catch {
      // socket al gesloten
    }
  }
}

function buildMessage(opts: {
  from: string;
  recipients: string[];
  subject: string;
  html: string;
}) {
  const headers = [
    `From: ${opts.from}`,
    `To: ${opts.recipients.join(", ")}`,
    `Subject: ${encodeHeader(opts.subject)}`,
    `Date: ${new Date().toUTCString()}`,
    "MIME-Version: 1.0",
    'Content-Type: text/html; charset="utf-8"',
    "Content-Transfer-Encoding: 8bit",
  ];
  // Dot-stuffing: regels die met een punt beginnen moeten verdubbeld worden.
  const html = opts.html
    .replace(/\r?\n/g, "\r\n")
    .replace(/(^|\r\n)\./g, "$1..");
  return headers.join("\r\n") + "\r\n\r\n" + html;
}

function encodeHeader(value: string) {
  return /[^\x20-\x7E]/.test(value)
    ? `=?UTF-8?B?${btoa(String.fromCharCode(...new TextEncoder().encode(value)))}?=`
    : value;
}

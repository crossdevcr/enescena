import { SESv2Client, SendEmailCommand } from "@aws-sdk/client-sesv2";

const AWS_REGION = process.env.AWS_REGION || "us-east-1";
const SES_FROM = process.env.SES_FROM || "no-reply@example.com";

const hasCreds = !!process.env.AWS_ACCESS_KEY_ID && !!process.env.AWS_SECRET_ACCESS_KEY;

const ses = new SESv2Client({ region: AWS_REGION });

// Basic HTML wrapper (optional)
function wrapHtml(html: string) {
  return `<!doctype html><html><head><meta charset="utf-8"/></head><body style="font-family:Arial,Helvetica,sans-serif;line-height:1.4">${html}</body></html>`;
}

type SendParams = {
  to: string | string[];
  subject: string;
  html: string;
  text?: string;
  replyTo?: string | string[];
  cc?: string | string[];
  bcc?: string | string[];
};

export async function sendEmail({ to, subject, html, text, replyTo, cc, bcc }: SendParams) {
  if (!hasCreds) {
    // Dev fallback: log and succeed
    console.log("[DEV EMAIL via SES mock]", { to, subject, html });
    return { ok: true, dev: true };
  }

  const Destination = {
    ToAddresses: Array.isArray(to) ? to : [to],
    CcAddresses: cc ? (Array.isArray(cc) ? cc : [cc]) : undefined,
    BccAddresses: bcc ? (Array.isArray(bcc) ? bcc : [bcc]) : undefined,
  };

  const Content = {
    Simple: {
      Subject: { Data: subject, Charset: "UTF-8" },
      Body: {
        Html: { Data: wrapHtml(html), Charset: "UTF-8" },
        ...(text ? { Text: { Data: text, Charset: "UTF-8" } } : {}),
      },
    },
  };

  const ReplyToAddresses = replyTo
    ? (Array.isArray(replyTo) ? replyTo : [replyTo])
    : undefined;

  const cmd = new SendEmailCommand({
    FromEmailAddress: SES_FROM,
    Destination,
    Content,
    ReplyToAddresses,
  });

  const res = await ses.send(cmd);
  return { ok: !!res?.MessageId, id: res?.MessageId };
}
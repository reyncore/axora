/**
 * lib/email.ts — Email service wrapper.
 *
 * Provider: Resend (free tier: 3K email/bulan, cukup untuk MVP).
 * Fallback: Console log di development (tidak perlu SMTP setup).
 *
 * Ganti dengan Nodemailer/SendGrid/Postmark sesuai kebutuhan
 * dengan hanya mengubah sendEmail() function.
 */

interface EmailPayload {
  to:      string
  subject: string
  html:    string
}

interface ResendResponse {
  id?:    string
  error?: { message: string }
}

/**
 * Send email via Resend API.
 * Development: print ke console jika RESEND_API_KEY tidak ada.
 */
export async function sendEmail(payload: EmailPayload): Promise<void> {
  const apiKey = process.env.RESEND_API_KEY
  const from   = process.env.RESEND_FROM_EMAIL ?? "noreply@axora.app"

  if (!apiKey) {
    // Dev mode — print ke console
    console.log("[Email DEV]", {
      to:      payload.to,
      subject: payload.subject,
      preview: payload.html.replace(/<[^>]+>/g, "").slice(0, 200),
    })
    return
  }

  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${apiKey}`,
      "Content-Type":  "application/json",
    },
    body: JSON.stringify({
      from,
      to:      payload.to,
      subject: payload.subject,
      html:    payload.html,
    }),
  })

  if (!res.ok) {
    const body = await res.json().catch(() => ({})) as ResendResponse
    throw new Error(`Email send failed: ${body.error?.message ?? res.status}`)
  }
}

// ── Email templates ───────────────────────────────────────────────────────────

export function buildVerificationEmail(params: {
  displayName: string
  verifyUrl:   string
}): EmailPayload {
  const { displayName, verifyUrl } = params

  return {
    to:      "", // diisi caller
    subject: "Verifikasi email Axora kamu",
    html: `
<!DOCTYPE html>
<html lang="id">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Verifikasi Email Axora</title>
</head>
<body style="margin:0;padding:0;background:#0f0f11;font-family:system-ui,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="padding:40px 20px;">
    <tr>
      <td align="center">
        <table width="520" cellpadding="0" cellspacing="0"
               style="background:#16161e;border:1px solid #2a2a2e;border-radius:12px;overflow:hidden;">
          <!-- Header -->
          <tr>
            <td style="padding:32px 40px 24px;border-bottom:1px solid #2a2a2e;">
              <span style="font-size:22px;font-weight:700;color:#a78bfa;letter-spacing:-0.5px;">
                ⚡ Axora
              </span>
            </td>
          </tr>
          <!-- Body -->
          <tr>
            <td style="padding:32px 40px;">
              <h1 style="margin:0 0 12px;font-size:20px;font-weight:600;color:#e8e8ec;">
                Halo, ${displayName}!
              </h1>
              <p style="margin:0 0 24px;font-size:15px;color:#9999aa;line-height:1.6;">
                Terima kasih sudah bergabung dengan Axora.
                Klik tombol di bawah untuk memverifikasi email kamu.
              </p>
              <a href="${verifyUrl}"
                 style="display:inline-block;padding:12px 28px;background:#7c3aed;
                        color:#fff;text-decoration:none;border-radius:999px;
                        font-size:14px;font-weight:600;">
                Verifikasi Email
              </a>
              <p style="margin:24px 0 0;font-size:13px;color:#5a5a66;line-height:1.5;">
                Link ini berlaku selama <strong style="color:#9999aa;">24 jam</strong>.
                Jika kamu tidak mendaftar di Axora, abaikan email ini.
              </p>
            </td>
          </tr>
          <!-- Footer -->
          <tr>
            <td style="padding:20px 40px;border-top:1px solid #2a2a2e;">
              <p style="margin:0;font-size:12px;color:#3a3a48;">
                © 2025 Axora · Dibuat di Indonesia
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`,
  }
}

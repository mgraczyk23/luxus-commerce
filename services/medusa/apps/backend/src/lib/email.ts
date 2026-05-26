import { Resend } from "resend"

let _client: Resend | null = null

function getClient(): Resend {
  if (!_client) {
    const key = process.env.RESEND_API_KEY
    if (!key) throw new Error("RESEND_API_KEY is not set")
    _client = new Resend(key)
  }
  return _client
}

export type SendEmailOptions = {
  to:      string | string[]
  subject: string
  html:    string
  replyTo?: string
}

export async function sendEmail(opts: SendEmailOptions): Promise<void> {
  const from = process.env.EMAIL_FROM ?? "Luxus Collection <noreply@luxus-collection.com>"
  const client = getClient()

  const { error } = await client.emails.send({
    from,
    to:       Array.isArray(opts.to) ? opts.to : [opts.to],
    subject:  opts.subject,
    html:     opts.html,
    reply_to: opts.replyTo,
  })

  if (error) throw new Error(error.message)
}

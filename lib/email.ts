// lib/email.ts
import { Resend } from 'resend'

const resend = new Resend(process.env.RESEND_API_KEY)
const NO_REPLY_EMAIL = process.env.RESEND_FROM_EMAIL ?? 'Onboarding <onboarding@resend.dev>'

type SendEmailProps = {
  to: string
  subject: string
  react: React.ReactNode // Changed from html: string
}

export async function sendEmail({ to, subject, react }: SendEmailProps) {
  try {
    const data = await resend.emails.send({
      from: NO_REPLY_EMAIL,
      to,
      subject,
      react // Pass the react component here
    })
    return { success: true, data }
  } catch (error) {
    console.error('Failed to send email:', error)
    return { success: false, error }
  }
}

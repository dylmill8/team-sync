import type { NextApiRequest, NextApiResponse } from "next"
import nodemailer from "nodemailer"

const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: "invites.teamsync@gmail.com",
    pass: process.env.TEAMSYNC_EMAIL_PASSWORD,
  },
})

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") {
    return res.status(405).json({ success: false, error: "Method not allowed" })
  }

  const { to, subject, content } = req.body

  if (!to || !subject || !content) {
    return res.status(400).json({ success: false, error: "Missing required fields" })
  }
  const html = content
  const mailOptions = {
    from: "invites.teamsync@gmail.com",
    to,
    subject,
    html,
  }

  try {
    const info = await transporter.sendMail(mailOptions)
    console.log("Email sent successfully:", info)
    return res.status(200).json({ success: true, info })
  } catch (error: unknown) {
    console.error("Error sending email:", error)
    if (error instanceof Error) {
      console.error("Error details:", {
        message: error.message,
        stack: error.stack,
        code: (error as { code?: string }).code,
      })
      return res.status(500).json({ success: false, error: error.message })
    } else {
      return res.status(500).json({ success: false, error: "Unknown error" })
    }
  }
}

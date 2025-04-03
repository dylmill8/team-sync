import type { NextApiRequest, NextApiResponse } from "next";
import nodemailer from "nodemailer";

const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: "invites.teamsync@gmail.com", // Sender
    pass: process.env.TEAMSYNC_EMAIL_PASSWORD, // Password for the sender email
  },
});

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  console.log("API Route Hit: /api/sendInviteEmail");

  if (req.method !== "POST") {
    console.log("Invalid method:", req.method);
    return res.status(405).json({ error: "Method not allowed" });
  }

  const { email, inviteLink } = req.body;
  console.log("Request Body:", req.body);

  if (!email || !inviteLink) {
    console.log("Missing email or invite link");
    return res.status(400).json({ error: "Missing email or invite link" });
  }

  try {
    const mailOptions = {
      from: "invites.teamsync@gmail.com",
      to: email,
      subject: "TeamSync: You're Invited!",
      html: `<p>You have been invited! Click the link to join: <a href="${inviteLink}">${inviteLink}</a></p>`,
    };

    const info = await transporter.sendMail(mailOptions);
    console.log("Email sent successfully:", info); 
    res.status(200).json({ message: "Email sent successfully" });
  } catch (error: unknown) {
    console.error("Error sending email:", error);
    if (error instanceof Error) {
      console.error("Error details:", {
        message: error.message,
        stack: error.stack,
        code: (error as { code?: string }).code,
      }); 
    } else {
      console.error("Unknown error:", error);
    }
    res.status(500).json({
      error: "Failed to send email",
      details: error instanceof Error ? error.message : "Unknown error",
    });
  }
}

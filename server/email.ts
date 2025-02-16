import nodemailer from 'nodemailer';

if (!process.env.SMTP_HOST || !process.env.SMTP_PORT || !process.env.SMTP_USER || 
    !process.env.SMTP_PASS || !process.env.SMTP_FROM_EMAIL) {
  throw new Error("SMTP configuration is incomplete. Please check environment variables.");
}

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: parseInt(process.env.SMTP_PORT),
  secure: process.env.SMTP_PORT === "465",
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
});

interface EmailOptions {
  to: string;
  subject: string;
  text?: string;
  html?: string;
}

export async function sendEmail(options: EmailOptions): Promise<boolean> {
  try {
    await transporter.sendMail({
      from: process.env.SMTP_FROM_EMAIL,
      to: options.to,
      subject: options.subject,
      text: options.text,
      html: options.html,
    });
    return true;
  } catch (error) {
    console.error('Email sending error:', error);
    return false;
  }
}

// Password Reset Email
export async function sendPasswordResetEmail(email: string, resetToken: string, resetUrl: string): Promise<boolean> {
  const resetLink = `${resetUrl}?token=${resetToken}`;
  
  return sendEmail({
    to: email,
    subject: "Reset Your PodPlanner Password",
    html: `
      <h1>Reset Your Password</h1>
      <p>You requested to reset your password. Click the link below to set a new password:</p>
      <p><a href="${resetLink}">Reset Password</a></p>
      <p>If you didn't request this, please ignore this email.</p>
      <p>This link will expire in 1 hour.</p>
    `,
    text: `
      Reset Your Password
      
      You requested to reset your password. Click the link below to set a new password:
      ${resetLink}
      
      If you didn't request this, please ignore this email.
      This link will expire in 1 hour.
    `,
  });
}

// Group Invitation Email
export async function sendGroupInvitationEmail(
  email: string, 
  groupName: string,
  inviterName: string,
  inviteToken: string,
  inviteUrl: string
): Promise<boolean> {
  const inviteLink = `${inviteUrl}?token=${inviteToken}`;
  
  return sendEmail({
    to: email,
    subject: `Join ${groupName} on PodPlanner`,
    html: `
      <h1>You're Invited to Join ${groupName}</h1>
      <p>${inviterName} has invited you to join their podcast planning group "${groupName}" on PodPlanner.</p>
      <p>Click the link below to accept the invitation:</p>
      <p><a href="${inviteLink}">Accept Invitation</a></p>
      <p>This invitation will expire in 7 days.</p>
    `,
    text: `
      You're Invited to Join ${groupName}
      
      ${inviterName} has invited you to join their podcast planning group "${groupName}" on PodPlanner.
      
      Click the link below to accept the invitation:
      ${inviteLink}
      
      This invitation will expire in 7 days.
    `,
  });
}

// Group Activity Notification Email
export async function sendGroupActivityEmail(
  email: string,
  groupName: string,
  activityType: 'new_episode' | 'topic_assigned' | 'schedule_change',
  details: string
): Promise<boolean> {
  const subjects = {
    new_episode: `New Episode Planned - ${groupName}`,
    topic_assigned: `New Topic Assignment - ${groupName}`,
    schedule_change: `Schedule Update - ${groupName}`,
  };
  
  return sendEmail({
    to: email,
    subject: subjects[activityType],
    html: `
      <h1>${subjects[activityType]}</h1>
      <p>${details}</p>
    `,
    text: `
      ${subjects[activityType]}
      
      ${details}
    `,
  });
}

// Verify SMTP connection on startup
transporter.verify()
  .then(() => console.log('SMTP connection verified'))
  .catch((error) => console.error('SMTP connection error:', error));

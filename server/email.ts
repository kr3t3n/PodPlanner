import nodemailer from 'nodemailer';

// Initialize transporter only when credentials are available
let transporter: nodemailer.Transporter | null = null;

export async function initializeTransporter() {
  if (!process.env.SMTP_HOST || !process.env.SMTP_PORT || !process.env.SMTP_USER || 
      !process.env.SMTP_PASS || !process.env.SMTP_FROM_EMAIL) {
    console.error("Missing SMTP configuration. Please check environment variables.");
    return false;
  }

  try {
    const port = parseInt(process.env.SMTP_PORT);
    console.log("Creating SMTP transporter with config:", {
      host: process.env.SMTP_HOST,
      port,
      secure: false, // For port 587, use TLS
      auth: {
        user: process.env.SMTP_USER
      }
    });

    transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port,
      secure: false, // For port 587, use TLS
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS
      },
      tls: {
        // Do not fail on invalid certs
        rejectUnauthorized: false
      }
    });

    // Verify connection
    console.log("Verifying SMTP connection...");
    await transporter.verify();
    console.log("SMTP connection verified successfully!");
    return true;
  } catch (error) {
    console.error("Failed to initialize SMTP transporter:", error);
    return false;
  }
}

export async function sendTestEmail(to: string): Promise<{ success: boolean, error?: string }> {
  if (!transporter) {
    const initialized = await initializeTransporter();
    if (!initialized) {
      return { 
        success: false, 
        error: "Failed to initialize SMTP transporter" 
      };
    }
  }

  try {
    console.log(`Attempting to send test email to: ${to}`);
    const info = await transporter!.sendMail({
      from: process.env.SMTP_FROM_EMAIL,
      to,
      subject: "PodPlanner Test Email",
      text: "This is a test email from PodPlanner to verify SMTP configuration.",
      html: "<h1>PodPlanner Test Email</h1><p>This is a test email from PodPlanner to verify SMTP configuration.</p>"
    });

    console.log("Email sent successfully:", info);
    return { success: true };
  } catch (error) {
    console.error("Failed to send test email:", error);
    return { 
      success: false, 
      error: error instanceof Error ? error.message : String(error)
    };
  }
}

interface EmailOptions {
  to: string;
  subject: string;
  text?: string;
  html?: string;
}

export async function sendEmail(options: EmailOptions): Promise<boolean> {
  if (!transporter) {
    const initialized = await initializeTransporter();
    if (!initialized) return false;
  }
  try {
    console.log("Attempting to send email to:", options.to);
    await transporter!.sendMail({
      from: process.env.SMTP_FROM_EMAIL,
      to: options.to,
      subject: options.subject,
      text: options.text,
      html: options.html,
    });
    console.log("Email sent successfully to:", options.to);
    return true;
  } catch (error) {
    console.error('Email sending error:', error);
    return false;
  }
}

// Password Reset Email
export async function sendPasswordResetEmail(email: string, resetToken: string, resetUrl: string): Promise<boolean> {
  console.log("Sending password reset email to:", email);
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
  console.log("Sending group invitation email to:", email);
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
  console.log("Sending group activity email to:", email);
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

// Initialize on startup
initializeTransporter().then(success => {
  if (success) {
    console.log("SMTP service initialized successfully");
  } else {
    console.error("Failed to initialize SMTP service");
  }
});
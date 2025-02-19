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
      secure: false,
      auth: {
        user: process.env.SMTP_USER
      }
    });

    transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port,
      secure: false, // We're using STARTTLS
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS
      },
      tls: {
        minVersion: 'TLSv1.2',
        ciphers: 'HIGH',
        rejectUnauthorized: true
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

// Password Reset Email Template Update
export async function sendPasswordResetEmail(email: string, resetToken: string, resetUrl: string): Promise<boolean> {
  console.log("Attempting to send password reset email to:", email);
  const resetLink = `${resetUrl}?token=${resetToken}`;

  try {
    const result = await sendEmail({
      to: email,
      subject: "Reset Your PodPlanner Password",
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h1 style="color: #333; text-align: center;">Reset Your Password</h1>
          <div style="background-color: #f9f9f9; padding: 20px; border-radius: 5px;">
            <p>You've requested to reset your password for your PodPlanner account.</p>
            <p>Click the button below to set a new password:</p>
            <div style="text-align: center; margin: 30px 0;">
              <a href="${resetLink}" 
                style="background-color: #0070f3; color: white; padding: 12px 24px; 
                        text-decoration: none; border-radius: 5px; display: inline-block;">
                Reset Password
              </a>
            </div>
            <p style="color: #666; font-size: 14px;">
              If you didn't request this password reset, you can safely ignore this email. The link will expire in 1 hour.
            </p>
            <p style="color: #666; font-size: 14px;">
              For your security, this password reset link can only be used once.
            </p>
          </div>
        </div>
      `,
      text: `
        Reset Your PodPlanner Password

        You've requested to reset your password for your PodPlanner account.
        Click the link below to set a new password:
        ${resetLink}

        If you didn't request this password reset, you can safely ignore this email.
        The link will expire in 1 hour.
        For your security, this password reset link can only be used once.
      `,
    });

    if (result) {
      console.log("Password reset email sent successfully to:", email);
    } else {
      console.error("Failed to send password reset email to:", email);
    }
    return result;
  } catch (error) {
    console.error("Error sending password reset email:", error);
    return false;
  }
}

// Group Invitation Email
export async function sendGroupInvitationEmail(
  email: string, 
  groupName: string,
  inviterName: string,
  inviteCode: string,
  inviteUrl: string
): Promise<boolean> {
  console.log("Sending group invitation email to:", email);

  return sendEmail({
    to: email,
    subject: `Join ${groupName} on PodPlanner`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h1 style="color: #333; text-align: center;">You're Invited to Join ${groupName}</h1>
        <div style="background-color: #f9f9f9; padding: 20px; border-radius: 5px;">
          <p>${inviterName} has invited you to join their podcast planning group "${groupName}" on PodPlanner.</p>

          <div style="margin: 30px 0; text-align: center;">
            <p style="font-weight: bold; margin-bottom: 10px;">Your Invite Code:</p>
            <div style="background-color: #eee; padding: 15px; border-radius: 5px; font-family: monospace; font-size: 20px;">
              ${inviteCode}
            </div>
          </div>

          <p>You can join the group in two ways:</p>
          <ol style="margin-bottom: 20px;">
            <li>Click the button below to join directly:</li>
            <div style="text-align: center; margin: 15px 0;">
              <a href="${inviteUrl}" 
                style="background-color: #0070f3; color: white; padding: 12px 24px; 
                        text-decoration: none; border-radius: 5px; display: inline-block;">
                Join Group
              </a>
            </div>
            <li>Or enter the invite code manually when clicking "Join Group" in PodPlanner</li>
          </ol>

          <p style="color: #666; font-size: 14px;">
            This invitation will expire in 7 days.
          </p>
        </div>
      </div>
    `,
    text: `
      You're Invited to Join ${groupName}

      ${inviterName} has invited you to join their podcast planning group "${groupName}" on PodPlanner.

      Your Invite Code: ${inviteCode}

      You can join the group in two ways:
      1. Use this link to join directly:
         ${inviteUrl}

      2. Or enter the invite code manually when clicking "Join Group" in PodPlanner

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
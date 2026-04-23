import nodemailer from 'nodemailer';

const transporter = nodemailer.createTransport({
  host: process.env.EMAIL_HOST,
  port: process.env.EMAIL_PORT,
  secure: process.env.EMAIL_PORT == 465,
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS
  }
});

/**
 * Send an email
 */
export const sendEmail = async (options) => {
  const mailOptions = {
    from: process.env.EMAIL_FROM,
    to: options.to,
    subject: options.subject,
    html: options.html
  };

  try {
    const info = await transporter.sendMail(mailOptions);
    console.log('Email sent: %s', info.messageId);
    return info;
  } catch (error) {
    console.error('Error sending email:', error);
    throw error;
  }
};

/**
 * Send verification OTP email
 */
export const sendVerificationEmail = async (email, otp) => {
  const html = `
    <div style="font-family: Arial, sans-serif; padding: 20px;">
      <h2>Verify Your Email</h2>
      <p>Thank you for registering with GroupPay. Use the OTP below to verify your email address:</p>
      <h1 style="color: #6c00ff; letter-spacing: 5px;">${otp}</h1>
      <p>This code will expire in 10 minutes.</p>
    </div>
  `;

  return sendEmail({
    to: email,
    subject: 'GroupPay - Email Verification',
    html
  });
};

/**
 * Send password reset email
 */
export const sendPasswordResetEmail = async (email, resetUrl) => {
  const html = `
    <div style="font-family: Arial, sans-serif; padding: 20px;">
      <h2>Reset Your Password</h2>
      <p>You requested a password reset. Click the button below to set a new password:</p>
      <a href="${resetUrl}" style="background-color: #6c00ff; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px; display: inline-block;">Reset Password</a>
      <p>If you didn't request this, please ignore this email.</p>
    </div>
  `;

  return sendEmail({
    to: email,
    subject: 'GroupPay - Password Reset',
    html
  });
};

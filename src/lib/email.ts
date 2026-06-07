import nodemailer from 'nodemailer';

export function escapeHtml(str: string): string {
  return String(str ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

export function normalizeEmail(email?: string | null): string {
  return (email ?? '').trim().toLowerCase();
}

export function isValidEmail(email?: string | null): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email ?? '');
}

export function getAdminEmail(): string {
  return process.env.ADMIN_EMAIL || process.env.SMTP_FROM_EMAIL || '';
}

export function createMailTransporter() {
  const host = process.env.SMTP_HOST;
  const port = Number(process.env.SMTP_PORT || 587);
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;

  if (!host || !user || !pass) {
    throw new Error(
      'Missing SMTP configuration. Set SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS in .env.local'
    );
  }

  return nodemailer.createTransport({
    host,
    port,
    secure: port === 465,
    auth: { user, pass },
  });
}

import { settingsApi } from '../api/client';

export interface EmailPayload {
  to: string;
  cc?: string;
  subject: string;
  body: string;
}

export interface SmtpSettings {
  host: string;
  port: number;
  user: string;
  password: string;
  fromAddress: string;
  fromName: string;
  tls: boolean;
  relayUrl: string;
}

export async function getSmtpSettings(): Promise<SmtpSettings> {
  const map = await settingsApi.getAll();
  return {
    host: map['smtp_host'] || '',
    port: Number(map['smtp_port'] || 587),
    user: map['smtp_user'] || '',
    password: map['smtp_password'] || '',
    fromAddress: map['smtp_from_address'] || '',
    fromName: map['smtp_from_name'] || 'SOC System',
    tls: map['smtp_tls'] === 'true',
    relayUrl: map['smtp_relay_url'] || '',
  };
}

export async function sendEmail(payload: EmailPayload): Promise<'relay' | 'mailto'> {
  const settings = await getSmtpSettings();

  // Try HTTP relay if configured
  if (settings.relayUrl) {
    try {
      const res = await fetch(settings.relayUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          to: payload.to,
          cc: payload.cc || '',
          subject: payload.subject,
          body: payload.body,
          smtp: {
            host: settings.host,
            port: settings.port,
            user: settings.user,
            password: settings.password,
            fromAddress: settings.fromAddress,
            fromName: settings.fromName,
            tls: settings.tls,
          },
        }),
      });
      if (res.ok) return 'relay';
    } catch {
      // fall through to mailto
    }
  }

  // Fallback: open system email client via mailto
  openMailto(payload);
  return 'mailto';
}

export function openMailto(payload: EmailPayload) {
  const params = new URLSearchParams();
  if (payload.cc) params.set('cc', payload.cc);
  params.set('subject', payload.subject);
  params.set('body', payload.body);
  const link = `mailto:${encodeURIComponent(payload.to)}?${params.toString()}`;
  window.location.href = link;
}

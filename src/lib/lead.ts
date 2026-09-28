// Доставка заявок. Зараз: email через SMTP + необов'язковий вебхук CRM.
// Щоб підключити CRM, достатньо задати CRM_WEBHOOK_URL або додати ще один «канал» у CHANNELS.
import nodemailer from 'nodemailer';

export interface Lead {
  name: string;
  phone: string;
  email: string;
  messenger: string;
  comment: string;
  lang: 'uk' | 'en';
  page: string;
  createdAt: string;
}

const env = (k: string) => process.env[k] ?? import.meta.env[k] ?? '';

const MESSENGER_LABEL: Record<string, string> = { telegram: 'Telegram', viber: 'Viber', whatsapp: 'WhatsApp', call: 'Дзвінок' };

const esc = (s: string) => s.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]!);

async function viaEmail(lead: Lead) {
  const host = env('SMTP_HOST');
  if (!host) {
    // Локальна розробка без SMTP — просто показуємо заявку в консолі
    console.info('[lead] SMTP не налаштовано, заявка:', lead);
    return;
  }
  const transport = nodemailer.createTransport({
    host,
    port: Number(env('SMTP_PORT') || 465),
    secure: env('SMTP_SECURE') !== 'false',
    auth: { user: env('SMTP_USER'), pass: env('SMTP_PASS') },
  });
  const rows: [string, string][] = [
    ["Ім'я", lead.name],
    ['Телефон', lead.phone],
    ['Email', lead.email],
    ['Месенджер', MESSENGER_LABEL[lead.messenger] ?? lead.messenger],
    ['Коментар', lead.comment || '—'],
    ['Мова сайту', lead.lang.toUpperCase()],
    ['Сторінка', lead.page || '—'],
    ['Час', new Date(lead.createdAt).toLocaleString('uk-UA', { timeZone: 'Europe/Kyiv' })],
  ];
  await transport.sendMail({
    from: env('MAIL_FROM') || env('SMTP_USER'),
    to: env('MAIL_TO'),
    replyTo: lead.email,
    subject: `Нова заявка з сайту — ${lead.name}`,
    text: rows.map(([k, v]) => `${k}: ${v}`).join('\n'),
    html: `<h2 style="font-family:sans-serif">Нова заявка з сайту teamdor</h2><table style="font-family:sans-serif;font-size:15px;border-collapse:collapse">${rows
      .map(([k, v]) => `<tr><td style="padding:6px 16px 6px 0;color:#4E5158">${k}</td><td style="padding:6px 0"><b>${esc(v)}</b></td></tr>`)
      .join('')}</table>`,
  });
}

async function viaCrmWebhook(lead: Lead) {
  const url = env('CRM_WEBHOOK_URL');
  if (!url) return;
  const res = await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(lead) });
  if (!res.ok) throw new Error(`CRM webhook ${res.status}`);
}

const CHANNELS = [viaEmail, viaCrmWebhook];

export async function sendLead(lead: Lead) {
  const results = await Promise.allSettled(CHANNELS.map((send) => send(lead)));
  const failed = results.filter((r) => r.status === 'rejected') as PromiseRejectedResult[];
  failed.forEach((f) => console.error('[lead] channel failed', f.reason));
  // Заявка вважається прийнятою, якщо хоч один канал спрацював
  if (failed.length === results.length) throw failed[0].reason;
}

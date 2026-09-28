// Прийом заявки: валідація, захист від спаму, лист на пошту компанії, дублювання в CRM (вебхук).
import type { APIRoute } from 'astro';
import { sendLead, type Lead } from '../../lib/lead';

export const prerender = false;

const MIN_FILL_MS = 2500; // бот заповнює форму миттєво
const clean = (v: unknown, max: number) => String(v ?? '').replace(/[\u0000-\u001F\u007F]/g, ' ').trim().slice(0, max);
const MESSENGERS = ['telegram', 'viber', 'whatsapp', 'call'];

// Простий ліміт: не більше 5 заявок з однієї IP за 10 хвилин (у пам'яті процесу)
const hits = new Map<string, number[]>();
function limited(ip: string) {
  const now = Date.now();
  const list = (hits.get(ip) ?? []).filter((t) => now - t < 10 * 60_000);
  list.push(now);
  hits.set(ip, list);
  return list.length > 5;
}

export const POST: APIRoute = async ({ request, clientAddress, redirect }) => {
  const isJson = (request.headers.get('content-type') ?? '').includes('application/json');
  const raw: Record<string, unknown> = isJson
    ? await request.json().catch(() => ({}))
    : Object.fromEntries(await request.formData().catch(() => new FormData()));

  const lang = raw.lang === 'en' ? 'en' : 'uk';
  const ok = () => (isJson ? json({ ok: true }) : redirect(lang === 'en' ? '/en/thanks' : '/thanks', 303));

  // Пастка: приховане поле заповнене або форма «заповнена» надто швидко — мовчки «приймаємо»
  const t = Number(raw.t);
  if (clean(raw.website, 200) || (t && Date.now() - t < MIN_FILL_MS)) return ok();

  let ip = 'unknown';
  try { ip = clientAddress; } catch { /* немає адреси за проксі */ }
  if (limited(ip)) return json({ ok: false, error: 'rate_limited' }, 429);

  const lead: Lead = {
    name: clean(raw.name, 100),
    phone: clean(raw.phone, 30),
    email: clean(raw.email, 120),
    messenger: MESSENGERS.includes(String(raw.messenger)) ? String(raw.messenger) : 'telegram',
    comment: clean(raw.comment, 2000).replace(/\s+/g, ' '),
    lang,
    page: clean(raw.page, 300),
    createdAt: new Date().toISOString(),
  };

  const errors: string[] = [];
  if (lead.name.length < 2) errors.push('name');
  if (lead.phone.replace(/\D/g, '').length < 9) errors.push('phone');
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(lead.email)) errors.push('email');
  if (errors.length) return json({ ok: false, error: 'validation', fields: errors }, 422);

  try {
    await sendLead(lead);
  } catch (err) {
    console.error('[lead] delivery failed', err);
    return json({ ok: false, error: 'delivery' }, 502);
  }
  return ok();
};

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });
}

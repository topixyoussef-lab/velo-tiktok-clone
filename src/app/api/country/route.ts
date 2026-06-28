import { NextResponse } from 'next/server';

const IPWHOIS = 'https://ipwhois.app/json';
const IPAPI = 'http://ip-api.com/json';

function getClientIP(req: Request): string {
  const fwd = req.headers.get('x-forwarded-for');
  if (fwd) return fwd.split(',')[0].trim();
  const real = req.headers.get('x-real-ip');
  if (real) return real;
  return '';
}

export async function GET(req: Request) {
  const ip = getClientIP(req);

  try {
    const url = ip ? `${IPWHOIS}/${ip}?objects=country,country_code` : `${IPWHOIS}/?objects=country,country_code`;
    const res = await fetch(url, { signal: AbortSignal.timeout(4000) });
    const data = await res.json();
    if (data.country) {
      return NextResponse.json({ country: data.country, countryCode: (data.country_code || '').toUpperCase() });
    }
  } catch {}

  try {
    const url = ip ? `${IPAPI}/${ip}?fields=country,countryCode` : `${IPAPI}/?fields=country,countryCode`;
    const res = await fetch(url, { signal: AbortSignal.timeout(4000) });
    const data = await res.json();
    if (data.country) {
      return NextResponse.json({ country: data.country, countryCode: (data.countryCode || '').toUpperCase() });
    }
  } catch {}

  return NextResponse.json({ country: '', countryCode: '' });
}

import { NextResponse } from 'next/server';

export async function GET(req: Request) {
  try {
    const res = await fetch('https://ipwhois.app/json/?objects=country,country_code', { signal: AbortSignal.timeout(4000) });
    const data = await res.json();

    return NextResponse.json({ country: data.country || '', countryCode: (data.country_code || '').toUpperCase() });
  } catch {
    return NextResponse.json({ country: '', countryCode: '' });
  }
}

import { NextResponse } from 'next/server';

export async function GET(request: Request) {
  try {
    const auth = request.headers.get('authorization') || request.headers.get('Authorization');
    if (!auth || !auth.toLowerCase().startsWith('bearer ')) {
      return NextResponse.json({ ok: false, error: 'Missing Authorization header' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const query = searchParams.get('query') || '';
    const segments = searchParams.get('segments') || '';
    const exchanges = searchParams.get('exchanges') || '';
    const instrument_types = searchParams.get('instrument_types') || '';
    const expiry = searchParams.get('expiry') || '';
    const atm_offset = searchParams.get('atm_offset') || '';

    const upstream = new URL('https://api-v2.upstox.com/v1/instruments/search');
    if (query) upstream.searchParams.set('query', query);
    if (segments) upstream.searchParams.set('segments', segments);
    if (exchanges) upstream.searchParams.set('exchanges', exchanges);
    if (records) upstream.searchParams.set('records', records);
    if (instrument_types) upstream.searchParams.set('instrument_types', instrument_types);
    if (expiry) upstream.searchParams.set('expiry', expiry);
    if (atm_offset) upstream.searchParams.set('atm_offset', atm_offset);

    const response = await fetch(upstream.toString(), {
      method: 'GET',
      headers: {
        Authorization: auth,
        Accept: 'application/json',
      },
      cache: 'no-store',
    });

    const text = await response.text();
    if (!response.ok) {
      return NextResponse.json(
        { ok: false, status: response.status, error: text || 'Upstox request failed' },
        { status: 200 }
      );
    }

    const data = text ? JSON.parse(text) : {};
    return NextResponse.json({ ok: true, data }, { status: 200 });
  } catch {
    return NextResponse.json({ ok: false, error: 'Instrument search failed' }, { status: 200 });
  }
}

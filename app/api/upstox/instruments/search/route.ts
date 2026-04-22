import { NextResponse } from 'next/server';

export async function GET(request: Request) {
  try {
    const auth = request.headers.get('authorization') || request.headers.get('Authorization');
    if (!auth || !auth.toLowerCase().startsWith('bearer ')) {
      return NextResponse.json({ ok: false, error: 'Missing Authorization header' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const query = searchParams.get('query') || '';
    const exchange = searchParams.get('exchange') || '';
    const segment = searchParams.get('segment') || '';
    const instrument_type = searchParams.get('instrument_type') || '';

    // The user requested using: https://api.upstox.com/v2/instruments/search
    const upstream = new URL('https://api.upstox.com/v2/instruments/search');
    if (query) upstream.searchParams.set('query', query);
    if (exchange) upstream.searchParams.set('exchange', exchange);
    if (segment) upstream.searchParams.set('segment', segment);
    if (instrument_type) upstream.searchParams.set('instrument_type', instrument_type);

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
  } catch (error) {
    return NextResponse.json({ ok: false, error: 'Instrument search failed' }, { status: 200 });
  }
}

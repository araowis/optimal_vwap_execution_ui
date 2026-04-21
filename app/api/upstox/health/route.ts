import { NextResponse } from 'next/server';

export async function GET(request: Request) {
  try {
    const auth = request.headers.get('authorization') || request.headers.get('Authorization');

    if (!auth || !auth.toLowerCase().startsWith('bearer ')) {
      return NextResponse.json({ ok: false, error: 'Missing Authorization header' }, { status: 401 });
    }

    const upstream = new URL('https://api.upstox.com/v2/instruments/search');
    upstream.searchParams.set('query', 'NIFTY');
    upstream.searchParams.set('segments', 'FO');
    upstream.searchParams.set('exchanges', 'NSE');
    upstream.searchParams.set('records', '1');

    const response = await fetch(upstream.toString(), {
      method: 'GET',
      headers: {
        Authorization: auth,
        Accept: 'application/json',
      },
      cache: 'no-store',
    });

    if (!response.ok) {
      const text = await response.text().catch(() => '');
      return NextResponse.json(
        { ok: false, status: response.status, error: text || 'Upstox request failed' },
        { status: 200 }
      );
    }

    const data = await response.json().catch(() => ({}));

    if (data.status === 'success') {
      return NextResponse.json({ ok: true }, { status: 200 });
    }

    return NextResponse.json({ ok: false, error: 'Invalid response' }, { status: 200 });
  } catch {
    return NextResponse.json({ ok: false, error: 'Health check failed' }, { status: 200 });
  }
}

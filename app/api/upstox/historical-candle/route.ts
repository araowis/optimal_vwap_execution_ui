import { NextResponse } from 'next/server';

export async function GET(request: Request) {
  try {
    const auth = request.headers.get('authorization') || request.headers.get('Authorization');
    if (!auth || !auth.toLowerCase().startsWith('bearer ')) {
      return NextResponse.json({ ok: false, error: 'Missing Authorization header' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const instrumentKey = searchParams.get('instrumentKey') || '';
    const interval = searchParams.get('interval') || '';
    const toDate = searchParams.get('toDate') || '';
    const fromDate = searchParams.get('fromDate') || '';

    if (!instrumentKey || !interval || !toDate || !fromDate) {
      return NextResponse.json(
        { ok: false, error: 'Missing required query params: instrumentKey, interval, toDate, fromDate' },
        { status: 400 }
      );
    }

    const encoded = encodeURIComponent(instrumentKey);
    const url = `https://api.upstox.com/v3/historical-candle/${encoded}/${interval}/${toDate}/${fromDate}`;

    const response = await fetch(url, {
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
    return NextResponse.json({ ok: false, error: 'Historical candle fetch failed' }, { status: 200 });
  }
}

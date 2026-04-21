import { NextResponse } from 'next/server';

export async function GET(request: Request) {
  try {
    const auth = request.headers.get('authorization') || request.headers.get('Authorization');
    console.log('Authorization header:', auth ? 'Present' : 'Missing');
    
    if (!auth || !auth.toLowerCase().startsWith('bearer ')) {
      console.log('Invalid authorization header format');
      return NextResponse.json({ ok: false, error: 'Missing Authorization header' }, { status: 401 });
    }

    const url = 'https://api.upstox.com/v3/feed/market-data-feed/authorize';
    console.log('Requesting authorization from:', url);

    const response = await fetch(url, {
      method: 'GET',
      headers: {
        Authorization: auth,
        Accept: 'application/json',
      },
      cache: 'no-store',
    });

    const text = await response.text();
    console.log('Upstox response status:', response.status);
    console.log('Upstox response body:', text);
    
    if (!response.ok) {
      return NextResponse.json(
        { ok: false, status: response.status, error: text || 'Upstox authorize request failed' },
        { status: 200 }
      );
    }

    const data = text ? JSON.parse(text) : {};
    console.log('Authorization successful, data:', data);
    // Return the data directly as Upstox provides it, without wrapping
    return NextResponse.json(data, { status: 200 });
  } catch (error) {
    console.error('Authorization error:', error);
    return NextResponse.json({ ok: false, error: 'Market data feed authorize failed' }, { status: 200 });
  }
}

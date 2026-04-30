import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const instrumentKey = searchParams.get('instrument_key');
  const accessToken = searchParams.get('access_token');

  if (!instrumentKey || !accessToken) {
    return NextResponse.json(
      { error: 'Missing instrument_key or access_token' },
      { status: 400 }
    );
  }

  try {
    const response = await fetch(
      `https://api.upstox.com/v2/market-quote/quotes?instrument_key=${encodeURIComponent(instrumentKey)}`,
      {
        headers: {
          'accept': 'application/json',
          'Authorization': `Bearer ${accessToken}`,
        },
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Upstox API error:', errorText);
      return NextResponse.json(
        { error: 'Failed to fetch market quote' },
        { status: response.status }
      );
    }

    const data = await response.json();
    // console.log('Market quote response:', JSON.stringify(data, null, 2));

    // Return the data directly as Upstox provides it
    return NextResponse.json(data, { status: 200 });
  } catch (error) {
    console.error('Error fetching market quote:', error);
    return NextResponse.json(
      { error: 'Failed to fetch market quote' },
      { status: 500 }
    );
  }
}

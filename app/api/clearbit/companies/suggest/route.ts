import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const query = searchParams.get('query');

  if (!query) {
    return NextResponse.json(
      { error: 'Missing query parameter' },
      { status: 400 }
    );
  }

  try {
    const response = await fetch(
      `https://autocomplete.clearbit.com/v1/companies/suggest?query=${encodeURIComponent(query)}`,
      {
        headers: {
          'Accept': 'application/json',
        },
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Clearbit API error:', errorText);
      return NextResponse.json(
        { error: 'Failed to fetch company suggestions' },
        { status: response.status }
      );
    }

    const data = await response.json();
    console.log('Clearbit response for query:', query, 'results:', data.length);
    
    return NextResponse.json(data, { status: 200 });
  } catch (error) {
    console.error('Error fetching Clearbit suggestions:', error);
    return NextResponse.json(
      { error: 'Failed to fetch company suggestions' },
      { status: 500 }
    );
  }
}

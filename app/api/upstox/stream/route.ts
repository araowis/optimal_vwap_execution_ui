import { NextResponse } from 'next/server';
import UpstoxClient from 'upstox-js-sdk';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const instrumentKey = searchParams.get('instrumentKey');
  const token = searchParams.get('token');

  if (!instrumentKey || !token) {
    return new Response('Missing required parameters', { status: 400 });
  }

  const OAUTH2 = UpstoxClient.ApiClient.instance.authentications['OAUTH2'];
  OAUTH2.accessToken = token;

  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    async start(controller) {
      try {
        const streamer = new UpstoxClient.MarketDataStreamerV3([instrumentKey], 'full');

        streamer.on('open', () => {
          controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: 'connected' })}\n\n`));
        });

        streamer.on('message', (data: any) => {
          let parsedData = data;
          if (Buffer.isBuffer(data)) {
            try {
              const decoded = data.toString('utf8');
              parsedData = JSON.parse(decoded);
            } catch (e) {
              return;
            }
          }

          const feed = parsedData.feeds ? parsedData.feeds[instrumentKey] : null;
          if (feed && feed.ff && feed.ff.marketFF) {
            const marketData = {
              type: 'feed',
              ltp: feed.ff.marketFF.ltpc.ltp,
              volume: feed.ff.marketFF.vtt,
              depth: feed.ff.marketFF.marketDepth,
              timestamp: Date.now()
            };
            controller.enqueue(encoder.encode(`data: ${JSON.stringify(marketData)}\n\n`));
          }
        });

        streamer.on('error', (err: any) => {
          controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: 'error', error: String(err) })}\n\n`));
        });

        streamer.connect();

        const pingInterval = setInterval(() => {
          controller.enqueue(encoder.encode(`:\n\n`));
        }, 15000);

        request.signal.addEventListener('abort', () => {
          clearInterval(pingInterval);
          streamer.disconnect();
        });
      } catch (err) {
        controller.close();
      }
    }
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive'
    }
  });
}

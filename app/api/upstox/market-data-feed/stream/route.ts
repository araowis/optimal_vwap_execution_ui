import { NextRequest } from "next/server";
import protobuf from "protobufjs";
import WebSocket from "ws";
import { randomUUID } from "crypto";
import * as fs from "fs";
import * as path from "path";

export const runtime = "nodejs";

const FEED_AUTHORIZE_URL =
  "https://api.upstox.com/v3/feed/market-data-feed/authorize";

let feedResponseTypePromise: Promise<protobuf.Type> | null = null;

function getFeedResponseType() {
  if (!feedResponseTypePromise) {
    feedResponseTypePromise = (async () => {
      const protoPath = path.join(
        process.cwd(),
        "lib",
        "proto",
        "MarketDataFeedV3.proto",
      );
      const protoContent = fs.readFileSync(protoPath, "utf8");
      const root = protobuf.parse(protoContent).root;
      const t = root.lookupType(
        "com.upstox.marketdatafeederv3udapi.rpc.proto.FeedResponse",
      );
      return t as protobuf.Type;
    })();
  }
  return feedResponseTypePromise;
}

function parseMode(
  mode: string | null,
): "ltpc" | "full" | "option_greeks" | "full_d30" {
  if (
    mode === "ltpc" ||
    mode === "full" ||
    mode === "option_greeks" ||
    mode === "full_d30"
  )
    return mode;
  return "full";
}

export async function GET(req: NextRequest) {
  const auth =
    req.headers.get("authorization") || req.headers.get("Authorization");
  if (!auth || !auth.toLowerCase().startsWith("bearer ")) {
    return new Response(
      JSON.stringify({ ok: false, error: "Missing Authorization header" }),
      {
        status: 401,
        headers: { "content-type": "application/json" },
      },
    );
  }

  const instrumentKey = req.nextUrl.searchParams.get("instrument_key");
  if (!instrumentKey) {
    return new Response(
      JSON.stringify({ ok: false, error: "Missing instrument_key" }),
      {
        status: 400,
        headers: { "content-type": "application/json" },
      },
    );
  }

  const mode = parseMode(req.nextUrl.searchParams.get("mode"));

  const abortController = new AbortController();
  req.signal.addEventListener("abort", () => abortController.abort(), {
    once: true,
  });

  const feedResponseType = await getFeedResponseType();

  const authorizeResp = await fetch(FEED_AUTHORIZE_URL, {
    method: "GET",
    headers: {
      Authorization: auth,
      Accept: "application/json",
    },
    cache: "no-store",
    signal: abortController.signal,
  });

  const authorizeText = await authorizeResp.text();
  if (!authorizeResp.ok) {
    return new Response(
      JSON.stringify({
        ok: false,
        status: authorizeResp.status,
        error: authorizeText,
      }),
      {
        status: 200,
        headers: { "content-type": "application/json" },
      },
    );
  }

  const authorizeData = authorizeText ? JSON.parse(authorizeText) : null;
  const wsUrl: string | undefined =
    authorizeData?.data?.authorized_redirect_uri ||
    authorizeData?.data?.authorizedRedirectUri;

  if (!wsUrl) {
    return new Response(
      JSON.stringify({
        ok: false,
        error: "Authorize response missing websocket url",
      }),
      {
        status: 200,
        headers: { "content-type": "application/json" },
      },
    );
  }

  let ws: WebSocket | null = null;

  const stream = new ReadableStream<Uint8Array>({
    start(controller) {
      const encoder = new TextEncoder();
      let controllerClosed = false;

      const sendJsonLine = (obj: unknown) => {
        if (controllerClosed) return;
        try {
          controller.enqueue(encoder.encode(`${JSON.stringify(obj)}\n`));
        } catch {
          // controller might already be closed/errored
          controllerClosed = true;
        }
      };

      const safeClose = () => {
        if (controllerClosed) return;
        controllerClosed = true;
        try {
          controller.close();
        } catch {
          // ignore
        }
      };

      const safeError = (err: unknown) => {
        if (controllerClosed) return;
        controllerClosed = true;
        try {
          controller.error(err);
        } catch {
          // ignore
        }
      };

      try {
        ws = new WebSocket(wsUrl, {
          headers: {
            Authorization: auth,
          },
          followRedirects: true,
        });

        ws.on("open", () => {
          sendJsonLine({ type: "connection_status", status: "open" });
          const subscription = {
            guid: randomUUID(),
            method: "sub",
            data: {
              mode,
              instrumentKeys: [instrumentKey],
            },
          };
          ws?.send(JSON.stringify(subscription));
        });

        ws.on("message", (data: WebSocket.RawData) => {
          try {
            if (typeof data === "string") {
              sendJsonLine({ type: "text", data });
              return;
            }

            const bytes =
              data instanceof Buffer
                ? new Uint8Array(data)
                : new Uint8Array(data as ArrayBuffer);
            const decoded = feedResponseType.decode(bytes);
            const obj = feedResponseType.toObject(decoded, {
              longs: String,
              enums: String,
              defaults: false,
            });
            sendJsonLine(obj);
          } catch (e) {
            const msg =
              e instanceof Error
                ? e.message
                : "Failed to decode protobuf message";
            sendJsonLine({ type: "decode_error", error: msg });
          }
        });

        ws.on("close", (code: number, reason: Buffer) => {
          sendJsonLine({
            type: "connection_status",
            status: "close",
            code,
            reason: reason?.toString?.(),
          });
          safeClose();
        });

        ws.on("error", (err: Error) => {
          const msg = err instanceof Error ? err.message : "WebSocket error";
          sendJsonLine({
            type: "connection_status",
            status: "error",
            error: msg,
          });
          safeError(err);
        });

        abortController.signal.addEventListener(
          "abort",
          () => {
            try {
              ws?.close();
            } catch {
              // ignore
            }
            safeClose();
          },
          { once: true },
        );
      } catch (e) {
        safeError(e);
      }
    },
    cancel() {
      try {
        ws?.close();
      } catch {
        // ignore
      }
    },
  });

  return new Response(stream, {
    headers: {
      "content-type": "application/x-ndjson; charset=utf-8",
      "cache-control": "no-cache, no-transform",
      connection: "keep-alive",
    },
  });
}

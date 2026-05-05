/**
 * useVwapWebSocket - React hook for VWAP Server WebSocket connection
 * Handles live signals, calibration updates, and regime changes
 */

import { useState, useEffect, useRef, useCallback } from 'react';
import {
  WSMessage,
  WSConnectedMessage,
  WSSignalMessage,
  WSCalibrationMessage,
  WSRegimeMessage,
  VWAPWebSocketHandlers,
} from './vwap-server-types';

const VWAP_WS_URL = process.env.NEXT_PUBLIC_VWAP_WS_URL || 'ws://localhost:5000/rws/signals';

interface UseVwapWebSocketOptions {
  autoConnect?: boolean;
  reconnectInterval?: number;
  handlers?: VWAPWebSocketHandlers;
}

interface UseVwapWebSocketReturn {
  connected: boolean;
  connecting: boolean;
  lastSignal: WSSignalMessage | null;
  lastCalibration: WSCalibrationMessage | null;
  lastRegime: WSRegimeMessage | null;
  signalHistory: WSSignalMessage[];
  connect: () => void;
  disconnect: () => void;
  error: Error | null;
}

export function useVwapWebSocket(
  options: UseVwapWebSocketOptions = {}
): UseVwapWebSocketReturn {
  const {
    autoConnect = true,
    reconnectInterval = 2000,
    handlers = {},
  } = options;

  const [connected, setConnected] = useState(false);
  const [connecting, setConnecting] = useState(false);
  const [lastSignal, setLastSignal] = useState<WSSignalMessage | null>(null);
  const [lastCalibration, setLastCalibration] = useState<WSCalibrationMessage | null>(null);
  const [lastRegime, setLastRegime] = useState<WSRegimeMessage | null>(null);
  const [signalHistory, setSignalHistory] = useState<WSSignalMessage[]>([]);
  const [error, setError] = useState<Error | null>(null);

  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const shouldConnectRef = useRef(autoConnect);

  const clearReconnectTimeout = useCallback(() => {
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = null;
    }
  }, []);

  const connect = useCallback(() => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      return;
    }

    setConnecting(true);
    setError(null);

    try {
      const ws = new WebSocket(VWAP_WS_URL);
      wsRef.current = ws;

      ws.onopen = () => {
        setConnected(true);
        setConnecting(false);
        setError(null);
        handlers.onConnected?.();
      };

      ws.onmessage = (event) => {
        try {
          const message: WSMessage = JSON.parse(event.data);

          switch (message.type) {
            case 'connected':
              // Connection acknowledgment
              break;

            case 'signal': {
              const signal = message as WSSignalMessage;
              setLastSignal(signal);
              setSignalHistory((prev) => [...prev.slice(-99), signal]); // Keep last 100 signals
              handlers.onSignal?.(signal);
              break;
            }

            case 'calibration': {
              const calibration = message as WSCalibrationMessage;
              setLastCalibration(calibration);
              handlers.onCalibration?.(calibration);
              break;
            }

            case 'regime': {
              const regime = message as WSRegimeMessage;
              setLastRegime(regime);
              handlers.onRegime?.(regime);
              break;
            }

            default:
              console.warn('Unknown WebSocket message type:', message);
          }
        } catch (e) {
          const err = new Error(`Failed to parse WebSocket message: ${e}`);
          setError(err);
          handlers.onError?.(err);
        }
      };

      ws.onerror = (event) => {
        const err = new Error('WebSocket error occurred');
        setError(err);
        handlers.onError?.(err);
      };

      ws.onclose = () => {
        setConnected(false);
        setConnecting(false);
        wsRef.current = null;
        handlers.onClose?.();

        // Auto-reconnect if should still be connected
        if (shouldConnectRef.current) {
          clearReconnectTimeout();
          reconnectTimeoutRef.current = setTimeout(() => {
            connect();
          }, reconnectInterval);
        }
      };
    } catch (e) {
      const err = new Error(`Failed to create WebSocket connection: ${e}`);
      setError(err);
      setConnecting(false);
      handlers.onError?.(err);
    }
  }, [reconnectInterval, handlers, clearReconnectTimeout]);

  const disconnect = useCallback(() => {
    shouldConnectRef.current = false;
    clearReconnectTimeout();

    if (wsRef.current) {
      wsRef.current.close();
      wsRef.current = null;
    }

    setConnected(false);
    setConnecting(false);
  }, [clearReconnectTimeout]);

  useEffect(() => {
    if (autoConnect) {
      shouldConnectRef.current = true;
      connect();
    }

    return () => {
      shouldConnectRef.current = false;
      clearReconnectTimeout();
      if (wsRef.current) {
        wsRef.current.close();
      }
    };
  }, [autoConnect, connect, clearReconnectTimeout]);

  return {
    connected,
    connecting,
    lastSignal,
    lastCalibration,
    lastRegime,
    signalHistory,
    connect,
    disconnect,
    error,
  };
}

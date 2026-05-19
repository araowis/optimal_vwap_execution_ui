'use client';

import { useState, useEffect } from 'react';
import { useVwapWebSocket } from '@/lib/use-vwap-websocket';
import { vwapServerService } from '@/lib/vwap-server-service';
import { WSSignalMessage, WSCalibrationMessage, WSRegimeMessage } from '@/lib/vwap-server-types';
import { Activity, TrendingUp, TrendingDown, Signal, Clock, Zap, BarChart3 } from 'lucide-react';

interface LiveTradingPanelProps {
  instrumentKey?: string;
}

export default function LiveTradingPanel({ instrumentKey }: LiveTradingPanelProps) {
  const [marketStatus, setMarketStatus] = useState<'IDLE' | 'CALIBRATED' | 'LAUNCHED'>('IDLE');
  const [selectedInstrument, setSelectedInstrument] = useState<string>(instrumentKey || '');

  const {
    connected,
    connecting,
    lastSignal,
    lastCalibration,
    lastRegime,
    signalHistory,
    error,
  } = useVwapWebSocket({
    autoConnect: true,
    handlers: {
      onSignal: (signal) => {
        console.log('Signal received:', signal);
      },
      onCalibration: (calibration) => {
        console.log('Calibration received:', calibration);
      },
      onRegime: (regime) => {
        console.log('Regime changed:', regime);
      },
    },
  });

  useEffect(() => {
    const fetchStatus = async () => {
      try {
        const status = await vwapServerService.getMarketStatus();
        setMarketStatus(status.phase);
      } catch (err) {
        console.error('Failed to fetch market status:', err);
      }
    };

    fetchStatus();
    const interval = setInterval(fetchStatus, 5000);
    return () => clearInterval(interval);
  }, []);

  const formatTime = (timeStr: string) => {
    return timeStr;
  };

  return (
    <div className="space-y-4">
      {/* Connection Status */}
      <div className="flex items-center justify-between p-3 bg-secondary rounded-lg">
        <div className="flex items-center gap-2">
          <Activity className={`w-4 h-4 ${connected ? 'text-green-500' : 'text-muted-foreground'}`} />
          <span className="text-sm font-medium text-foreground">
            {connecting ? 'Connecting...' : connected ? 'Connected' : 'Disconnected'}
          </span>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs text-muted-foreground">Market:</span>
          <span className={`text-xs font-medium ${
            marketStatus === 'LAUNCHED' ? 'text-green-500' : 
            marketStatus === 'CALIBRATED' ? 'text-blue-500' : 'text-muted-foreground'
          }`}>
            {marketStatus}
          </span>
        </div>
      </div>

      {/* Error Display */}
      {error && (
        <div className="p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
          <p className="text-sm text-red-800 dark:text-red-200">{error.message}</p>
        </div>
      )}

      {/* Latest Calibration Data */}
      {lastCalibration && (
        <div className="p-4 bg-card border border-border rounded-lg space-y-3">
          <div className="flex items-center gap-2 border-b border-border pb-2">
            <BarChart3 className="w-4 h-4 text-primary" />
            <h3 className="text-sm font-medium text-foreground">Calibration Update</h3>
            <span className="text-xs text-muted-foreground ml-auto">
              {formatTime(lastCalibration.marketTime)}
            </span>
          </div>

          <div className="grid grid-cols-2 gap-3 text-sm">
            <div>
              <span className="text-xs text-muted-foreground">Client</span>
              <p className="font-medium text-foreground">{lastCalibration.clientId}</p>
            </div>
            <div>
              <span className="text-xs text-muted-foreground">Instrument</span>
              <p className="font-medium text-foreground">{lastCalibration.instrument}</p>
            </div>
            <div>
              <span className="text-xs text-muted-foreground">Bar Index</span>
              <p className="font-medium text-foreground">{lastCalibration.barIdx} / 374</p>
            </div>
            <div>
              <span className="text-xs text-muted-foreground">Trend Score</span>
              <p className="font-medium text-foreground">{lastCalibration.trendScore.toFixed(4)}</p>
            </div>
            <div>
              <span className="text-xs text-muted-foreground">Trend Acceleration</span>
              <p className="font-medium text-foreground">{lastCalibration.trendAcceleration.toFixed(4)}</p>
            </div>
            <div>
              <span className="text-xs text-muted-foreground">Current VWAP</span>
              <p className="font-medium text-foreground">{lastCalibration.currentVWAP.toFixed(2)}</p>
            </div>
            <div>
              <span className="text-xs text-muted-foreground">Lambda (λ)</span>
              <p className="font-medium text-foreground">{lastCalibration.lambda.toFixed(2)}</p>
            </div>
            <div>
              <span className="text-xs text-muted-foreground">Executed Fraction</span>
              <p className="font-medium text-foreground">{(lastCalibration.executedFrac * 100).toFixed(1)}%</p>
            </div>
            <div>
              <span className="text-xs text-muted-foreground">Bar Quality</span>
              <p className="font-medium text-foreground">{lastCalibration.barQuality.toFixed(2)}</p>
            </div>
          </div>

          <div className="flex items-center gap-2 pt-2 border-t border-border">
            {lastCalibration.trendingUp && (
              <div className="flex items-center gap-1 text-green-500">
                <TrendingUp className="w-4 h-4" />
                <span className="text-xs font-medium">UPTREND</span>
              </div>
            )}
            {lastCalibration.trendingDown && (
              <div className="flex items-center gap-1 text-red-500">
                <TrendingDown className="w-4 h-4" />
                <span className="text-xs font-medium">DOWNTREND</span>
              </div>
            )}
            {!lastCalibration.trendingUp && !lastCalibration.trendingDown && (
              <span className="text-xs text-muted-foreground">NEUTRAL</span>
            )}
          </div>
        </div>
      )}

      {/* Latest Signal */}
      {lastSignal && (
        <div className="p-4 bg-card border border-green-500 rounded-lg space-y-3">
          <div className="flex items-center gap-2 border-b border-border pb-2">
            <Signal className="w-4 h-4 text-green-500" />
            <h3 className="text-sm font-medium text-foreground">Buy Signal</h3>
            <span className="text-xs text-muted-foreground ml-auto">
              {formatTime(lastSignal.marketTime)}
            </span>
          </div>

          <div className="grid grid-cols-2 gap-3 text-sm">
            <div>
              <span className="text-xs text-muted-foreground">Client</span>
              <p className="font-medium text-foreground">{lastSignal.clientId}</p>
            </div>
            <div>
              <span className="text-xs text-muted-foreground">Instrument</span>
              <p className="font-medium text-foreground">{lastSignal.instrument}</p>
            </div>
            <div>
              <span className="text-xs text-muted-foreground">Bin Index</span>
              <p className="font-medium text-foreground">{lastSignal.binIdx}</p>
            </div>
            <div>
              <span className="text-xs text-muted-foreground">Quantity</span>
              <p className="font-medium text-foreground">{lastSignal.qty}</p>
            </div>
            <div>
              <span className="text-xs text-muted-foreground">LTP</span>
              <p className="font-medium text-foreground">₹{lastSignal.ltp.toFixed(2)}</p>
            </div>
            <div>
              <span className="text-xs text-muted-foreground">ATP</span>
              <p className="font-medium text-foreground">₹{lastSignal.atp.toFixed(2)}</p>
            </div>
            <div>
              <span className="text-xs text-muted-foreground">Urgency</span>
              <p className="font-medium text-foreground">{lastSignal.urgency.toFixed(4)}</p>
            </div>
            <div>
              <span className="text-xs text-muted-foreground">Cumulative Target</span>
              <p className="font-medium text-foreground">{lastSignal.cumTarget}</p>
            </div>
            <div>
              <span className="text-xs text-muted-foreground">Executed Before</span>
              <p className="font-medium text-foreground">{lastSignal.executedBefore}</p>
            </div>
          </div>

          <div className="flex items-center gap-2 pt-2 border-t border-border">
            {lastSignal.trendingUp && (
              <div className="flex items-center gap-1 text-green-500">
                <TrendingUp className="w-4 h-4" />
                <span className="text-xs font-medium">UPTREND</span>
              </div>
            )}
            {lastSignal.trendingDown && (
              <div className="flex items-center gap-1 text-red-500">
                <TrendingDown className="w-4 h-4" />
                <span className="text-xs font-medium">DOWNTREND</span>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Regime Change */}
      {lastRegime && (
        <div className="p-4 bg-card border border-yellow-500 rounded-lg space-y-3">
          <div className="flex items-center gap-2 border-b border-border pb-2">
            <Zap className="w-4 h-4 text-yellow-500" />
            <h3 className="text-sm font-medium text-foreground">Regime Change</h3>
            <span className="text-xs text-muted-foreground ml-auto">
              Bar {lastRegime.barIdx}
            </span>
          </div>

          <div className="flex items-center justify-between">
            <div className="text-center">
              <span className="text-xs text-muted-foreground">Previous</span>
              <p className="text-sm font-medium text-foreground">{lastRegime.previousRegime}</p>
            </div>
            <div className="text-2xl text-muted-foreground">→</div>
            <div className="text-center">
              <span className="text-xs text-muted-foreground">New</span>
              <p className="text-sm font-medium text-foreground">{lastRegime.newRegime}</p>
            </div>
          </div>

          <div className="pt-2 border-t border-border">
            <span className="text-xs text-muted-foreground">Trend Score: </span>
            <span className="text-sm font-medium text-foreground">{lastRegime.trendScore.toFixed(4)}</span>
          </div>
        </div>
      )}

      {/* Signal History */}
      {signalHistory.length > 0 && (
        <div className="p-4 bg-card border border-border rounded-lg space-y-3">
          <div className="flex items-center gap-2 border-b border-border pb-2">
            <Clock className="w-4 h-4 text-primary" />
            <h3 className="text-sm font-medium text-foreground">Recent Signals</h3>
            <span className="text-xs text-muted-foreground ml-auto">
              {signalHistory.length}
            </span>
          </div>

          <div className="space-y-2 max-h-48 overflow-y-auto">
            {signalHistory.slice(-10).reverse().map((signal, idx) => (
              <div key={idx} className="flex items-center justify-between text-sm p-2 bg-secondary rounded">
                <div className="flex items-center gap-2">
                  <Signal className="w-3 h-3 text-green-500" />
                  <span className="text-muted-foreground">{formatTime(signal.marketTime)}</span>
                </div>
                <div className="flex items-center gap-4">
                  <span className="text-foreground">Qty: {signal.qty}</span>
                  <span className="text-foreground">₹{signal.ltp.toFixed(2)}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Info */}
      <div className="text-xs text-muted-foreground space-y-1">
        <p>• WebSocket automatically reconnects on disconnect</p>
        <p>• Calibration updates every ~1 minute during session</p>
        <p>• Signals fire when buy trigger passes execution gates</p>
        <p>• Regime changes only when trend flips between UP/DOWN/NEUTRAL</p>
      </div>
    </div>
  );
}
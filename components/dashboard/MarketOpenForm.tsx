'use client';

import { useState } from 'react';
import { Play, Plus, Trash2, CheckCircle, AlertCircle } from 'lucide-react';
import { vwapServerService } from '@/lib/vwap-server-service';
import { MarketOpenInstrument } from '@/lib/vwap-server-types';

interface InstrumentConfig {
  instrumentKey: string;
  totalQty: number;
  nBins: number;
  lambda: number;
}

interface MarketOpenFormProps {
  onCalibrate?: () => void;
  onLaunch?: () => void;
}

export default function MarketOpenForm({ onCalibrate, onLaunch }: MarketOpenFormProps) {
  const [instruments, setInstruments] = useState<InstrumentConfig[]>([
    {
      instrumentKey: 'NSE_EQ|INE040A01034',
      totalQty: 10000,
      nBins: 30,
      lambda: 17.0,
    },
  ]);
  const [isCalibrating, setIsCalibrating] = useState(false);
  const [isLaunching, setIsLaunching] = useState(false);
  const [status, setStatus] = useState<'IDLE' | 'CALIBRATED' | 'LAUNCHED'>('IDLE');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  const addInstrument = () => {
    setInstruments([
      ...instruments,
      {
        instrumentKey: '',
        totalQty: 10000,
        nBins: 30,
        lambda: 17.0,
      },
    ]);
  };

  const removeInstrument = (index: number) => {
    if (instruments.length > 1) {
      setInstruments(instruments.filter((_, i) => i !== index));
    }
  };

  const updateInstrument = (index: number, field: keyof InstrumentConfig, value: any) => {
    const updated = [...instruments];
    updated[index] = { ...updated[index], [field]: value };
    setInstruments(updated);
  };

  const handleCalibrate = async () => {
    setIsCalibrating(true);
    setError('');
    setMessage('');

    try {
      const request = {
        instruments: instruments.map((inst) => ({
          instrumentKey: inst.instrumentKey,
          totalQty: inst.totalQty,
          nBins: inst.nBins,
          lambda: inst.lambda,
          timezone: 'Asia/Kolkata',
        })),
      };

      const response = await vwapServerService.marketOpen(request);
      
      if (response.status === 'calibrated') {
        setStatus('CALIBRATED');
        setMessage(`Calibrated ${response.instrumentsCalibrated} instrument(s)`);
        onCalibrate?.();
      } else {
        setError(response.message || 'Calibration failed');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to calibrate');
    } finally {
      setIsCalibrating(false);
    }
  };

  const handleLaunch = async () => {
    setIsLaunching(true);
    setError('');
    setMessage('');

    try {
      const response = await vwapServerService.marketLaunch();
      
      if (response.status === 'launched') {
        setStatus('LAUNCHED');
        setMessage(response.message);
        onLaunch?.();
      } else if (response.status === 'already_launched') {
        setStatus('LAUNCHED');
        setMessage(response.message);
      } else {
        setError(response.message || 'Launch failed');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to launch');
    } finally {
      setIsLaunching(false);
    }
  };

  const checkStatus = async () => {
    try {
      const response = await vwapServerService.getMarketStatus();
      setStatus(response.phase);
    } catch (err) {
      console.error('Failed to check status:', err);
    }
  };

  return (
    <div className="space-y-4">
      {/* Status Indicator */}
      <div className="flex items-center justify-between p-3 bg-secondary rounded-lg">
        <div className="flex items-center gap-2">
          {status === 'LAUNCHED' ? (
            <CheckCircle className="w-5 h-5 text-green-500" />
          ) : status === 'CALIBRATED' ? (
            <CheckCircle className="w-5 h-5 text-blue-500" />
          ) : (
            <AlertCircle className="w-5 h-5 text-muted-foreground" />
          )}
          <span className="text-sm font-medium text-foreground">
            Status: {status}
          </span>
        </div>
        <button
          onClick={checkStatus}
          className="text-xs text-muted-foreground hover:text-foreground underline"
        >
          Refresh
        </button>
      </div>

      {/* Instruments List */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-medium text-foreground">Instruments</h3>
          <button
            onClick={addInstrument}
            className="flex items-center gap-1 text-xs text-primary hover:text-primary/80"
          >
            <Plus className="w-3 h-3" />
            Add
          </button>
        </div>

        {instruments.map((inst, index) => (
          <div key={index} className="p-3 border border-border rounded-lg space-y-3 relative">
            {instruments.length > 1 && (
              <button
                onClick={() => removeInstrument(index)}
                className="absolute top-2 right-2 text-muted-foreground hover:text-destructive"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            )}

            <div>
              <label className="text-xs text-muted-foreground">Instrument Key</label>
              <input
                type="text"
                value={inst.instrumentKey}
                onChange={(e) => updateInstrument(index, 'instrumentKey', e.target.value)}
                placeholder="NSE_EQ|INE040A01034"
                className="w-full px-3 py-2 bg-background text-foreground border border-border rounded-lg text-sm mt-1"
              />
            </div>

            <div className="grid grid-cols-3 gap-2">
              <div>
                <label className="text-xs text-muted-foreground">Quantity</label>
                <input
                  type="number"
                  value={inst.totalQty}
                  onChange={(e) => updateInstrument(index, 'totalQty', parseInt(e.target.value) || 0)}
                  className="w-full px-3 py-2 bg-background text-foreground border border-border rounded-lg text-sm mt-1"
                />
              </div>
              <div>
                <label className="text-xs text-muted-foreground">Bins</label>
                <input
                  type="number"
                  value={inst.nBins}
                  onChange={(e) => updateInstrument(index, 'nBins', parseInt(e.target.value) || 1)}
                  className="w-full px-3 py-2 bg-background text-foreground border border-border rounded-lg text-sm mt-1"
                />
              </div>
              <div>
                <label className="text-xs text-muted-foreground">Risk Aversion (λ)</label>
                <input
                  type="number"
                  step="0.1"
                  value={inst.lambda}
                  onChange={(e) => updateInstrument(index, 'lambda', parseFloat(e.target.value) || 0)}
                  className="w-full px-3 py-2 bg-background text-foreground border border-border rounded-lg text-sm mt-1"
                />
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Action Buttons */}
      <div className="space-y-2">
        <button
          onClick={handleCalibrate}
          disabled={isCalibrating || isLaunching}
          className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          <Play className="w-4 h-4" />
          {isCalibrating ? 'Calibrating...' : 'Calibrate'}
        </button>

        <button
          onClick={handleLaunch}
          disabled={status !== 'CALIBRATED' || isLaunching || isCalibrating}
          className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg font-medium hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          <Play className="w-4 h-4" />
          {isLaunching ? 'Launching...' : 'Launch Workers'}
        </button>
      </div>

      {/* Messages */}
      {message && (
        <div className="p-3 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg">
          <p className="text-sm text-green-800 dark:text-green-200">{message}</p>
        </div>
      )}

      {error && (
        <div className="p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
          <p className="text-sm text-red-800 dark:text-red-200">{error}</p>
        </div>
      )}

      {/* Info */}
      <div className="text-xs text-muted-foreground space-y-1">
        <p>• Calibrate before 09:00 IST for automatic launch</p>
        <p>• Workers launch automatically at 09:00 IST or use Launch button</p>
        <p>• Bins: Number of execution bins for the session</p>
        <p>• Risk Aversion (λ): Higher = more conservative execution</p>
      </div>
    </div>
  );
}

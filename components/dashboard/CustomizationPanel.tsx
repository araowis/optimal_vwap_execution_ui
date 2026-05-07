'use client';

import { useState } from 'react';
import { ChevronDown } from 'lucide-react';
import { CustomizationPrefs } from '@/lib/types';

interface CustomizationPanelProps {
  preferences: CustomizationPrefs;
  onPreferencesChange: (prefs: CustomizationPrefs) => void;
}

export default function CustomizationPanel({
  preferences,
  onPreferencesChange,
}: CustomizationPanelProps) {
  const [expandedSections, setExpandedSections] = useState({
    chart: true,
    vwap: true,
    volume: false,
    signals: false,
  });

  const toggleSection = (section: keyof typeof expandedSections) => {
    setExpandedSections((prev) => ({
      ...prev,
      [section]: !prev[section],
    }));
  };

  const handleChange = (key: string, value: any) => {
    const updated = { ...preferences, [key]: value };
    onPreferencesChange(updated);
  };

  const handleBandColorChange = (colorKey: string, color: string) => {
    const updated = {
      ...preferences,
      bandColor: {
        ...preferences.bandColor,
        [colorKey]: color,
      },
    };
    onPreferencesChange(updated);
  };

  return (
    <div className="flex-1 min-h-0 overflow-y-auto p-4 flex flex-col gap-4">


      {/* Chart Settings */}
      <div className="border border-border rounded-lg">
        <button
          onClick={() => toggleSection('chart')}
          className="w-full px-4 py-3 flex items-center justify-between hover:bg-secondary/50 transition-colors"
        >
          <span className="font-medium text-foreground text-sm">Chart Settings</span>
          <ChevronDown
            className={`w-4 h-4 text-muted-foreground transition-transform ${
              expandedSections.chart ? 'rotate-180' : ''
            }`}
          />
        </button>

        {expandedSections.chart && (
          <div className="border-t border-border p-4 space-y-4 bg-background">
            <div>
              <label className="text-xs text-muted-foreground">Period</label>
              <select
                value={preferences.chartPeriod}
                onChange={(e) =>
                  handleChange('chartPeriod', e.target.value)
                }
                className="w-full px-3 py-2 bg-secondary text-foreground border border-border rounded text-sm mt-1"
              >
                <option>MINUTE</option>
                <option>5MIN</option>
                <option>15MIN</option>
                <option>HOURLY</option>
                <option>DAILY</option>
              </select>
            </div>

            <div>
              <label className="text-xs text-muted-foreground">Chart Type</label>
              <select
                value={preferences.chartType}
                onChange={(e) =>
                  handleChange('chartType', e.target.value)
                }
                className="w-full px-3 py-2 bg-secondary text-foreground border border-border rounded text-sm mt-1"
              >
                <option>CANDLESTICK</option>
                <option>OHLC</option>
                <option>LINE</option>
              </select>
            </div>

            <div className="flex gap-2">
              <label className="text-xs text-muted-foreground flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={preferences.hoverDetailsVisible}
                  onChange={(e) =>
                    handleChange('hoverDetailsVisible', e.target.checked)
                  }
                />
                Show Hover Details
              </label>
            </div>
          </div>
        )}
      </div>

      {/* VWAP Settings */}
      <div className="border border-border rounded-lg">
        <button
          onClick={() => toggleSection('vwap')}
          className="w-full px-4 py-3 flex items-center justify-between hover:bg-secondary/50 transition-colors"
        >
          <span className="font-medium text-foreground text-sm">VWAP Bands</span>
          <ChevronDown
            className={`w-4 h-4 text-muted-foreground transition-transform ${
              expandedSections.vwap ? 'rotate-180' : ''
            }`}
          />
        </button>

        {expandedSections.vwap && (
          <div className="border-t border-border p-4 space-y-4 bg-background">
            <div className="flex gap-2">
              <label className="text-xs text-muted-foreground flex items-center gap-2 cursor-pointer flex-1">
                <input
                  type="checkbox"
                  checked={preferences.vwapVisible}
                  onChange={(e) =>
                    handleChange('vwapVisible', e.target.checked)
                  }
                />
                VWAP Line
              </label>
              <label className="text-xs text-muted-foreground flex items-center gap-2 cursor-pointer flex-1">
                <input
                  type="checkbox"
                  checked={preferences.bandsVisible}
                  onChange={(e) =>
                    handleChange('bandsVisible', e.target.checked)
                  }
                />
                Bands
              </label>
            </div>

            <div>
              <label className="text-xs text-muted-foreground">Band Width (σ)</label>
              <input
                type="number"
                step="0.1"
                value={preferences.bandWidth}
                onChange={(e) =>
                  handleChange('bandWidth', parseFloat(e.target.value) || 1)
                }
                className="w-full px-3 py-2 bg-secondary text-foreground border border-border rounded text-sm mt-1"
              />
            </div>

            <div className="grid grid-cols-3 gap-2">
              <div>
                <label className="text-xs text-muted-foreground block mb-1">
                  Line Color
                </label>
                <input
                  type="color"
                  value={preferences.bandColor.line}
                  onChange={(e) =>
                    handleBandColorChange('line', e.target.value)
                  }
                  className="w-full h-8 rounded cursor-pointer"
                />
              </div>
              <div>
                <label className="text-xs text-muted-foreground block mb-1">
                  Upper
                </label>
                <input
                  type="color"
                  value={preferences.bandColor.upper}
                  onChange={(e) =>
                    handleBandColorChange('upper', e.target.value)
                  }
                  className="w-full h-8 rounded cursor-pointer"
                />
              </div>
              <div>
                <label className="text-xs text-muted-foreground block mb-1">
                  Lower
                </label>
                <input
                  type="color"
                  value={preferences.bandColor.lower}
                  onChange={(e) =>
                    handleBandColorChange('lower', e.target.value)
                  }
                  className="w-full h-8 rounded cursor-pointer"
                />
              </div>
            </div>

            <div>
              <label className="text-xs text-muted-foreground">Fill Opacity</label>
              <input
                type="range"
                min="0"
                max="1"
                step="0.1"
                value={preferences.bandColor.fillOpacity}
                onChange={(e) =>
                  handleBandColorChange('fillOpacity', parseFloat(e.target.value))
                }
                className="w-full mt-1"
              />
            </div>
          </div>
        )}
      </div>

      {/* Volume Settings */}
      <div className="border border-border rounded-lg">
        <button
          onClick={() => toggleSection('volume')}
          className="w-full px-4 py-3 flex items-center justify-between hover:bg-secondary/50 transition-colors"
        >
          <span className="font-medium text-foreground text-sm">Volume</span>
          <ChevronDown
            className={`w-4 h-4 text-muted-foreground transition-transform ${
              expandedSections.volume ? 'rotate-180' : ''
            }`}
          />
        </button>

        {expandedSections.volume && (
          <div className="border-t border-border p-4 space-y-4 bg-background">
            <div className="flex gap-2">
              <label className="text-xs text-muted-foreground flex items-center gap-2 cursor-pointer flex-1">
                <input
                  type="checkbox"
                  checked={preferences.volumeVisible}
                  onChange={(e) =>
                    handleChange('volumeVisible', e.target.checked)
                  }
                />
                Show Volume
              </label>
              <label className="text-xs text-muted-foreground flex items-center gap-2 cursor-pointer flex-1">
                <input
                  type="checkbox"
                  checked={preferences.volumeBinsVisible}
                  onChange={(e) =>
                    handleChange('volumeBinsVisible', e.target.checked)
                  }
                />
                Volume Bins
              </label>
            </div>

            <div>
              <label className="text-xs text-muted-foreground">Number of Bins</label>
              <select
                value={preferences.numVolumeBins}
                onChange={(e) =>
                  handleChange('numVolumeBins', parseInt(e.target.value) as 5 | 10 | 20 | 50)
                }
                className="w-full px-3 py-2 bg-secondary text-foreground border border-border rounded text-sm mt-1"
              >
                <option value="5">5 Bins</option>
                <option value="10">10 Bins</option>
                <option value="20">20 Bins</option>
                <option value="50">50 Bins</option>
              </select>
            </div>

            <div>
              <label className="text-xs text-muted-foreground">Coloring</label>
              <select
                value={preferences.volumeColoring}
                onChange={(e) =>
                  handleChange('volumeColoring', e.target.value)
                }
                className="w-full px-3 py-2 bg-secondary text-foreground border border-border rounded text-sm mt-1"
              >
                <option>MONOCHROME</option>
                <option>GRADIENT</option>
                <option>BY_PRICE</option>
              </select>
            </div>
          </div>
        )}
      </div>

      {/* Signal Settings */}
      <div className="border border-border rounded-lg">
        <button
          onClick={() => toggleSection('signals')}
          className="w-full px-4 py-3 flex items-center justify-between hover:bg-secondary/50 transition-colors"
        >
          <span className="font-medium text-foreground text-sm">Buy Signals</span>
          <ChevronDown
            className={`w-4 h-4 text-muted-foreground transition-transform ${
              expandedSections.signals ? 'rotate-180' : ''
            }`}
          />
        </button>

        {expandedSections.signals && (
          <div className="border-t border-border p-4 space-y-4 bg-background">
            <div className="flex flex-col gap-3">
              <label className="text-xs text-muted-foreground flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={preferences.signalsVisible}
                  onChange={(e) =>
                    handleChange('signalsVisible', e.target.checked)
                  }
                />
                Show Signals
              </label>

              <label className="text-xs text-muted-foreground flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={preferences.showSignalLines}
                  onChange={(e) =>
                    handleChange('showSignalLines', e.target.checked)
                  }
                />
                Vertical Signal Lines
              </label>
            </div>

            <div>
              <label className="text-xs text-muted-foreground">Marker Style</label>
              <select
                value={preferences.signalMarkerType}
                onChange={(e) =>
                  handleChange('signalMarkerType', e.target.value)
                }
                className="w-full px-3 py-2 bg-secondary text-foreground border border-border rounded text-sm mt-1"
              >
                <option value="PIN">Location Pin</option>
                <option value="DOT">Simple Dot</option>
                <option value="ARROW">Upward Arrow</option>
              </select>
            </div>

            <div>
              <label className="text-xs text-muted-foreground">Marker Size</label>
              <input
                type="range"
                min="4"
                max="16"
                step="2"
                value={preferences.signalMarkerSize}
                onChange={(e) =>
                  handleChange('signalMarkerSize', parseInt(e.target.value))
                }
                className="w-full mt-1"
              />
            </div>

            <div>
              <label className="text-xs text-muted-foreground">Strength Threshold</label>
              <input
                type="range"
                min="0"
                max="100"
                step="5"
                value={preferences.signalStrengthThreshold}
                onChange={(e) =>
                  handleChange('signalStrengthThreshold', parseInt(e.target.value))
                }
                className="w-full mt-1"
              />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

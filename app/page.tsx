'use client';

import { useState, useEffect } from 'react';
import DashboardLayout from '@/components/dashboard/DashboardLayout';
import { CustomizationPrefs } from '@/lib/types';

export default function Home() {
  const [isLoading, setIsLoading] = useState(true);
  const [customizationPrefs, setCustomizationPrefs] = useState<CustomizationPrefs>({
    chartPeriod: 'MINUTE',
    chartType: 'CANDLESTICK',
    vwapVisible: true,
    bandsVisible: true,
    bandWidth: 1.5,
    bandColor: {
      line: '#ef4444',
      upper: '#22c55e',
      lower: '#22c55e',
      fillOpacity: 0.1,
    },
    volumeVisible: true,
    volumeBinsVisible: true,
    numVolumeBins: 10,
    volumeColoring: 'BY_PRICE',
    signalsVisible: true,
    signalMarkerSize: 8,
    signalMarkerType: 'PIN',
    showSignalLines: false,
    signalStrengthThreshold: 30,
    buyThreshold: 0.5,
    minVolumeThreshold: 0,
    theme: 'LIGHT',
    hoverDetailsVisible: true,
  });

  useEffect(() => {
    // Load preferences from localStorage
    const saved = localStorage.getItem('vwap-dashboard-prefs');
    if (saved) {
      try {
        setCustomizationPrefs(JSON.parse(saved));
      } catch (e) {
        console.warn('Failed to load preferences');
      }
    }
    setIsLoading(false);
  }, []);

  const handlePreferencesChange = (newPrefs: CustomizationPrefs) => {
    setCustomizationPrefs(newPrefs);
    localStorage.setItem('vwap-dashboard-prefs', JSON.stringify(newPrefs));
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-screen bg-background">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-foreground text-sm">Loading Dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className={customizationPrefs.theme === 'DARK' ? 'dark' : ''}>
      <DashboardLayout
        customizationPrefs={customizationPrefs}
        onPreferencesChange={handlePreferencesChange}
      />
    </div>
  );
}

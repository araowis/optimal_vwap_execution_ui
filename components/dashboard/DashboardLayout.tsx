​'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import Header from './Header';
import DataUploadPanel from './DataUploadPanel';
import ParametersPanel from './ParametersPanel';
import ChartPanel from './ChartPanel';
import BenchmarkingPanel from './BenchmarkingPanel';
import ExecutionSummary from './ExecutionSummary';
import CustomizationPanel from './CustomizationPanel';
import StockDetailPanel from './StockDetailPanel';
import MarketOpenForm from './MarketOpenForm';
import LiveTradingPanel from './LiveTradingPanel';
import RuntimeTuningPanel from './RuntimeTuningPanel';
import {
  CustomizationPrefs,
  Candle,
  ChartDatapoint,
  BacktestResult,
  StrategyParams,
  BacktestApiResponse,
  DailyBacktestResult,
  BackendBuySignal,
  Client,
} from '@/lib/types';
import { BacktestService } from '@/lib/backtest-service';
import { backendService } from '@/lib/backend-service';
import { vwapServerService, PretradeResponse } from '@/lib/vwap-server-service';
import { useUpstoxWebSocket } from '@/lib/use-upstox-websocket';
import { useVwapWebSocket } from '@/lib/use-vwap-websocket';
import {
  WSSignalMessage,
  WSCalibrationMessage,
  WSRegimeMessage,
  RiskProfileResponse,
  RuntimeTuningProfile,
  RuntimeTuningProfileRequest,
} from '@/lib/vwap-server-types';
import { fetchHistoricalCandles, getTodayDate, getYesterdayDate } from '@/lib/upstox-historical';
import { ChevronUp, ChevronDown, ChevronLeft, ChevronRight, Calendar, Zap, Activity } from 'lucide-react';
import { toast } from 'sonner';
import WatchlistPanel from "./watchlist-panel";
import AddInstrumentPanel from "./add-instrument-panel";
import { useWatchlistStore } from "@/stores/watchlist-store";

interface DashboardLayoutProps {
  customizationPrefs: CustomizationPrefs;
  onPreferencesChange: (prefs: CustomizationPrefs) => void;
}

export default function DashboardLayout({
  customizationPrefs,
  onPreferencesChange,
}: DashboardLayoutProps) {
  const [candles, setCandles] = useState<Candle[]>([]);
  const [chartData, setChartData] = useState<ChartDatapoint[]>([]);
  const [backtestResults, setBacktestResults] = useState<BacktestResult | null>(null);
  // Multi-day backend results
  const [multiDayResults, setMultiDayResults] = useState<BacktestApiResponse | null>(null);
  const [activeDate, setActiveDate] = useState<string>('');
  const [companyLogo, setCompanyLogo] = useState<string>('');
  const [instrumentName, setInstrumentName] = useState<string>('');
  const [isBacktesting, setIsBacktesting] = useState(false);
  const [mode, setMode] = useState<'backtest' | 'realtime' | 'vwap-live'>('backtest');
  const [chartTimeframeMode, setChartTimeframeMode] = useState<'ALL' | 'DAY' | 'WEEK' | 'MONTH' | 'YEAR'>('ALL');
  const [selectedWatchlistStock, setSelectedWatchlistStock] = useState<any>(null);
  const [upstoxAccessToken, setUpstoxAccessToken] = useState<string | null>(null);
  const [backTestProgress, setBackTestProgress] = useState(0);
  const [isCalibrating, setIsCalibrating] = useState(false);
  const [calibrationMessage, setCalibrationMessage] = useState('');
  const [realtimePriceUpdate, setRealtimePriceUpdate] =
  useState<{
    ltp: number;
    timestamp: number;
    volume?: number;
    vwap?: number;
  } | undefined>(undefined);
  const [pretradeData, setPretradeData] = useState<PretradeResponse | null>(null);

  // Client Management State
  const [clients, setClients] = useState<Client[]>([]);
  const [selectedClient, setSelectedClient] = useState<Client | null>(null);

  // Import context: instrument + date range from DataUploadPanel
  const [importContext, setImportContext] = useState<{
    instrumentKey: string;
    instrumentName: string;
    startDate: string;
    endDate: string;
  } | null>(null);

  const [strategyParams, setStrategyParams] = useState<StrategyParams>({
    totalQuantity: 1000,
    numTranches: 30,
    trancheSize: 0,
    maxSlippage: 0.1,
    vwapDeviation: 0.5,
    minVolumeThreshold: 0,
    orderType: 'LIMIT',
    executionTimeframe: 'INTRADAY',
    enableTxCosts: false,
    lambda: 17.5,
    dates: [],
    txCostConfig: {
      brokeragePercent: 0.12,
      sttPercent: 0.025,
      gstPercent: 18,
      exchangeFeePercent: 0.00345,
      spreadBps: 5,
    },
  });

  // Sidebar state
  const [leftSidebarWidth, setLeftSidebarWidth] = useState(320);
  const [rightSidebarWidth, setRightSidebarWidth] = useState(384);
  const [leftSidebarCollapsed, setLeftSidebarCollapsed] = useState(false);
  const [rightSidebarCollapsed, setRightSidebarCollapsed] = useState(false);
  const [isResizingLeft, setIsResizingLeft] = useState(false);
  const [isResizingRight, setIsResizingRight] = useState(false);
  const [backTestMessage, setBackTestMessage] = useState('');
  const [resultsCollapsed, setResultsCollapsed] = useState(false);
  const [summaryCollapsed, setSummaryCollapsed] = useState(false);
  const [customizationCollapsed, setCustomizationCollapsed] = useState(mode === 'realtime');
  const [isBackendDataLive, setIsBackendDataLive] = useState(false);

  // VWAP Live Strategy State
  const [liveBuySignals, setLiveBuySignals] = useState<BackendBuySignal[]>([]);
  const [liveCalibration, setLiveCalibration] = useState<WSCalibrationMessage | null>(null);
  const [calibrationMap, setCalibrationMap] = useState<Record<string, WSCalibrationMessage>>({});
  const [signalsMap, setSignalsMap] = useState<Record<string, BackendBuySignal[]>>({});
  const [liveRegime, setLiveRegime] = useState<WSRegimeMessage | null>(null);

  const [riskProfiles, setRiskProfiles] = useState<RiskProfileResponse[]>([]);

  // Runtime Tuning Profile State
  const [tuningProfiles, setTuningProfiles] = useState<RuntimeTuningProfile[]>([]);
  const [selectedTuningProfile, setSelectedTuningProfile] = useState<RuntimeTuningProfile | null>(null);
  const [tuningPanelCollapsed, setTuningPanelCollapsed] = useState(false);

  const defaultStrategyParams = {
    totalQuantity: 1000,
    numTranches: 30,
    trancheSize: 0,
    maxSlippage: 0.1,
    vwapDeviation: 0.5,
    minVolumeThreshold: 0,
    orderType: 'LIMIT' as const,
    executionTimeframe: 'INTRADAY' as const,
    enableTxCosts: false,
    lambda: 17.5,
    dates: [],
    txCostConfig: {
      brokeragePercent: 0.12,
      sttPercent: 0.025,
      gstPercent: 18,
      exchangeFeePercent: 0.00345,
      spreadBps: 5,
    },
  };

  const mapClientResponseToClient = (res: any): Client => {
    const metadata = res.metadata || {};
    let parsedStrategyParams = { ...defaultStrategyParams };
    let parsedWatchlist = [];
    try {
      if (metadata.strategyParams) parsedStrategyParams = { ...defaultStrategyParams, ...JSON.parse(metadata.strategyParams) };
      if (metadata.watchlist) parsedWatchlist = JSON.parse(metadata.watchlist);
    } catch (e) {
      console.error('Failed to parse client metadata', e);
    }

    if (res.effectiveLambda !== undefined && res.effectiveLambda !== null) parsedStrategyParams.lambda = res.effectiveLambda;
    if (res.effectiveNBins !== undefined && res.effectiveNBins !== null) parsedStrategyParams.numTranches = res.effectiveNBins;

    return {
      id: res.clientId || '',
      name: res.name || '',
      riskProfileId: res.riskProfileId,
      riskProfileDisplayName: res.riskProfileDisplayName,
      profileLambda: res.profileLambda,
      profileNBins: res.profileNBins,
      defaultLambda: res.defaultLambda,
      defaultNBins: res.defaultNBins,
      effectiveLambda: res.effectiveLambda,
      effectiveNBins: res.effectiveNBins,
      // capitalLimit: res.capitalLimit,
      metadata,
      logo: metadata.logo,
      domain: metadata.domain,
      sector: metadata.sector,
      strategyParams: parsedStrategyParams,
      watchlist: parsedWatchlist
    };
  };

  const mapClientToCreateRequest = (client: Client) => {
    const request: any = {
      clientId: client.id,
      name: client.name,
    };

    if (client.riskProfileId) request.riskProfileId = client.riskProfileId;
    if (client.defaultLambda !== undefined) request.defaultLambda = client.defaultLambda;
    if (client.defaultNBins !== undefined) request.defaultNBins = client.defaultNBins;
    if (client.capitalLimit !== undefined) request.capitalLimit = client.capitalLimit;

    const meta: Record<string, string> = { ...client.metadata };

    if (client.logo?.trim()) meta.logo = client.logo.trim();
    if (client.domain?.trim()) meta.domain = client.domain.trim();
    if (client.sector?.trim()) meta.sector = client.sector.trim();

    // Clean up empty metadata
    Object.keys(meta).forEach(key => {
      if (meta[key] === '' || meta[key] === undefined || meta[key] === null) {
        delete meta[key];
      }
    });

    if (Object.keys(meta).length > 0) {
      request.metadata = meta;
    }

    return request;
  };

  const fetchClients = useCallback(async () => {
    try {
      const response = await vwapServerService.getClients();
      if (response && response.length > 0) {
        const mapped = response.map(mapClientResponseToClient);
        setClients(mapped);
        if (!selectedClient || !mapped.find(c => c.id === selectedClient.id)) {
          setSelectedClient(mapped[0]);
          setStrategyParams(mapped[0].strategyParams);
        }
      } else {
        const defaultClient: Client = {
          id: 'msci-default',
          name: 'MSCI',
          domain: 'msci.com',
          logo: 'https://www.google.com/s2/favicons?domain=msci.com&sz=128',
          sector: 'Financial Services',
          strategyParams: { ...defaultStrategyParams },
          watchlist: [],
        };
        setClients([defaultClient]);
        setSelectedClient(defaultClient);
      }
    } catch (e) {
      console.error('Failed to fetch clients from server', e);
    }
  }, [selectedClient]);

  const fetchRiskProfiles = useCallback(async () => {
    try {
      const response = await vwapServerService.getRiskProfiles();
      setRiskProfiles(response || []);
    } catch (e) {
      console.error('Failed to fetch risk profiles from server', e);
    }
  }, []);

  const fetchTuningProfiles = useCallback(async () => {
    try {
      const response = await vwapServerService.getRuntimeTuningProfiles();
      setTuningProfiles(response || []);
    } catch (e) {
      console.error('Failed to fetch tuning profiles from server', e);
    }
  }, []);
  

  useEffect(() => {
    fetchClients();
    fetchRiskProfiles();
    fetchTuningProfiles();
  }, [fetchClients, fetchRiskProfiles, fetchTuningProfiles]);

  const updateClientOnServer = async (client: Client) => {
    try {
      await vwapServerService.updateClient(client.id, mapClientToCreateRequest(client));
    } catch (error) {
      console.error('Failed to update client on server:', error);
    }
  };

  const handleChangeClientRiskProfile = async (profile: RiskProfileResponse) => {
    if (!selectedClient || !profile.profileId) return;
    try {
      const res = await vwapServerService.changeRiskProfile(selectedClient.id, { riskProfileId: profile.profileId });
      const updatedClient = mapClientResponseToClient(res);
      setSelectedClient(updatedClient);
      setClients(prev => prev.map(c => c.id === updatedClient.id ? updatedClient : c));
      setStrategyParams(updatedClient.strategyParams); // Keep Parameters panel in sync
      toast.success('Client risk profile updated');
    } catch (e) {
      console.error('Failed to change client risk profile:', e);
      toast.error('Failed to update client risk profile.');
    }
  };

  const handleSaveRiskProfile = async (profile: RiskProfileResponse) => {
    if (!profile.profileId) return;
    try {
      const exists = riskProfiles.find(p => p.profileId === profile.profileId);
      if (exists) {
        await vwapServerService.updateRiskProfile(profile.profileId, profile);
        toast.success(`Risk profile ${profile.profileId} updated`);
      } else {
        await vwapServerService.createRiskProfile(profile);
        toast.success(`Risk profile ${profile.profileId} created`);
      }
      await fetchRiskProfiles();
    } catch (error) {
      console.error('Failed to save risk profile:', error);
      toast.error('Failed to save risk profile.');
    }
  };

  const handleDeleteRiskProfile = async (profileId: string) => {
    try {
      await vwapServerService.deleteRiskProfile(profileId);
      await fetchRiskProfiles();
      toast.success(`Risk profile ${profileId} deleted`);
    } catch (error) {
      console.error('Failed to delete risk profile:', error);
      toast.error('Failed to delete risk profile. It may be in use.');
    }
  };

  // ── Runtime Tuning Profile Handlers ────────────────────────────────────────

  const handleSelectTuningProfile = (profile: RuntimeTuningProfile) => {
    if (!profile.id) {
      setSelectedTuningProfile(null);
    } else {
      setSelectedTuningProfile(profile);
    }
  };

  const handleSaveTuningProfile = async (request: RuntimeTuningProfileRequest, id?: number) => {
    try {
      if (id !== undefined) {
        await vwapServerService.updateRuntimeTuningProfile(id, request);
        toast.success('Tuning profile updated');
      } else {
        await vwapServerService.createRuntimeTuningProfile(request);
        toast.success('Tuning profile created');
      }
      await fetchTuningProfiles();
    } catch (error) {
      console.error('Failed to save tuning profile:', error);
      toast.error('Failed to save tuning profile.');
    }
  };

  const handleDeleteTuningProfile = async (id: number) => {
    try {
      await vwapServerService.deleteRuntimeTuningProfile(id);
      if (selectedTuningProfile?.id === id) setSelectedTuningProfile(null);
      await fetchTuningProfiles();
      toast.success('Tuning profile deleted');
    } catch (error) {
      console.error('Failed to delete tuning profile:', error);
      toast.error('Failed to delete tuning profile.');
    }
  };

  // Sync selectedClient with strategyParams when they change locally
  const handleStrategyParamsChange = (newParams: StrategyParams) => {
    setStrategyParams(newParams);
    if (selectedClient) {
      const updatedClient = { ...selectedClient, strategyParams: newParams };
      setSelectedClient(updatedClient);
      setClients(prev => prev.map(c =>
        c.id === selectedClient.id ? updatedClient : c
      ));
      updateClientOnServer(updatedClient);
    }
  };

  // Handle Watchlist Change (Isolation)
  const handleWatchlistChange = (newWatchlist: any[]) => {
    if (selectedClient) {
      const updatedClient = { ...selectedClient, watchlist: newWatchlist };
      setSelectedClient(updatedClient);
      setClients(prev => prev.map(c =>
        c.id === selectedClient.id ? updatedClient : c
      ));
      updateClientOnServer(updatedClient);
    }
  };

  // Handle Client Selection
  const handleSelectClient = (client: Client) => {
    setSelectedClient(client);
    setStrategyParams(client.strategyParams);
    // When switching client, we might want to clear the current active stock
    setSelectedWatchlistStock(null);
    setCandles([]);
    setChartData([]);
    setImportContext(null);

    // Set branding to client logo/name by default
    setCompanyLogo(client.logo || '');
    setInstrumentName(client.name);
  };

  const handleAddClient = async (client: Client) => {
    try {
      const exists = clients.find(c => c.id === client.id);
      const req = mapClientToCreateRequest(client);

      let res;
      if (exists) {
        res = await vwapServerService.updateClient(client.id, req);
        toast.success(`Client ${client.name} updated successfully`);
      } else {
        res = await vwapServerService.createClient(req);
        toast.success(`Client ${client.name} created successfully`);
      }

      const mapped = mapClientResponseToClient(res);
      setClients(prev => {
        if (exists) return prev.map(c => c.id === mapped.id ? mapped : c);
        return [...prev, mapped];
      });

      if (selectedClient?.id === mapped.id || !exists) {
        setSelectedClient(mapped);
        setStrategyParams(mapped.strategyParams);
        setCompanyLogo(mapped.logo || '');
        setInstrumentName(mapped.name);
      }
    } catch (error) {
      console.error('Failed to save client:', error);
      toast.error('Failed to save client. See console for details.');
    }
  };

  const handleDeleteClient = async (clientId: string) => {
    try {
      await vwapServerService.deleteClient(clientId);
      setClients(prev => {
        const newClients = prev.filter(c => c.id !== clientId);
        if (selectedClient?.id === clientId) {
          if (newClients.length > 0) {
            handleSelectClient(newClients[0]);
          } else {
            setSelectedClient(null);
          }
        }
        return newClients;
      });
      toast.success(`Client ${clientId} deleted`);
    } catch (error) {
      console.error('Failed to delete client:', error);
      toast.error('Failed to delete client. See console for details.');
    }
  };

  // Ensure client branding is restored when no stock is selected
  useEffect(() => {
    if (selectedClient && !selectedWatchlistStock && !importContext) {
      setCompanyLogo(selectedClient.logo || '');
      setInstrumentName(selectedClient.name);
    }
  }, [selectedClient, selectedWatchlistStock, importContext]);

  const handlePriceUpdate = useCallback((data: any) => {
    // console.log('Real-time price update:', data);
    setRealtimePriceUpdate({
      ltp: data.ltp,
      timestamp: data.timestamp,
      volume: data.volume,
      vwap: data.vwap,
    });
  }, []);

  // WebSocket for real-time price streaming (Upstox fallback)
  const { isConnected: wsConnected } = useUpstoxWebSocket({
    accessToken: upstoxAccessToken,
    instrumentKey: selectedWatchlistStock?.instrument_key || null,
    enabled: mode === 'realtime' && !!selectedWatchlistStock && !!upstoxAccessToken && !isBackendDataLive,
    onPriceUpdate: handlePriceUpdate,
  });

  // WebSocket for VWAP Server signals & calibration (Primary source)
  //
  // WS messages carry two SEPARATE fields:
  //   msg.clientId   — bare client ID        e.g. "TRADER_DESK"
  //   msg.instrument — bare instrument key   e.g. "NSE_EQ|INE040A01034"
  //
  // The analytics REST API and our local maps use a COMPOSITE key:
  //   clientId::instrumentKey                e.g. "TRADER_DESK::NSE_EQ|INE040A01034"
  //
  // We build that composite on arrival so everything downstream is consistent.
  const { connected: vwapWsConnected, connecting: vwapWsConnecting } = useVwapWebSocket({
    autoConnect: true,
    handlers: {
      onSignal: (msg) => {
        // Build composite key from the two separate WS fields
        const compositeKey = `${msg.clientId}::${msg.instrument}`;

        const newSignal: BackendBuySignal = {
  time: msg.marketTime.substring(0, 5),

  execPrice: msg.ltp,

  executedQty: msg.qty,

  cumTarget: msg.cumTarget,

  xStar: msg.xStar,

  binIdx: msg.binIdx,

  // tNorm: msg.tNorm, // focus here if buy signals send these two via ws then turn these on... Also turn them on in types.ts

  // qtyToBuy: msg.qtyToBuy,
};

        setSignalsMap(prev => {
          const updatedSignals = [...(prev[compositeKey] || []), newSignal];
          const newMap = { ...prev, [compositeKey]: updatedSignals };
          try {
            const today = new Date().toISOString().split('T')[0];
            localStorage.setItem(`vwap_signals_${today}`, JSON.stringify(newMap));
          } catch (e) {
            console.error('Failed to persist signals to localStorage', e);
          }
          return newMap;
        });

        // Only push to live feed when this message belongs to the selected client+instrument
        const selectedKey = selectedClient && selectedWatchlistStock
          ? `${selectedClient.id}::${selectedWatchlistStock.instrument_key}`
          : null;
        if (selectedKey && compositeKey === selectedKey) {
          setLiveBuySignals(prev => [...prev, newSignal]);
        }
      },
      onCalibration: (msg) => {
        const compositeKey = `${msg.clientId}::${msg.instrument}`;

        setCalibrationMap(prev => ({ ...prev, [compositeKey]: msg }));

        const selectedKey = selectedClient && selectedWatchlistStock
          ? `${selectedClient.id}::${selectedWatchlistStock.instrument_key}`
          : null;
        if (selectedKey && compositeKey === selectedKey && msg.currentVWAP > 0) {
          setLiveCalibration(msg);
        }
      },
      onRegime: (msg) => {
        const compositeKey = `${msg.clientId}::${msg.instrument}`;
        const selectedKey = selectedClient && selectedWatchlistStock
          ? `${selectedClient.id}::${selectedWatchlistStock.instrument_key}`
          : null;
        if (selectedKey && compositeKey === selectedKey) {
          setLiveRegime(msg);
        }
      },
    }
  });

  // Sync liveCalibration & liveBuySignals when selected client/stock changes or maps update.
  // Always look up by composite key: clientId::instrumentKey
  useEffect(() => {
    const compositeKey = selectedClient && selectedWatchlistStock
      ? `${selectedClient.id}::${selectedWatchlistStock.instrument_key}`
      : importContext?.instrumentKey ?? null;

    setLiveCalibration(compositeKey ? (calibrationMap[compositeKey] ?? null) : null);
    setLiveBuySignals(compositeKey ? (signalsMap[compositeKey] ?? []) : []);
  }, [selectedClient, selectedWatchlistStock, importContext, calibrationMap, signalsMap]);

  // Load persisted signals on mount and cleanup old data
  useEffect(() => {
    const today = new Date().toISOString().split('T')[0];
    const key = `vwap_signals_${today}`;

    // Load today's signals
    try {
      const stored = localStorage.getItem(key);
      if (stored) {
        setSignalsMap(JSON.parse(stored));
      }
    } catch (e) {
      console.error('Failed to load signals from localStorage', e);
    }

    // Cleanup old data (anything not from today)
    try {
      for (let i = 0; i < localStorage.length; i++) {
        const k = localStorage.key(i);
        if (k?.startsWith('vwap_signals_') && k !== key) {
          localStorage.removeItem(k);
        }
      }
    } catch (e) {
      // Ignore cleanup errors
    }
  }, []);

  // REST polling fallback for realtime price updates (keeps chart updating even if WS doesn't stream)
  const pollingIntervalRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    // Clear any existing interval
    if (pollingIntervalRef.current) {
      clearInterval(pollingIntervalRef.current);
      pollingIntervalRef.current = null;
    }

    // Backend polling for latest market data (1 second interval)
    if (mode === 'realtime' && selectedWatchlistStock?.instrument_key && isBackendDataLive) {
      pollingIntervalRef.current = setInterval(async () => {
        try {
          const res = await vwapServerService.getMarketDataLatest(selectedWatchlistStock.instrument_key);
          if (res && res.current) {
            handlePriceUpdate({
              ltp: res.current.close,
              timestamp: res.current.timestamp,
              volume: res.current.volume,
              vwap: res.current.vwap,
            });
          }
        } catch (e) {
          // Backend not returning latest for this stock
        }
      }, 1000);
      return;
    }

    // Don't poll Upstox if WebSocket is connected or not in realtime mode
    if (mode !== 'realtime' || !upstoxAccessToken || !selectedWatchlistStock?.instrument_key || wsConnected) {
      return;
    }

    let cancelled = false;

    const fetchQuote = async () => {
      // Skip polling if WebSocket is connected
      if (wsConnected) {
        if (pollingIntervalRef.current) {
          clearInterval(pollingIntervalRef.current);
          pollingIntervalRef.current = null;
        }
        return;
      }

      try {
        const response = await fetch(
          `/api/upstox/market-quote?instrument_key=${encodeURIComponent(selectedWatchlistStock.instrument_key)}&access_token=${encodeURIComponent(upstoxAccessToken)}`,
          { method: 'GET' }
        );
        const result = await response.json();

        if (cancelled) return;

        if (result?.status !== 'success' || !result?.data) return;

        const instrumentData =
          result.data[selectedWatchlistStock.instrument_key] ||
          (Object.values(result.data).length === 1 ? Object.values(result.data)[0] : undefined);

        if (!instrumentData) return;

        const ltp = Number(instrumentData.last_price ?? instrumentData.ltp ?? 0);
        const volume = Number(instrumentData.volume ?? 0);

        if (Number.isFinite(ltp) && ltp > 0) {
          setRealtimePriceUpdate({
            ltp,
            timestamp: Date.now(),
            volume,
          });
        }
      } catch {
        // ignore polling errors; WS can still work
      }
    };

    // Fetch immediately, then poll
    fetchQuote();
    pollingIntervalRef.current = setInterval(fetchQuote, 2500);

    return () => {
      cancelled = true;
      if (pollingIntervalRef.current) {
        clearInterval(pollingIntervalRef.current);
        pollingIntervalRef.current = null;
      }
    };
  }, [mode, upstoxAccessToken, selectedWatchlistStock, wsConnected]);

  // Reset state when switching modes to ensure clean transition
  useEffect(() => {
    setCandles([]);
    setChartData([]);
    setMultiDayResults(null);
    setBacktestResults(null);
    setActiveDate('');
    setRealtimePriceUpdate(undefined);
    setPretradeData(null);
    setIsBacktesting(false);
    setBackTestProgress(0);
    setBackTestMessage('');
    setImportContext(null);
    setSelectedWatchlistStock(null);
    setLiveBuySignals([]);
    setLiveCalibration(null);
    setLiveRegime(null);
  }, [mode]);

  const handleDataUpload = (data: Candle[], logo?: string, name?: string) => {
    setCandles(data);
    setChartData([]);
    setCompanyLogo(logo || '');
    setInstrumentName(name || '');
  };

  const handleWatchlistStockSelect = useCallback(async (stock: any) => {
    // console.log('handleWatchlistStockSelect called with stock:', stock, 'Mode:', mode);

    setSelectedWatchlistStock(stock);
    setRightSidebarCollapsed(false);

    // Immediately clear current chart to avoid showing previous stock
    setCandles([]);
    setChartData([]);
    setRealtimePriceUpdate(undefined);
    setLiveBuySignals([]);
    setLiveCalibration(null);
    setLiveRegime(null);

    if (!upstoxAccessToken) {
      setInstrumentName(stock.name);
      setCompanyLogo(stock.company?.domain ? `https://www.google.com/s2/favicons?domain=${stock.company.domain}&sz=64` : '');
      return;
    }

    try {
      let fetchedCandles: any[] = [];
      let usedBackend = false;
      setIsBackendDataLive(false);

      if (mode === 'realtime') {
        try {
          console.log('[DEBUG] Attempting to fetch backend candles for:', stock.instrument_key);
          const backendRes = await vwapServerService.getMarketDataCandles(stock.instrument_key);
          console.log('[DEBUG] Backend candles response:', backendRes);

          if (backendRes && backendRes.candles && backendRes.candles.length > 0) {
            fetchedCandles = backendRes.candles.map((c: any) => ({
              timestamp: new Date(c.timestamp),
              open: c.open,
              high: c.high,
              low: c.low,
              close: c.close,
              volume: c.volume,
              vwap: c.vwap
            }));
            usedBackend = true;
            setIsBackendDataLive(true);
            console.log('[DEBUG] Successfully mapped backend candles. Count:', fetchedCandles.length);

            // Also grab the current tick from the candles response to initialize realtimePriceUpdate
            if (backendRes.current) {
              console.log('[DEBUG] Setting initial realtime update from backend current:', backendRes.current);
              setRealtimePriceUpdate({
                ltp: backendRes.current.close,
                timestamp: backendRes.current.timestamp,
                volume: backendRes.current.volume,
                vwap: backendRes.current.vwap,
              });
            }
          } else {
            console.log('[DEBUG] Backend candles response was empty or invalid structure');
          }
        } catch (err) {
          console.log('[DEBUG] Backend candles not available, falling back to Upstox API', err);
        }
      }

      if (!usedBackend) {
        console.log('[DEBUG] Falling back to Upstox historical candles');

        // Determine date range and interval based on mode
        let fromDate: string;
        let toDate: string;
        let interval: 'day' | '1minute';

        if (mode === 'realtime') {
          toDate = getTodayDate();
          fromDate = getTodayDate();
          interval = '1minute';
        } else {
          const today = new Date();
          const thirtyDaysAgo = new Date(today);
          thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

          toDate = today.toISOString().split('T')[0];
          fromDate = thirtyDaysAgo.toISOString().split('T')[0];
          interval = 'day';
        }

        fetchedCandles = await fetchHistoricalCandles({
          accessToken: upstoxAccessToken,
          instrumentKey: stock.instrument_key,
          interval,
          fromDate,
          toDate,
        });

        // In realtime mode, Upstox can return empty candles for today early in the session.
        // Fallback to include yesterday->today to ensure the intraday chart is visible.
        if (mode === 'realtime' && fetchedCandles.length === 0) {
          fetchedCandles = await fetchHistoricalCandles({
            accessToken: upstoxAccessToken,
            instrumentKey: stock.instrument_key,
            interval: '1minute',
            fromDate: getYesterdayDate(),
            toDate: getTodayDate(),
          });
        }

        // If still empty, try last 7 days for intraday data
        if (mode === 'realtime' && fetchedCandles.length === 0) {
          const sevenDaysAgo = new Date();
          sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
          fetchedCandles = await fetchHistoricalCandles({
            accessToken: upstoxAccessToken,
            instrumentKey: stock.instrument_key,
            interval: '1minute',
            fromDate: sevenDaysAgo.toISOString().split('T')[0],
            toDate: getTodayDate(),
          });
        }
      }

      setCandles(fetchedCandles);
      setCompanyLogo(stock.company?.domain ? `https://www.google.com/s2/favicons?domain=${stock.company.domain}&sz=64` : '');
      setInstrumentName(stock.name);
    } catch (error) {
      console.error('Failed to load stock data:', error);
      // Fallback UI state
      setInstrumentName(stock.name);
      setCompanyLogo(stock.company?.domain ? `https://www.google.com/s2/favicons?domain=${stock.company.domain}&sz=64` : '');
    }
  }, [mode, upstoxAccessToken]);

  // Reset real-time update when stock changes
  useEffect(() => {
    setRealtimePriceUpdate(undefined);
  }, [selectedWatchlistStock]);

  const handleResizeLeft = (e: React.MouseEvent) => {
    setIsResizingLeft(true);
    const startX = e.clientX;
    const startWidth = leftSidebarWidth;

    const handleMouseMove = (moveEvent: MouseEvent) => {
      const newWidth = startWidth + (moveEvent.clientX - startX);
      if (newWidth >= 200 && newWidth <= 600) {
        setLeftSidebarWidth(newWidth);
      }
    };

    const handleMouseUp = () => {
      setIsResizingLeft(false);
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
  };

  const handleResizeRight = (e: React.MouseEvent) => {
    setIsResizingRight(true);
    const startX = e.clientX;
    const startWidth = rightSidebarWidth;

    const handleMouseMove = (moveEvent: MouseEvent) => {
      const newWidth = startWidth - (moveEvent.clientX - startX);
      if (newWidth >= 200 && newWidth <= 600) {
        setRightSidebarWidth(newWidth);
      }
    };

    const handleMouseUp = () => {
      setIsResizingRight(false);
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
  };

  /** Generate weekday dates between two YYYY-MM-DD strings */
  const generateTradingDates = (start: string, end: string): string[] => {
    const dates: string[] = [];
    const cur = new Date(start);
    const endD = new Date(end);
    while (cur <= endD) {
      const day = cur.getDay();
      if (day !== 0 && day !== 6) {
        dates.push(cur.toISOString().slice(0, 10));
      }
      cur.setDate(cur.getDate() + 1);
    }
    return dates;
  };

  const handleRunBacktest = async (params: StrategyParams) => {
    if (!importContext?.instrumentKey) {
      alert('Please select an instrument in the "Import from Upstox" section first');
      return;
    }
    if (!importContext.startDate || !importContext.endDate) {
      alert('Please choose a Start Date and End Date in the Import section');
      return;
    }

    const dates = generateTradingDates(importContext.startDate, importContext.endDate);
    if (dates.length === 0) {
      alert('No trading days found in the selected date range');
      return;
    }

    setStrategyParams(params);
    setIsBacktesting(true);
    setBackTestProgress(10);
    setBackTestMessage('Connecting to backend...');
    setMultiDayResults(null);
    setBacktestResults(null);

    try {
      setBackTestProgress(30);
      setBackTestMessage(`Running backtest for ${dates.length} trading day(s)...`);

      const response = await backendService.runMultiDayBacktest({
        instrumentKey: importContext.instrumentKey,
        bins: params.numTranches,
        lambda: params.lambda ?? 17.0,
        totalQty: params.totalQuantity,
        dates,
      });

      setBackTestProgress(80);
      setBackTestMessage('Processing results...');

      setMultiDayResults(response);

      // Auto-select the first successful day
      const firstOk = response.results.find((r) => r.status === 'OK');
      const initialDate = firstOk?.date || response.results[0]?.date || '';
      setActiveDate(initialDate);

      // Load candles for the initial active date
      if (initialDate) {
        await loadCandlesForDate(initialDate);
      }

      setBackTestProgress(100);
      setBackTestMessage('Backtest complete!');
    } catch (error: any) {
      console.error('Backtest failed:', error);
      setBackTestMessage(`Backtest failed: ${error?.message || 'Unknown error'}`);
    } finally {
      setIsBacktesting(false);
    }
  };

  /** Fetch 1-minute historical candles for a specific date */
  const loadCandlesForDate = useCallback(async (date: string) => {
    const key = importContext?.instrumentKey || selectedWatchlistStock?.instrument_key;
    if (!key || !upstoxAccessToken) return;
    try {
      const fetched = await fetchHistoricalCandles({
        accessToken: upstoxAccessToken,
        instrumentKey: key,
        interval: '1minute',
        fromDate: date,
        toDate: date,
      });
      setCandles(fetched);
      setChartData([]);
    } catch (err) {
      console.error('Failed to load candles for date', date, err);
    }
  }, [importContext, selectedWatchlistStock, upstoxAccessToken]);

  /** When the user picks a different day in the dropdown */
  const handleActiveDateChange = useCallback(async (date: string) => {
    setActiveDate(date);
    await loadCandlesForDate(date);
  }, [loadCandlesForDate]);

  /** Get signals for the currently active day */
  const activeDayResult: DailyBacktestResult | undefined = multiDayResults?.results.find(
    (r) => r.date === activeDate
  );
  const activeBuySignals: BackendBuySignal[] = activeDayResult?.buySignals ?? [];

  const handleRunRealtime = async (params: { totalQty: number; nBins: number; lambda: number }) => {
    if (!selectedWatchlistStock?.instrument_key) {
      alert('Please select a stock from the watchlist first');
      return;
    }

    setIsCalibrating(true);
    setCalibrationMessage('Calibrating instrument...');

    try {
      const response = await vwapServerService.marketOpen({
        clientId: selectedClient?.id || 'TRADER_DESK',
        instruments: [
          {
            instrumentKey: selectedWatchlistStock.instrument_key,
            totalQty: params.totalQty,
            nBins: params.nBins,
            lambda: params.lambda,
            timezone: 'Asia/Kolkata',
          },
        ],
      });

      if (response.status === 'calibrated') {
        setCalibrationMessage(`Calibrated ${response.instrumentsCalibrated} instrument(s) successfully`);
        alert(`Instrument calibrated successfully. You can add more stocks if needed.`);
      } else {
        setCalibrationMessage(response.message || 'Calibration failed');
        alert(response.message || 'Calibration failed');
      }
    } catch (error) {
      console.error('Market open calibration failed:', error);
      setCalibrationMessage('Failed to calibrate. Please try again.');
      alert(error instanceof Error ? error.message : 'Failed to calibrate');
    } finally {
      setIsCalibrating(false);
    }
  };

  const {
  watchlists,
  fetchWatchlists,
} = useWatchlistStore();

useEffect(() => {
  if (selectedClient?.id) {
    fetchWatchlists(selectedClient.id);
  }
}, [selectedClient, fetchWatchlists]);

  return (
    <div className="h-screen flex flex-col bg-background text-foreground overflow-hidden">
      {/* Header */}
      <Header
        chartTimeframeMode={chartTimeframeMode}
        onTimeframeChange={setChartTimeframeMode}
        selectedClient={selectedClient}
        clients={clients}
        onSelectClient={handleSelectClient}
        onAddClient={handleAddClient}
        onDeleteClient={handleDeleteClient}
        riskProfiles={riskProfiles}
        activeRiskProfileId={selectedClient?.riskProfileId}
        onChangeRiskProfile={handleChangeClientRiskProfile}
        onSaveRiskProfile={handleSaveRiskProfile}
        onDeleteRiskProfile={handleDeleteRiskProfile}
        tuningProfiles={tuningProfiles}
        selectedTuningProfileId={selectedTuningProfile?.id}
        onSelectTuningProfile={handleSelectTuningProfile}
        onSaveTuningProfile={handleSaveTuningProfile}
        onDeleteTuningProfile={handleDeleteTuningProfile}
      />

      {/* Main Content */}
      <div className="flex-1 flex overflow-hidden gap-2 p-2">
        {/* Left Panel - Data Upload & Parameters */}
        {!leftSidebarCollapsed ? (
          <>
            <div
              className="bg-card rounded-l-lg border border-border flex flex-col overflow-hidden relative"
              style={{ width: `${leftSidebarWidth}px` }}
            >
              <button
                onClick={() => setLeftSidebarCollapsed(true)}
                className="absolute top-3.5 right-3.5 z-50 p-1.5 rounded-md hover:bg-secondary text-muted-foreground hover:text-foreground transition-colors"
                title="Collapse Panel"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              {mode === 'vwap-live' ? (
                <>
                  <MarketOpenForm />
                  <LiveTradingPanel />
                </>
              ) : (
                <>
                <WatchlistPanel
  clientId={selectedClient?.id || ""}
  onSelectStock={handleWatchlistStockSelect}
/>

                  <DataUploadPanel
                    clientId={selectedClient?.id || ""}
                    onDataUpload={handleDataUpload}
                    mode={mode as 'backtest' | 'realtime'}
                    onWatchlistStockSelect={handleWatchlistStockSelect}
                    onUpstoxTokenChange={setUpstoxAccessToken}
                    wsConnected={wsConnected}
                    onImportContextChange={(ctx) => {
                      setImportContext(ctx);
                      // Mirror the selected instrument name/logo for the chart header
                      if (ctx.instrumentKey) {
                        setInstrumentName(ctx.instrumentName);
                        // Use selectedWatchlistStock logo if available, otherwise leave blank
                      }
                    }}
                    // watchlist={selectedClient?.watchlist || []}
                    // onWatchlistChange={handleWatchlistChange}
                  />
                  <ParametersPanel
                    params={strategyParams}
                    onParamsChange={handleStrategyParamsChange}
                    onRunBacktest={handleRunBacktest}
                    onRunRealtime={handleRunRealtime}
                    isRunning={isBacktesting || isCalibrating}
                    progress={isCalibrating ? 50 : backTestProgress}
                    message={isCalibrating ? calibrationMessage : backTestMessage}
                    onModeChange={(newMode: 'backtest' | 'realtime') => setMode(newMode as 'backtest' | 'realtime')}
                    selectedInstrumentKey={selectedWatchlistStock?.instrument_key || importContext?.instrumentKey}
                    importContext={importContext}
                  />
                </>
              )}
            </div>
            {/* Resize Handle */}
            <div
              className="w-1 bg-border hover:bg-primary cursor-col-resize"
              onMouseDown={handleResizeLeft}
            />
          </>
        ) : (
          <button
            onClick={() => setLeftSidebarCollapsed(false)}
            className="bg-card border border-border rounded-l-lg px-2 hover:bg-secondary"
          >
            <ChevronRight className="w-4 h-4 text-muted-foreground" />
          </button>
        )}

        {/* Center Panel - Chart */}
        <div className="flex-1 bg-card rounded-lg border border-border flex flex-col overflow-hidden">
          {/* Multi-day date selector */}
          {multiDayResults && multiDayResults.results.length > 0 && (
            <div className="flex items-center gap-3 px-4 py-2 border-b border-border bg-secondary/30">
              <Calendar className="w-4 h-4 text-primary flex-shrink-0" />
              <span className="text-xs text-muted-foreground font-medium">Trading Day:</span>
              <div className="flex gap-1.5 flex-wrap">
                {multiDayResults.results.map((r) => (
                  <button
                    key={r.date}
                    onClick={() => handleActiveDateChange(r.date)}
                    className={`px-3 py-1 rounded-full text-xs font-medium transition-all ${r.date === activeDate
                      ? 'bg-primary text-primary-foreground shadow-sm'
                      : r.status === 'OK'
                        ? 'bg-background border border-border text-foreground hover:bg-secondary'
                        : 'bg-background border border-dashed border-border text-muted-foreground'
                      }`}
                    title={r.status !== 'OK' ? r.errorMessage || r.status : undefined}
                  >
                    {r.date}
                    {r.status === 'OK' && r.betterThanMarket && (
                      <span className="ml-1 text-green-500">▲</span>
                    )}
                    {r.status === 'OK' && !r.betterThanMarket && (
                      <span className="ml-1 text-red-400">▼</span>
                    )}
                    {r.status !== 'OK' && (
                      <span className="ml-1 text-yellow-500">!</span>
                    )}
                  </button>
                ))}
              </div>
              {multiDayResults.successfulDays > 1 && (
                <span className="ml-auto text-xs text-muted-foreground">
                  Avg slippage: <span className={multiDayResults.avgSlippageBps < 0 ? 'text-green-500' : 'text-red-400'}>
                    {multiDayResults.avgSlippageBps.toFixed(2)} bps
                  </span>
                </span>
              )}
            </div>
          )}
          <ChartPanel
            candles={candles}
            chartData={chartData}
            customizationPrefs={customizationPrefs}
            onPreferencesChange={onPreferencesChange}
            onChartDataChange={setChartData}
            companyLogo={companyLogo}
            instrumentName={instrumentName}
            instrumentKey={selectedClient && selectedWatchlistStock ? `${selectedClient.id}::${selectedWatchlistStock.instrument_key}` : undefined}
            timeframeMode={chartTimeframeMode}
            onTimeframeChange={setChartTimeframeMode}
            mode={mode as 'backtest' | 'realtime'}
            realtimePriceUpdate={realtimePriceUpdate}
            onPretradeDataChange={setPretradeData}
            backendBuySignals={[...activeBuySignals, ...liveBuySignals]}
            liveCalibration={liveCalibration}
            liveRegime={liveRegime}
            vwapWsConnected={vwapWsConnected}
            vwapWsConnecting={vwapWsConnecting}
          />
        </div>

        {/* Right Panel - Stock Detail & Customization */}
        {!rightSidebarCollapsed ? (
          <>
            {/* Resize Handle */}
            <div
              className="w-1 bg-border hover:bg-primary cursor-col-resize"
              onMouseDown={handleResizeRight}
            />
            <div
              className="bg-card rounded-r-lg border border-border flex flex-col overflow-hidden relative"
              style={{ width: `${rightSidebarWidth}px` }}
            >
              <button
                onClick={() => setRightSidebarCollapsed(true)}
                className="absolute top-3.5 right-10 z-50 p-1.5 rounded-md hover:bg-secondary text-muted-foreground hover:text-foreground transition-colors"
                title="Collapse Panel"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
              <StockDetailPanel
                stock={selectedWatchlistStock}
                accessToken={upstoxAccessToken}
                mode={mode as 'backtest' | 'realtime'}
                wsConnected={wsConnected}
                onClose={() => setSelectedWatchlistStock(null)}
                pretradeData={pretradeData}
                liveCalibration={liveCalibration}
              />
              {/* Runtime Tuning Panel — realtime / vwap-live only */}
              {mode !== 'backtest' && (
                <div className={`border-t border-border flex flex-col ${!tuningPanelCollapsed ? 'flex-1 min-h-0' : 'flex-none'}`}>
                  <button
                    onClick={() => setTuningPanelCollapsed(!tuningPanelCollapsed)}
                    className="w-full px-4 py-2 flex items-center justify-between text-sm font-medium text-foreground hover:bg-secondary transition-colors"
                  >
                    <span className="flex items-center gap-2">
                      <span>Runtime Tuning</span>
                      <span className="px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider bg-primary/10 text-primary rounded-sm">Live</span>
                    </span>
                    {tuningPanelCollapsed ? <ChevronDown className="w-4 h-4" /> : <ChevronUp className="w-4 h-4" />}
                  </button>
                  {!tuningPanelCollapsed && (
                    <RuntimeTuningPanel
                      clientId={selectedClient?.id}
                      instrumentKey={selectedWatchlistStock?.instrument_key}
                      selectedTuningProfile={selectedTuningProfile}
                    />
                  )}
                </div>
              )}
              {/* Backend multi-day results */}
              {activeDayResult && activeDayResult.status === 'OK' && (
                <div className="border-t border-border">
                  <button
                    onClick={() => setResultsCollapsed(!resultsCollapsed)}
                    className="w-full px-4 py-2 flex items-center justify-between text-sm font-medium text-foreground hover:bg-secondary transition-colors"
                  >
                    <span>Backtest Results — {activeDate}</span>
                    {resultsCollapsed ? <ChevronDown className="w-4 h-4" /> : <ChevronUp className="w-4 h-4" />}
                  </button>
                  {!resultsCollapsed && (
                    <BenchmarkingPanel
                      key={activeDate}
                      dailyResult={activeDayResult}
                      multiDayResponse={multiDayResults!}
                    />
                  )}
                </div>
              )}
              {/* Legacy local results (fallback) */}
              {backtestResults && !multiDayResults && (
                <div className="border-t border-border">
                  <button
                    onClick={() => setResultsCollapsed(!resultsCollapsed)}
                    className="w-full px-4 py-2 flex items-center justify-between text-sm font-medium text-foreground hover:bg-secondary transition-colors"
                  >
                    <span>Backtest Results</span>
                    {resultsCollapsed ? <ChevronDown className="w-4 h-4" /> : <ChevronUp className="w-4 h-4" />}
                  </button>
                  {!resultsCollapsed && (
                    <BenchmarkingPanel
                      dailyResult={null}
                      multiDayResponse={null}
                      legacyResults={backtestResults}
                      legacyCandles={candles}
                    />
                  )}
                </div>
              )}
            </div>
          </>
        ) : (
          <button
            onClick={() => setRightSidebarCollapsed(false)}
            className="bg-card border border-border rounded-r-lg px-2 hover:bg-secondary"
          >
            <ChevronLeft className="w-4 h-4 text-muted-foreground" />
          </button>
        )}
      </div>

      {/* Footer - Execution Summary (backend) */}
      {activeDayResult && activeDayResult.status === 'OK' && (
        <div className="bg-card border-t border-border">
          <button
            onClick={() => setSummaryCollapsed(!summaryCollapsed)}
            className="w-full px-6 py-2 flex items-center justify-between text-sm font-medium text-foreground hover:bg-secondary transition-colors"
          >
            <span>Execution Summary — {activeDate}</span>
            {summaryCollapsed ? <ChevronDown className="w-4 h-4" /> : <ChevronUp className="w-4 h-4" />}
          </button>
          {!summaryCollapsed && (
            <ExecutionSummary
              dailyResult={activeDayResult}
              multiDayResponse={multiDayResults!}
              params={strategyParams}
            />
          )}
        </div>
      )}
      {/* Legacy local results footer */}
      {backtestResults && !multiDayResults && (
        <div className="bg-card border-t border-border">
          <button
            onClick={() => setSummaryCollapsed(!summaryCollapsed)}
            className="w-full px-6 py-2 flex items-center justify-between text-sm font-medium text-foreground hover:bg-secondary transition-colors"
          >
            <span>Execution Summary</span>
            {summaryCollapsed ? <ChevronDown className="w-4 h-4" /> : <ChevronUp className="w-4 h-4" />}
          </button>
          {!summaryCollapsed && (
            <ExecutionSummary
              dailyResult={null}
              multiDayResponse={null}
              legacyResults={backtestResults}
              params={strategyParams}
            />
          )}
        </div>
      )}
    </div>
  );
} 

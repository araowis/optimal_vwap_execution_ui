"use client";

import { useEffect, useRef, useState } from "react";
import {
  Check,
  Plus,
  Search,
  X,
  Loader2,
  Grid,
  Building2,
} from "lucide-react";

import { useWatchlistStore } from "@/stores/watchlist-store";
import {
  removeInstrument,
  createWatchlist,
  renameWatchlist,
  deleteWatchlist,
  addInstrument,
} from "@/lib/watchlist-service";
import { toast } from "sonner";

interface WatchlistPanelProps {
  clientId: string;
  onSelectStock: (stock: any) => void;
}

type EnrichEntry = { sector: string; domain: string; name: string; symbol: string };

// Lookup by trading symbol (strip -EQ suffix)
const symbolMap: Record<string, EnrichEntry> = {
  RELIANCE:    { sector: "Energy & Petrochemicals",      domain: "relianceindustries.com", name: "Reliance Industries", symbol: "RELIANCE" },
  TCS:         { sector: "Information Technology",       domain: "tcs.com",                name: "TCS",                 symbol: "TCS" },
  INFY:        { sector: "Information Technology",       domain: "infosys.com",            name: "Infosys",             symbol: "INFY" },
  HDFCBANK:    { sector: "Banking & Finance",            domain: "hdfcbank.com",           name: "HDFC Bank",           symbol: "HDFCBANK" },
  ICICIBANK:   { sector: "Banking & Finance",            domain: "icicibank.com",          name: "ICICI Bank",          symbol: "ICICIBANK" },
  SBIN:        { sector: "Banking & Finance",            domain: "sbi.co.in",             name: "State Bank of India",  symbol: "SBIN" },
  BHARTIARTL:  { sector: "Telecommunication",            domain: "airtel.in",             name: "Bharti Airtel",        symbol: "BHARTIARTL" },
  ITC:         { sector: "Consumer Goods (FMCG)",        domain: "itcportal.com",         name: "ITC Limited",          symbol: "ITC" },
  WIPRO:       { sector: "Information Technology",       domain: "wipro.com",             name: "Wipro",               symbol: "WIPRO" },
  HCLTECH:     { sector: "Information Technology",       domain: "hcltech.com",           name: "HCL Technologies",    symbol: "HCLTECH" },
  MARUTI:      { sector: "Automobile",                   domain: "marutisuzuki.com",      name: "Maruti Suzuki",        symbol: "MARUTI" },
  TATAMOTORS:  { sector: "Automobile",                   domain: "tatamotors.com",        name: "Tata Motors",          symbol: "TATAMOTORS" },
  KOTAKBANK:   { sector: "Banking & Finance",            domain: "kotak.com",             name: "Kotak Mahindra Bank",  symbol: "KOTAKBANK" },
  AXISBANK:    { sector: "Banking & Finance",            domain: "axisbank.com",          name: "Axis Bank",            symbol: "AXISBANK" },
  ASIANPAINT:  { sector: "Chemicals & Paints",           domain: "asianpaints.com",       name: "Asian Paints",         symbol: "ASIANPAINT" },
  LT:          { sector: "Construction & Engineering",   domain: "larsentoubro.com",      name: "Larsen & Toubro",      symbol: "LT" },
  HINDUNILVR:  { sector: "Consumer Goods (FMCG)",        domain: "hul.co.in",             name: "Hindustan Unilever",   symbol: "HINDUNILVR" },
  BAJFINANCE:  { sector: "Financial Services",           domain: "bajajfinserv.in",       name: "Bajaj Finance",        symbol: "BAJFINANCE" },
  BAJAJFINSV:  { sector: "Financial Services",           domain: "bajajfinserv.in",       name: "Bajaj Finserv",        symbol: "BAJAJFINSV" },
  SUNPHARMA:   { sector: "Pharmaceuticals",              domain: "sunpharma.com",         name: "Sun Pharmaceutical",   symbol: "SUNPHARMA" },
  JSWSTEEL:    { sector: "Metals & Mining",              domain: "jswsteel.in",           name: "JSW Steel",            symbol: "JSWSTEEL" },
  COALINDIA:   { sector: "Energy & Mining",              domain: "coalindia.in",          name: "Coal India",           symbol: "COALINDIA" },
  ADANIENT:    { sector: "Conglomerate & Trading",       domain: "adanienterprises.com",  name: "Adani Enterprises",    symbol: "ADANIENT" },
  ADANIPORTS:  { sector: "Infrastructure & Logistics",   domain: "adaniports.com",        name: "Adani Ports",          symbol: "ADANIPORTS" },
  NTPC:        { sector: "Energy & Utilities",           domain: "ntpc.co.in",            name: "NTPC",                symbol: "NTPC" },
  POWERGRID:   { sector: "Energy & Utilities",           domain: "powergridindia.com",    name: "Power Grid",           symbol: "POWERGRID" },
  ONGC:        { sector: "Energy & Oil",                 domain: "ongcindia.com",         name: "ONGC",                symbol: "ONGC" },
  TECHM:       { sector: "Information Technology",       domain: "techmahindra.com",      name: "Tech Mahindra",        symbol: "TECHM" },
  ULTRACEMCO:  { sector: "Construction Materials",       domain: "ultratechcement.com",   name: "UltraTech Cement",     symbol: "ULTRACEMCO" },
  TITAN:       { sector: "Consumer Goods",               domain: "titancompany.in",       name: "Titan Company",        symbol: "TITAN" },
  NESTLEIND:   { sector: "Consumer Goods (FMCG)",        domain: "nestle.in",             name: "Nestle India",         symbol: "NESTLEIND" },
  DRREDDY:     { sector: "Pharmaceuticals",              domain: "drreddys.com",          name: "Dr Reddy's Labs",      symbol: "DRREDDY" },
  CIPLA:       { sector: "Pharmaceuticals",              domain: "cipla.com",             name: "Cipla",               symbol: "CIPLA" },
  DIVISLAB:    { sector: "Pharmaceuticals",              domain: "divislaboratories.com", name: "Divi's Labs",          symbol: "DIVISLAB" },
  APOLLOHOSP:  { sector: "Healthcare",                   domain: "apollohospitals.com",   name: "Apollo Hospitals",     symbol: "APOLLOHOSP" },
  BAJAJ:       { sector: "Automobile",                   domain: "bajajauto.com",         name: "Bajaj Auto",           symbol: "BAJAJ-AUTO" },
  BAJAJ_AUTO:  { sector: "Automobile",                   domain: "bajajauto.com",         name: "Bajaj Auto",           symbol: "BAJAJ-AUTO" },
  TATACONSUM:  { sector: "Consumer Goods (FMCG)",        domain: "tataconsumer.com",      name: "Tata Consumer",        symbol: "TATACONSUM" },
  M_M:         { sector: "Automobile",                   domain: "mahindra.com",          name: "Mahindra & Mahindra",  symbol: "M&M" },
  TATASTEEL:   { sector: "Metals & Mining",              domain: "tatasteel.com",         name: "Tata Steel",           symbol: "TATASTEEL" },
  HINDALCO:    { sector: "Metals & Mining",              domain: "hindalco.com",          name: "Hindalco Industries",  symbol: "HINDALCO" },
  VEDL:        { sector: "Metals & Mining",              domain: "vedantalimited.com",    name: "Vedanta",             symbol: "VEDL" },
  GRASIM:      { sector: "Diversified",                  domain: "adityabirla.com",       name: "Grasim Industries",    symbol: "GRASIM" },
  INDUSINDBK:  { sector: "Banking & Finance",            domain: "indusind.com",          name: "IndusInd Bank",        symbol: "INDUSINDBK" },
  BPCL:        { sector: "Energy & Oil",                 domain: "bharatpetroleum.com",   name: "BPCL",                symbol: "BPCL" },
  HEROMOTOCO:  { sector: "Automobile",                   domain: "heromotocorp.com",      name: "Hero MotoCorp",        symbol: "HEROMOTOCO" },
  EICHERMOT:   { sector: "Automobile",                   domain: "eichermotors.com",      name: "Eicher Motors",        symbol: "EICHERMOT" },
  SHREECEM:    { sector: "Construction Materials",       domain: "shreecement.com",       name: "Shree Cement",         symbol: "SHREECEM" },
  UPL:         { sector: "Agriculture & Chemicals",      domain: "upl-ltd.com",           name: "UPL Limited",          symbol: "UPL" },
  BRITANNIA:   { sector: "Consumer Goods (FMCG)",        domain: "britannia.co.in",       name: "Britannia",            symbol: "BRITANNIA" },
  LEMONTREE:   { sector: "Hospitality",                  domain: "lemontreehotels.com",   name: "Lemon Tree Hotels",    symbol: "LEMONTREE" },
  BHARATFORG:  { sector: "Manufacturing",                domain: "bharatforge.com",       name: "Bharat Forge",         symbol: "BHARATFORG" },
};

// ISIN → company data (reliable fallback when tradingSymbol is wrong)
const isinMap: Record<string, EnrichEntry> = {
  INE002A01018: { sector: "Energy & Petrochemicals",     domain: "relianceindustries.com", name: "Reliance Industries", symbol: "RELIANCE" },
  INE467B01029: { sector: "Information Technology",      domain: "tcs.com",                name: "TCS",                 symbol: "TCS" },
  INE009A01021: { sector: "Information Technology",      domain: "infosys.com",            name: "Infosys",             symbol: "INFY" },
  INE040A01034: { sector: "Banking & Finance",           domain: "hdfcbank.com",           name: "HDFC Bank",           symbol: "HDFCBANK" },
  INE090A01021: { sector: "Banking & Finance",           domain: "icicibank.com",          name: "ICICI Bank",          symbol: "ICICIBANK" },
  INE062A01020: { sector: "Banking & Finance",           domain: "sbi.co.in",             name: "State Bank of India",  symbol: "SBIN" },
  INE397D01024: { sector: "Telecommunication",           domain: "airtel.in",             name: "Bharti Airtel",        symbol: "BHARTIARTL" },
  INE154A01025: { sector: "Consumer Goods (FMCG)",       domain: "itcportal.com",         name: "ITC Limited",          symbol: "ITC" },
  INE075A01022: { sector: "Information Technology",      domain: "wipro.com",             name: "Wipro",               symbol: "WIPRO" },
  INE860A01027: { sector: "Information Technology",      domain: "hcltech.com",           name: "HCL Technologies",    symbol: "HCLTECH" },
  INE585B01010: { sector: "Automobile",                  domain: "marutisuzuki.com",      name: "Maruti Suzuki",        symbol: "MARUTI" },
  INE028A01039: { sector: "Automobile",                  domain: "tatamotors.com",        name: "Tata Motors",          symbol: "TATAMOTORS" },
  INE237A01028: { sector: "Banking & Finance",           domain: "kotak.com",             name: "Kotak Mahindra Bank",  symbol: "KOTAKBANK" },
  INE238A01034: { sector: "Banking & Finance",           domain: "axisbank.com",          name: "Axis Bank",            symbol: "AXISBANK" },
  INE021A01026: { sector: "Chemicals & Paints",          domain: "asianpaints.com",       name: "Asian Paints",         symbol: "ASIANPAINT" },
  INE018A01030: { sector: "Construction & Engineering",  domain: "larsentoubro.com",      name: "Larsen & Toubro",      symbol: "LT" },
  INE030A01027: { sector: "Consumer Goods (FMCG)",       domain: "hul.co.in",             name: "Hindustan Unilever",   symbol: "HINDUNILVR" },
  INE296A01024: { sector: "Financial Services",          domain: "bajajfinserv.in",       name: "Bajaj Finance",        symbol: "BAJFINANCE" },
  INE918I01026: { sector: "Financial Services",          domain: "bajajfinserv.in",       name: "Bajaj Finserv",        symbol: "BAJAJFINSV" },
  INE044A01036: { sector: "Pharmaceuticals",             domain: "sunpharma.com",         name: "Sun Pharmaceutical",   symbol: "SUNPHARMA" },
  INE019A01038: { sector: "Metals & Mining",             domain: "jswsteel.in",           name: "JSW Steel",            symbol: "JSWSTEEL" },
  INE522F01014: { sector: "Energy & Mining",             domain: "coalindia.in",          name: "Coal India",           symbol: "COALINDIA" },
  INE423A01024: { sector: "Conglomerate & Trading",      domain: "adanienterprises.com",  name: "Adani Enterprises",    symbol: "ADANIENT" },
  INE742F01042: { sector: "Infrastructure & Logistics",  domain: "adaniports.com",        name: "Adani Ports",          symbol: "ADANIPORTS" },
  INE733E01010: { sector: "Energy & Utilities",          domain: "ntpc.co.in",            name: "NTPC",                symbol: "NTPC" },
  INE752E01010: { sector: "Energy & Utilities",          domain: "powergridindia.com",    name: "Power Grid",           symbol: "POWERGRID" },
  INE213A01029: { sector: "Energy & Oil",                domain: "ongcindia.com",         name: "ONGC",                symbol: "ONGC" },
  INE669C01036: { sector: "Information Technology",      domain: "techmahindra.com",      name: "Tech Mahindra",        symbol: "TECHM" },
  INE481G01011: { sector: "Construction Materials",      domain: "ultratechcement.com",   name: "UltraTech Cement",     symbol: "ULTRACEMCO" },
  INE280A01028: { sector: "Consumer Goods",              domain: "titancompany.in",       name: "Titan Company",        symbol: "TITAN" },
  INE239N01024: { sector: "Consumer Goods (FMCG)",       domain: "nestle.in",             name: "Nestle India",         symbol: "NESTLEIND" },
  INE089A01023: { sector: "Pharmaceuticals",             domain: "drreddys.com",          name: "Dr Reddy's Labs",      symbol: "DRREDDY" },
  INE059A01026: { sector: "Pharmaceuticals",             domain: "cipla.com",             name: "Cipla",               symbol: "CIPLA" },
  INE361B01024: { sector: "Pharmaceuticals",             domain: "divislaboratories.com", name: "Divi's Labs",          symbol: "DIVISLAB" },
  INE437A01024: { sector: "Healthcare",                  domain: "apollohospitals.com",   name: "Apollo Hospitals",     symbol: "APOLLOHOSP" },
  INE917I01010: { sector: "Automobile",                  domain: "bajajauto.com",         name: "Bajaj Auto",           symbol: "BAJAJ-AUTO" },
  INE192A01025: { sector: "Banking & Finance",           domain: "indusind.com",          name: "IndusInd Bank",        symbol: "INDUSINDBK" },
  INE795G01014: { sector: "Banking & Finance",           domain: "indusind.com",          name: "IndusInd Bank",        symbol: "INDUSINDBK" },
  INE095A01012: { sector: "Banking & Finance",           domain: "indusind.com",          name: "IndusInd Bank",        symbol: "INDUSINDBK" },
  INE465A01025: { sector: "Manufacturing",               domain: "bharatforge.com",       name: "Bharat Forge",         symbol: "BHARATFORG" },
  INE196A01026: { sector: "Manufacturing",               domain: "bharatforge.com",       name: "Bharat Forge",         symbol: "BHARATFORG" },
  INE970X01018: { sector: "Hospitality",                 domain: "lemontreehotels.com",   name: "Lemon Tree Hotels",    symbol: "LEMONTREE" },
  INE0PW501021: { sector: "Hospitality",                 domain: "lemontreehotels.com",   name: "Lemon Tree Hotels",    symbol: "LEMONTREE" },
};

// Resolve enrichment data: try symbolMap first, then isinMap by ISIN from instrumentKey
function resolveEnrichment(tradingSymbol: string, instrumentKey: string): EnrichEntry | null {
  const sym = (tradingSymbol || "").split("-")[0].toUpperCase().replace(/[^A-Z0-9_]/g, "");
  if (symbolMap[sym]) return symbolMap[sym];
  // Try alternate forms
  const altSym = sym.replace(/[^A-Z0-9]/g, "_");
  if (symbolMap[altSym]) return symbolMap[altSym];
  // Try ISIN from instrumentKey
  const isin = instrumentKey.split("|")[1] || "";
  if (isinMap[isin]) return isinMap[isin];
  return null;
}

// Legacy alias for enrichment useEffect
const sectorAndLogoMap = symbolMap;

// Generates color background for custom avatars if no logo domain exists (square corners)
const getAvatarColor = (name: string) => {
  const colors = [
    "bg-red-500/10 text-red-500 border-red-500/20",
    "bg-blue-500/10 text-blue-500 border-blue-500/20",
    "bg-green-500/10 text-green-500 border-green-500/20",
    "bg-yellow-500/10 text-yellow-500 border-yellow-500/20",
    "bg-purple-500/10 text-purple-500 border-purple-500/20",
    "bg-pink-500/10 text-pink-500 border-pink-500/20",
    "bg-indigo-500/10 text-indigo-500 border-indigo-500/20",
    "bg-cyan-500/10 text-cyan-500 border-cyan-500/20",
  ];
  let sum = 0;
  for (let i = 0; i < name.length; i++) {
    sum += name.charCodeAt(i);
  }
  return colors[sum % colors.length];
};

export default function WatchlistPanel({
  clientId,
  onSelectStock,
}: WatchlistPanelProps) {
  const { watchlists, loading, error, fetchWatchlists } = useWatchlistStore();

  // Watchlist selection
  const [activeWatchlistId, setActiveWatchlistId] = useState<string | null>(null);

  // Rename states
  const [editingWatchlistId, setEditingWatchlistId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState("");
  const editInputRef = useRef<HTMLInputElement>(null);

  // New Watchlist state
  const [isCreatingWatchlist, setIsCreatingWatchlist] = useState(false);
  const [newWatchlistName, setNewWatchlistName] = useState("");
  const createInputRef = useRef<HTMLInputElement>(null);
  const isSavingRef = useRef(false);
  const isCreatingRef = useRef(false);

  // Top-aligned search bar states
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [searchLoading, setSearchLoading] = useState(false);
  const searchTimeout = useRef<NodeJS.Timeout | null>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  // Real prices fetched from Upstox API
  const [prices, setPrices] = useState<Record<string, { ltp: number; change: number; changePercent: number; tickDirection?: 'up' | 'down' }>>({});
  const [upstoxAccessToken, setUpstoxAccessToken] = useState<string | null>(null);
  const [activeInstrumentKey, setActiveInstrumentKey] = useState<string | null>(null);

  // Dynamic logos and sectors resolution cache
  const [enrichedInstruments, setEnrichedInstruments] = useState<Record<string, { sector: string; logoUrl: string | null }>>({});

  // Initial token retrieval & load watchlists
  useEffect(() => {
    const savedToken = localStorage.getItem("upstox-access-token");
    if (savedToken) {
      setUpstoxAccessToken(savedToken);
    }

    if (clientId) {
      fetchWatchlists(clientId).then(() => {
        const store = useWatchlistStore.getState();
        if (store.watchlists.length > 0 && !activeWatchlistId) {
          setActiveWatchlistId(store.watchlists[0].watchlistId);
        }
      });
    }
  }, [clientId]);

  // Set active watchlist default
  useEffect(() => {
    if (watchlists.length > 0 && !activeWatchlistId) {
      setActiveWatchlistId(watchlists[0].watchlistId);
    }
  }, [watchlists]);

  // Find the selected watchlist data
  const currentWatchlist = watchlists.find(w => w.watchlistId === activeWatchlistId) || watchlists[0];

  // Dynamic logo & sector enricher logic: resolves domains/sectors on load & saves in cache state
  useEffect(() => {
    if (!currentWatchlist || !currentWatchlist.instruments) return;

    const enrich = async () => {
      const updated = { ...enrichedInstruments };
      let changed = false;

      await Promise.all(
        currentWatchlist.instruments.map(async (inst) => {
          if (updated[inst.instrumentKey]) return;

          // Resolve logo/sector: symbolMap by tradingSymbol → isinMap by ISIN → Clearbit fallback
          const sym = (
            inst.tradingSymbol ||
            inst.name ||
            inst.instrumentKey.split("|")[1] ||
            ""
          ).split("-")[0].toUpperCase();
          let sector = "Equity";
          let logoUrl = null;

          // 0. Check localStorage cache first
          if (typeof window !== "undefined") {
            try {
              const cache = JSON.parse(localStorage.getItem('instrumentMetaCache') || '{}');
              const cachedData = cache[inst.instrumentKey];
              if (cachedData && cachedData.logoUrl) {
                sector = cachedData.sector || "Equity";
                logoUrl = cachedData.logoUrl;
                updated[inst.instrumentKey] = { sector, logoUrl };
                changed = true;
                return;
              }
            } catch (e) {}
          }

          // 1. Use combined resolveEnrichment (symbol + ISIN)
          const matched = resolveEnrichment(inst.tradingSymbol || (inst as any).trading_symbol || "", inst.instrumentKey);
          if (matched) {
            sector = matched.sector;
            logoUrl = `https://t2.gstatic.com/faviconV2?client=SOCIAL&type=FAVICON&fallback_opts=TYPE,SIZE,URL&url=http://www.${matched.domain}&size=64`;
            updated[inst.instrumentKey] = { sector, logoUrl };
            changed = true;
            return;
          }

          // 2. Fetch from Clearbit API search
          try {
            const rawName = inst.name || inst.tradingSymbol || sym;
            const searchName = rawName.replace(/\s+(LIMITED|LTD|EQ|LTD\.|CORP|CORPORATION)\b/gi, "").trim();
            const cbRes = await fetch(`/api/clearbit/companies/suggest?query=${encodeURIComponent(searchName)}`);
            if (cbRes.ok) {
              const cbData = await cbRes.json();
              if (cbData && cbData.length > 0) {
                sector = cbData[0].category?.industryGroup || "Equity";
                logoUrl = cbData[0].logo || `https://t2.gstatic.com/faviconV2?client=SOCIAL&type=FAVICON&fallback_opts=TYPE,SIZE,URL&url=http://www.${cbData[0].domain}&size=64`;
              }
            }
          } catch (e) {
            console.error("Failed to fetch clearbit logo for", sym, e);
          }

          // 3. Last fallback (Google Favicons query)
          if (!logoUrl) {
            // Strip anything that looks like an ISIN to avoid weird fallback domains
            const safeDomain = sym.startsWith("INE") ? "nseindia.com" : `${sym.toLowerCase()}.com`;
            logoUrl = `https://t2.gstatic.com/faviconV2?client=SOCIAL&type=FAVICON&fallback_opts=TYPE,SIZE,URL&url=http://www.${safeDomain}&size=64`;
          }

          updated[inst.instrumentKey] = { sector, logoUrl };
          changed = true;
        })
      );

      if (changed) {
        setEnrichedInstruments(updated);
      }
    };

    enrich();
  }, [currentWatchlist]);

  // Fetch real-time live prices from Upstox API for instruments if connected (No simulation)
  useEffect(() => {
    if (!upstoxAccessToken || watchlists.length === 0 || !activeWatchlistId) return;

    const targetWatchlist = watchlists.find(w => w.watchlistId === activeWatchlistId);
    if (!targetWatchlist || targetWatchlist.instruments.length === 0) return;

    const fetchUpstoxPrices = async () => {
      try {
        const keys = targetWatchlist.instruments
          .map((item) => encodeURIComponent(item.instrumentKey))
          .join(",");
          
        const response = await fetch(
          `/api/upstox/market-quote?instrument_key=${keys}&access_token=${encodeURIComponent(upstoxAccessToken)}`
        );
        const result = await response.json();

        if (result.status === "success" && result.data) {
          setPrices(prev => {
            const updated = { ...prev };
            targetWatchlist.instruments.forEach((item) => {
              const dataKey = item.instrumentKey;
              
              if (result.data[dataKey]) {
                const data = result.data[dataKey];
                const lastPrice = data.last_price || 0;
                const netChange = data.net_change || 0;
                const previousClose = lastPrice - netChange;
                const changePercent = previousClose !== 0 ? (netChange / previousClose) * 100 : 0;
                
                const prevLtp = prev[item.instrumentKey]?.ltp || lastPrice;
                let tickDirection = prev[item.instrumentKey]?.tickDirection;
                if (lastPrice > prevLtp) tickDirection = 'up';
                else if (lastPrice < prevLtp) tickDirection = 'down';

                updated[item.instrumentKey] = {
                  ltp: parseFloat(lastPrice.toFixed(2)),
                  change: parseFloat(netChange.toFixed(2)),
                  changePercent: parseFloat(changePercent.toFixed(2)),
                  tickDirection
                };
              }
            });
            return updated;
          });
        }
      } catch (err) {
        console.warn("Failed to fetch Upstox API prices:", err);
      }
    };

    fetchUpstoxPrices();
    const pricePoll = setInterval(fetchUpstoxPrices, 5000);
    return () => clearInterval(pricePoll);
  }, [activeWatchlistId, watchlists, upstoxAccessToken]);

  // Clean tick animation states after briefly flashing
  useEffect(() => {
    const timer = setTimeout(() => {
      setPrices(prev => {
        const cleaned = { ...prev };
        Object.keys(cleaned).forEach(k => {
          if (cleaned[k]) {
            cleaned[k] = { ...cleaned[k]!, tickDirection: undefined };
          }
        });
        return cleaned;
      });
    }, 600);
    return () => clearTimeout(timer);
  }, [prices]);

  // Handle autocomplete search typing
  const handleSearchChange = (val: string) => {
    setSearchQuery(val);
    if (searchTimeout.current) clearTimeout(searchTimeout.current);

    if (val.length < 2) {
      setSearchResults([]);
      return;
    }

    setSearchLoading(true);
    searchTimeout.current = setTimeout(async () => {
      try {
        const res = await fetch(
          `/api/upstox/instruments/search?query=${encodeURIComponent(val)}&exchange=NSE&segment=EQ`,
          {
            headers: upstoxAccessToken ? { Authorization: `Bearer ${upstoxAccessToken}` } : {},
          }
        );
        const json = await res.json();
        const items = Array.isArray(json.data) ? json.data : json.data?.data ?? [];

        // Enrich items with custom sector and company domain (Exactly like original DataUploadPanel)
        const enrichedItems = await Promise.all(
          items.slice(0, 8).map(async (inst: any) => {
            const sym = inst.trading_symbol?.split("-")[0]?.toUpperCase() || "";
            const matched = sectorAndLogoMap[sym];
            if (matched) {
              return {
                ...inst,
                sector: matched.sector,
                domain: matched.domain,
              };
            }
            
            // Try fetching Clearbit suggestions
            try {
              const rawName = inst.name || inst.trading_symbol || sym;
              const searchName = rawName.replace(/\s+(LIMITED|LTD|EQ|LTD\.|CORP|CORPORATION)\b/gi, "").trim();
              const cbRes = await fetch(`/api/clearbit/companies/suggest?query=${encodeURIComponent(searchName)}`);
              const cbData = await cbRes.json();
              if (cbData && cbData.length > 0) {
                return {
                  ...inst,
                  sector: cbData[0].category?.industryGroup || "Technology",
                  domain: cbData[0].domain,
                  logo: cbData[0].logo,
                };
              }
            } catch (e) {}

            return {
              ...inst,
              sector: "Equity",
            };
          })
        );

        setSearchResults(enrichedItems);
      } catch (err) {
        setSearchResults([]);
      } finally {
        setSearchLoading(false);
      }
    }, 300);
  };

  // Add stock to active watchlist
  const handleAddStock = async (instrument: any) => {
    let targetWatchlistId = activeWatchlistId;

    if (!targetWatchlistId) {
      try {
        toast.info("No active watchlist group found. Auto-creating group '1'...");
        const created = await createWatchlist(clientId, { name: "1" });
        await fetchWatchlists(clientId);
        targetWatchlistId = created.watchlistId;
        setActiveWatchlistId(created.watchlistId);
      } catch (err) {
        toast.error("Failed to automatically create default watchlist group '1'.");
        return;
      }
    }
    
    try {
      await addInstrument(clientId, targetWatchlistId!, {
        instrumentKey: instrument.instrument_key,
        tradingSymbol: instrument.trading_symbol,
        name: instrument.name || instrument.trading_symbol,
        exchange: instrument.exchange || "NSE",
        instrumentType: instrument.instrument_type || "EQ",
        lotSize: String(instrument.lot_size || "1"),
        upsertIfAbsent: true,
      });

      // Cache enrichment data immediately in localStorage to avoid re-fetching
      if (typeof window !== "undefined") {
        try {
          const finalLogoUrl = instrument.logo || (instrument.domain 
                  ? `https://t2.gstatic.com/faviconV2?client=SOCIAL&type=FAVICON&fallback_opts=TYPE,SIZE,URL&url=http://www.${instrument.domain}&size=64`
                  : null);

          const cache = JSON.parse(localStorage.getItem('instrumentMetaCache') || '{}');
          cache[instrument.instrument_key] = {
            tradingSymbol: instrument.trading_symbol,
            name: instrument.name,
            sector: instrument.sector || "Equity",
            logoUrl: finalLogoUrl,
            domain: instrument.domain
          };
          localStorage.setItem('instrumentMetaCache', JSON.stringify(cache));
        } catch (e) {
          console.error("Failed to cache instrument meta", e);
        }
      }

      await fetchWatchlists(clientId);
      setSearchQuery("");
      setSearchResults([]);
      toast.success(`Added ${instrument.trading_symbol} to watchlist`);
    } catch (e) {
      toast.error("Failed to add instrument.");
    }
  };

  // Remove stock from watchlist
  const handleRemoveStock = async (e: React.MouseEvent, instrumentKey: string) => {
    e.stopPropagation();
    if (!activeWatchlistId) return;

    try {
      await removeInstrument(clientId, activeWatchlistId, instrumentKey);
      await fetchWatchlists(clientId);
      toast.success("Removed instrument from watchlist");
    } catch (e) {
      toast.error("Failed to remove instrument");
    }
  };

  // Select stock row to activate strategies & calibration
  const handleRowClick = (instrument: any) => {
    const key = instrument.instrumentKey;
    setActiveInstrumentKey(key);
    
    // Look up resolved logo & sector from enrichment cache
    const cache = enrichedInstruments[key] || { sector: "Equity", logoUrl: null };
    
    const enrich = resolveEnrichment(instrument.tradingSymbol || "", key);

    // Derive clean display symbol (ticker)
    const sym = enrich?.symbol || 
                instrument.tradingSymbol || 
                instrument.name || 
                key.split("|")[1] || 
                key;

    // Full company name: name if it differs from ticker, else show the full instrumentKey
    const displayName = enrich?.name || 
                        (instrument.name && instrument.name !== instrument.tradingSymbol ? instrument.name : key);

    onSelectStock({
      instrument_key: key,
      trading_symbol: sym,
      name: displayName,
      logoUrl: cache.logoUrl,
      sector: cache.sector,
      exchange: instrument.exchange || (key.split("|")[0] || "NSE").split("_")[0].toUpperCase(),
      instrument_type: instrument.instrumentType || instrument.instrument_type || "EQUITY",
    });
  };

  // Create new watchlist group
  const handleCreateGroup = async () => {
    if (isCreatingRef.current) return;
    if (!newWatchlistName.trim()) return;
    try {
      isCreatingRef.current = true;
      const created = await createWatchlist(clientId, { name: newWatchlistName.trim() });
      setNewWatchlistName("");
      setIsCreatingWatchlist(false);
      await fetchWatchlists(clientId);
      setActiveWatchlistId(created.watchlistId);
      toast.success(`Created group "${created.name}"`);
    } catch (e) {
      toast.error("Failed to create watchlist group.");
    } finally {
      isCreatingRef.current = false;
    }
  };

  // Delete current active watchlist group
  const handleDeleteGroup = async (watchlistId: string) => {
    if (watchlists.length <= 1) {
      toast.error("You must have at least one watchlist group.");
      return;
    }
    if (!confirm("Are you sure you want to delete this watchlist group?")) return;

    try {
      await deleteWatchlist(clientId, watchlistId);
      toast.success("Deleted watchlist group");
      const nextGroup = watchlists.find(w => w.watchlistId !== watchlistId);
      if (nextGroup) {
        setActiveWatchlistId(nextGroup.watchlistId);
      }
      await fetchWatchlists(clientId);
    } catch (e) {
      toast.error("Failed to delete watchlist group.");
    }
  };

  // Start renaming process
  const handleStartRename = (id: string, name: string) => {
    setEditingWatchlistId(id);
    setEditingName(name);
    setTimeout(() => editInputRef.current?.focus(), 50);
  };

  // Save renamed watchlist group
  const handleSaveRename = async (watchlistId: string) => {
    if (isSavingRef.current) return;
    if (!editingName.trim()) {
      setEditingWatchlistId(null);
      return;
    }
    try {
      isSavingRef.current = true;
      await renameWatchlist(clientId, watchlistId, { name: editingName.trim() });
      setEditingWatchlistId(null);
      setEditingName("");
      await fetchWatchlists(clientId);
      toast.success("Watchlist renamed");
    } catch (e) {
      toast.error("Failed to rename watchlist");
    } finally {
      isSavingRef.current = false;
    }
  };

  // Helper to color NSE/BSE in Blue/Red
  const getExchangeBadgeStyle = (exchange: string) => {
    const cleanExchange = exchange?.trim()?.toUpperCase() || "";
    if (cleanExchange === "NSE") {
      return "bg-blue-600/10 text-blue-500 border border-blue-500/20";
    } else if (cleanExchange === "BSE") {
      return "bg-red-600/10 text-red-500 border border-red-500/20";
    }
    return "bg-secondary text-secondary-foreground border border-border/40";
  };

  if (!clientId) {
    return (
      <div className="flex flex-col items-center justify-center h-[450px] border-b border-border bg-card/60 backdrop-blur-md p-6 text-center gap-4 animate-fade-in">
        <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center border border-primary/20">
          <Building2 className="w-6 h-6 text-primary animate-pulse" />
        </div>
        <div className="space-y-2 max-w-[280px]">
          <h3 className="text-xs font-bold text-foreground uppercase tracking-widest">No Active Client Selected</h3>
          <p className="text-[11px] text-muted-foreground leading-relaxed">
            Real-time watchlist groups, instrument tracking, and execution strategies are strictly bound to individual clients.
          </p>
          <div className="bg-secondary/40 p-3 rounded-lg border border-border/60 text-[10px] text-left space-y-1">
            <span className="font-bold block uppercase tracking-wider text-[9px] text-foreground">Action Required:</span>
            <p className="text-muted-foreground leading-relaxed">
              Use the <strong className="text-primary font-semibold">Client Selector</strong> dropdown in the top header to select an existing account, or click <strong className="text-primary font-semibold">"Add New Client"</strong> to instantiate a new account profile first.
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col min-h-0 h-[450px] border-b border-border bg-card/60 backdrop-blur-md relative overflow-hidden transition-all duration-300">
      
      {/* ── Sticky Top Search bar ──────────────────────────────────────── */}
      <div className="p-3 border-b border-border bg-card/90 sticky top-0 z-30 flex flex-col gap-2">
        <div className="relative group">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground group-focus-within:text-primary transition-colors" />
          <input
            ref={searchInputRef}
            type="text"
            placeholder="Search & Add Instrument..."
            value={searchQuery}
            onChange={(e) => handleSearchChange(e.target.value)}
            className="w-full pl-9 pr-8 py-1.5 text-xs bg-background/50 hover:bg-background border border-border focus:border-primary focus:ring-1 focus:ring-primary/20 rounded-md transition-all placeholder:text-muted-foreground outline-none font-sans"
          />
          {searchQuery && (
            <button
              onClick={() => {
                setSearchQuery("");
                setSearchResults([]);
              }}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 p-0.5 rounded-full hover:bg-secondary text-muted-foreground transition-all"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {/* Search Results Dropdown overlay */}
        {searchQuery.length >= 2 && (
          <div className="absolute left-3 right-3 top-11 mt-1 z-50 bg-popover/95 backdrop-blur-md border border-border rounded-lg shadow-xl max-h-64 overflow-y-auto divide-y divide-border/40 scrollbar-thin scrollbar-thumb-muted">
            {searchLoading ? (
              <div className="flex items-center justify-center py-6 text-xs text-muted-foreground gap-2">
                <Loader2 className="w-4 h-4 animate-spin text-primary" />
                Searching Upstox...
              </div>
            ) : searchResults.length === 0 ? (
              <div className="p-4 text-center text-xs text-muted-foreground">
                No matching instruments found.
              </div>
            ) : (
              searchResults.map((instrument, idx) => {
                const sym = instrument.trading_symbol || "";
                // Use Clearbit suggest logo or fallback to Google favicon
                const logoUrl = instrument.logo || (instrument.domain 
                  ? `https://t2.gstatic.com/faviconV2?client=SOCIAL&type=FAVICON&fallback_opts=TYPE,SIZE,URL&url=http://www.${instrument.domain}&size=64`
                  : null);
                  
                return (
                  <div
                    key={idx}
                    className="flex items-center justify-between p-2.5 hover:bg-secondary/70 transition-colors text-left group"
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      {/* Logo - Square shape, no border, rounded-md corners */}
                      {logoUrl ? (
                        <img
                          src={logoUrl}
                          alt={sym}
                          className="w-7 h-7 rounded-md bg-white p-0.5 object-contain border-0"
                          onError={(e) => {
                            (e.target as HTMLElement).style.display = "none";
                          }}
                        />
                      ) : (
                        <div className={`w-7 h-7 rounded-md flex items-center justify-center text-xs font-bold border-0 ${getAvatarColor(sym)}`}>
                          {sym.substring(0, 2)}
                        </div>
                      )}
                      
                      <div className="min-w-0">
                        <div className="flex items-center gap-1.5">
                          <span className="text-xs font-bold text-foreground font-sans truncate">
                            {sym}
                          </span>
                          {/* NSE/BSE Badge in Blue/Red */}
                          <span className={`text-[9px] px-1 rounded uppercase font-bold ${getExchangeBadgeStyle(instrument.exchange)}`}>
                            {instrument.exchange}
                          </span>
                        </div>
                        <p className="text-[10px] text-muted-foreground font-sans truncate">
                          {instrument.name || instrument.trading_symbol} • {instrument.sector || "Equity"}
                        </p>
                      </div>
                    </div>

                    {/* Small plus icon with clean hover & feedback */}
                    <button
                      onClick={() => handleAddStock(instrument)}
                      className="p-1 rounded text-muted-foreground hover:text-primary hover:bg-primary/10 active:scale-95 transition-all duration-150"
                      title="Add Stock to Watchlist"
                    >
                      <Plus className="w-4 h-4" />
                    </button>
                  </div>
                );
              })
            )}
          </div>
        )}
      </div>

      {/* ── Horizontal Watchlists navigation tabs ─────────────────────── */}
      <div className="px-3 py-2 bg-card/40 border-b border-border/80 flex items-center gap-1.5 overflow-x-auto scrollbar-none sticky z-20">
        {watchlists.map((watchlist) => {
          const isActive = watchlist.watchlistId === activeWatchlistId;
          const isEditing = watchlist.watchlistId === editingWatchlistId;

          if (isEditing) {
            return (
              <div key={watchlist.watchlistId} className="flex items-center gap-1.5 bg-background border border-primary/50 px-2 py-0.5 rounded-full animate-fade-in">
                <input
                  ref={editInputRef}
                  type="text"
                  value={editingName}
                  onChange={(e) => setEditingName(e.target.value)}
                  onBlur={() => handleSaveRename(watchlist.watchlistId)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") handleSaveRename(watchlist.watchlistId);
                    if (e.key === "Escape") setEditingWatchlistId(null);
                  }}
                  className="text-xs bg-transparent outline-none w-20 px-0.5 py-0 text-foreground font-medium"
                />
                <button onClick={() => handleSaveRename(watchlist.watchlistId)}>
                  <Check className="w-3.5 h-3.5 text-green-500" />
                </button>
              </div>
            );
          }

          return (
            <div
              key={watchlist.watchlistId}
              onClick={() => setActiveWatchlistId(watchlist.watchlistId)}
              onDoubleClick={() => handleStartRename(watchlist.watchlistId, watchlist.name)}
              className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold select-none cursor-pointer border transition-all duration-300 min-w-max hover:scale-[1.03] group ${
                isActive
                  ? "bg-primary text-primary-foreground border-primary shadow-sm shadow-primary/20 scale-[1.02]"
                  : "bg-secondary/40 text-muted-foreground hover:text-foreground border-border/60 hover:border-border"
              }`}
            >
              <span>{watchlist.name}</span>
              <span className={`text-[9px] px-1 rounded-full ${isActive ? "bg-white/20 text-white" : "bg-secondary text-muted-foreground"}`}>
                {watchlist.instruments?.length || 0}
              </span>
              
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  handleDeleteGroup(watchlist.watchlistId);
                }}
                className={`hidden group-hover:inline-flex items-center justify-center p-0.5 rounded-full hover:bg-black/10 dark:hover:bg-white/10 ml-1.5 ${
                  isActive ? "text-white/80 hover:text-white" : "text-muted-foreground hover:text-foreground"
                }`}
                title="Delete Group"
              >
                <X className="w-2.5 h-2.5" />
              </button>
            </div>
          );
        })}

        {/* Instant Watchlist Group Creation Input Pill */}
        <div className="flex items-center bg-secondary/15 hover:bg-secondary/30 border border-dashed border-border/70 hover:border-border px-2 py-0.5 rounded-full min-w-max transition-all duration-300">
          <input
            type="text"
            placeholder="+"
            value={newWatchlistName}
            onChange={(e) => setNewWatchlistName(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                handleCreateGroup();
                (e.target as HTMLInputElement).blur();
              }
            }}
            className="text-[11px] bg-transparent outline-none w-5 focus:w-20 text-foreground font-semibold placeholder:text-muted-foreground/60 transition-all duration-300 text-center focus:text-left"
          />
        </div>
      </div>

      {/* ── Instruments List ─────────────────────────────────────────── */}
      <div className="flex-1 overflow-y-auto divide-y divide-border/30 scrollbar-thin scrollbar-thumb-muted">
        {loading && watchlists.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 gap-3">
            <Loader2 className="w-7 h-7 text-primary animate-spin" />
            <span className="text-xs text-muted-foreground font-medium">Loading watchlists...</span>
          </div>
        ) : !currentWatchlist || !currentWatchlist.instruments || currentWatchlist.instruments.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 px-4 text-center gap-3">
            <Grid className="w-8 h-8 text-muted-foreground/40 stroke-[1.5]" />
            <div className="space-y-1">
              <p className="text-xs font-semibold text-muted-foreground">Watchlist is empty</p>
              <p className="text-[10px] text-muted-foreground max-w-[200px] leading-relaxed mx-auto">
                Search instruments at the top to add stocks to this group.
              </p>
            </div>
          </div>
        ) : (
          currentWatchlist.instruments.map((instrument) => {
            const key = instrument.instrumentKey;

            let tSymbol = instrument.tradingSymbol || (instrument as any).trading_symbol;
            let tName = instrument.name || (instrument as any).company_name;

            // Recover from localStorage if backend dropped them
            if (typeof window !== "undefined") {
              try {
                const cache = JSON.parse(localStorage.getItem('instrumentMetaCache') || '{}');
                const cachedData = cache[key];
                if (cachedData) {
                  tSymbol = tSymbol || cachedData.tradingSymbol;
                  tName = tName || cachedData.name;
                }
              } catch (e) {}
            }

            const enrich = resolveEnrichment(tSymbol || "", key);

            // Derive clean display symbol (ticker)
            const sym = enrich?.symbol || 
                        tSymbol || 
                        tName || 
                        key.split("|")[1] || 
                        key;

            // Full company name: name if it differs from ticker, else fallback
            const displayName = enrich?.name || 
                                (tName && tName !== tSymbol ? tName : null) || 
                                tName || 
                                sym;

            // Look up resolved logo & sector from enrichment cache
            const cache = enrichedInstruments[key] || { sector: "Equity", logoUrl: null };
            const logoUrl = cache.logoUrl;
            const sector = cache.sector;

            // Live price state
            const priceData = prices[key];
            const isUp = priceData ? priceData.change >= 0 : false;
            const isActive = activeInstrumentKey === key;
            // Extract clean exchange: "NSE_EQ|..." → "NSE", "BSE_EQ|..." → "BSE"
            const exchange = (key.split("|")[0] || "NSE").split("_")[0].toUpperCase();

            return (
              <div
                key={key}
                onClick={() => handleRowClick(instrument)}
                className={`flex items-center justify-between p-3 cursor-pointer hover:bg-secondary/40 select-none border-l-2 border-b border-border/40 transition-all group relative duration-200 ${
                  isActive 
                    ? "border-primary bg-primary/5 hover:bg-primary/10" 
                    : "border-transparent"
                }`}
              >
                <div className="flex items-center gap-3 min-w-0">
                  {/* Logo - Square shape, no border, rounded-md corners */}
                  {logoUrl ? (
                    <img
                      src={logoUrl}
                      alt={sym}
                      className="w-8 h-8 rounded-md bg-white p-0.5 object-contain flex-shrink-0 border-0 group-hover:scale-[1.05] transition-all"
                      onError={(e) => {
                        (e.target as HTMLElement).style.display = "none";
                      }}
                    />
                  ) : (
                    <div className={`w-8 h-8 rounded-md flex items-center justify-center text-xs font-bold border-0 flex-shrink-0 ${getAvatarColor(sym)}`}>
                      {sym.substring(0, 2)}
                    </div>
                  )}

                  {/* Stock Symbol + Sector */}
                  <div className="min-w-0">
                    <div className="flex items-center gap-1.5">
                      <span className="text-xs font-bold text-foreground font-sans truncate">
                        {sym}
                      </span>
                      {/* NSE/BSE Badge in Blue/Red */}
                      <span className={`text-[9px] px-1 rounded font-bold ${getExchangeBadgeStyle(exchange)}`}>
                        {exchange}
                      </span>
                      {(instrument.isCalibrated || (instrument as any).is_calibrated) ? (
                        <div 
                          className="w-3 h-3 rounded-full bg-blue-500 flex items-center justify-center flex-shrink-0 text-white shadow-sm" 
                          title="Calibrated"
                        >
                          <Check className="w-2 h-2 stroke-[4]" />
                        </div>
                      ) : (
                        <div 
                          className="w-1.5 h-1.5 rounded-full bg-orange-500 flex-shrink-0 ml-0.5" 
                          title="Uncalibrated"
                        />
                      )}
                    </div>
                    
                    <p className="text-[10px] text-muted-foreground font-sans truncate">
                      {displayName}
                    </p>
                    
                    <p className="text-[9px] text-[10px] text-primary/80 font-medium font-sans truncate">
                      {sector}
                    </p>
                  </div>
                </div>

                {/* LTP + Change info (Only loaded functional data) */}
                <div className="text-right flex-shrink-0 flex items-center gap-2">
                  <div className="min-w-[70px]">
                    {priceData ? (
                      <>
                        <p className={`text-xs font-bold font-sans tabular-nums transition-all duration-300 ${
                          priceData.tickDirection === 'up' 
                            ? "text-green-400 scale-[1.02] drop-shadow-[0_0_2px_rgba(74,222,128,0.5)]" 
                            : priceData.tickDirection === 'down' 
                            ? "text-red-400 scale-[1.02] drop-shadow-[0_0_2px_rgba(248,113,113,0.5)]" 
                            : isUp ? "text-green-500" : "text-red-500"
                        }`}>
                          {priceData.ltp.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                        </p>
                        <p className={`text-[10px] font-sans font-medium tabular-nums ${isUp ? "text-green-500/80" : "text-red-500/80"}`}>
                          {isUp ? "+" : ""}{priceData.change.toFixed(2)}
                          <span className="text-[9px] ml-0.5 opacity-80">({priceData.changePercent.toFixed(2)}%)</span>
                        </p>
                      </>
                    ) : (
                      <p className="text-xs text-muted-foreground font-semibold font-sans">
                        —
                      </p>
                    )}
                  </div>

                  {/* Simple × remove button — appears on hover */}
                  <button
                    onClick={(e) => handleRemoveStock(e, key)}
                    className="opacity-0 group-hover:opacity-100 ml-1 p-0.5 text-muted-foreground hover:text-destructive transition-all flex-shrink-0"
                    title="Remove from watchlist"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>

              </div>
            );
          })
        )}
      </div>

    </div>
  );
}
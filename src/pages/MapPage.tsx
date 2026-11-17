import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import {
  Search,
  RotateCcw,
  AlertTriangle,
  ChevronDown,
  ChevronUp,
  Copy,
  Check,
  Loader2,
  MapPin,
  SlidersHorizontal,
  X,
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { useApp } from '../context/AppContext';
import { Operator, ServiceRequest } from '../types';
import { BlueTankerIcon, getBlueTankerSvgString } from '../components/map/BlueTankerIcon';
import { MapPopupContent, NeighbourhoodMapGroup } from '../components/map/MapPopupContent';
import {
  ACTIVE_MAP_OPERATOR_STATUSES,
  ACTIVE_MAP_REQUEST_STATUSES,
  ActiveMapRecords,
  isActiveMapOperatorStatus,
  isActiveMapRequestStatus,
  isValidAddisAbabaCoordinate,
  loadActiveMapRecords,
} from '../services/supabaseService';

const ADDIS_ABABA_CENTER: [number, number] = [9.0192, 38.7525];
const ADDIS_ABABA_ZOOM = 12;
const ADDIS_ABABA_BOUNDS: L.LatLngBoundsExpression = [
  [8.70, 38.50],
  [9.25, 39.08],
];

const REQUEST_STATUS_OPTIONS = ACTIVE_MAP_REQUEST_STATUSES;
const OPERATOR_STATUS_OPTIONS = ACTIVE_MAP_OPERATOR_STATUSES;

const LOCATIONS_SQL_MIGRATION = `ALTER TABLE public.locations
ADD COLUMN IF NOT EXISTS latitude double precision,
ADD COLUMN IF NOT EXISTS longitude double precision;`;

const LOCATIONS_SAFE_UPDATE_SQL = `-- Safely populate missing neighbourhood coordinates without overwriting verified coordinates
UPDATE public.locations
SET latitude = 9.0054, longitude = 38.7636
WHERE name_en = 'Bole'
  AND latitude IS NULL
  AND longitude IS NULL;`;

type LayerFilter = 'all' | 'customers' | 'drivers';

function escapeHtml(input: string): string {
  return input
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function createMarkerIcon(group: NeighbourhoodMapGroup): L.DivIcon {
  const reqCount = group.requests.length;
  const opCount = group.operators.length;
  const total = reqCount + opCount;

  // Single customer request -> 💩 emoji marker
  if (total === 1 && reqCount === 1) {
    return L.divIcon({
      className: 'bg-transparent border-0',
      iconSize: [38, 38],
      iconAnchor: [19, 19],
      popupAnchor: [0, -18],
      html: `<div title="${escapeHtml(group.neighbourhoodName)}" style="width:38px;height:38px;border-radius:9999px;background:#FFFFFF;border:2px solid #123C2A;box-shadow:0 3px 10px rgba(18,60,42,0.28);display:flex;align-items:center;justify-content:center;font-size:21px;line-height:1;cursor:pointer;">💩</div>`,
    });
  }

  // Single driver -> Blue septic-emptying tanker illustration marker
  if (total === 1 && opCount === 1) {
    return L.divIcon({
      className: 'bg-transparent border-0',
      iconSize: [44, 34],
      iconAnchor: [22, 17],
      popupAnchor: [0, -17],
      html: `<div title="${escapeHtml(group.neighbourhoodName)}" style="width:44px;height:34px;border-radius:10px;background:#FFFFFF;border:2px solid #1D4ED8;box-shadow:0 3px 10px rgba(29,78,216,0.28);display:flex;align-items:center;justify-content:center;cursor:pointer;">${getBlueTankerSvgString(32, 21)}</div>`,
    });
  }

  // Grouped neighbourhood cluster marker
  const parts: string[] = [];
  if (reqCount > 0) {
    parts.push(
      `<span style="display:inline-flex;align-items:center;gap:3px;font-size:12px;font-weight:700;color:#202A24;"><span style="font-size:15px;line-height:1;">💩</span><span>${reqCount}</span></span>`
    );
  }
  if (opCount > 0) {
    parts.push(
      `<span style="display:inline-flex;align-items:center;gap:3px;font-size:12px;font-weight:700;color:#1D4ED8;">${getBlueTankerSvgString(22, 14)}<span>${opCount}</span></span>`
    );
  }

  const width = reqCount > 0 && opCount > 0 ? 94 : 58;
  return L.divIcon({
    className: 'bg-transparent border-0',
    iconSize: [width, 34],
    iconAnchor: [width / 2, 17],
    popupAnchor: [0, -17],
    html: `<div title="${escapeHtml(group.neighbourhoodName)} (${total})" style="height:34px;padding:0 9px;border-radius:9999px;background:#FFFFFF;border:2px solid #123C2A;box-shadow:0 3px 12px rgba(18,60,42,0.28);display:inline-flex;align-items:center;justify-content:center;gap:7px;white-space:nowrap;cursor:pointer;">${parts.join('<span style="width:1px;height:14px;background:#E6EAE5;"></span>')}</div>`,
  });
}

export function MapPage() {
  const {
    requests: contextRequests,
    operators: contextOperators,
    subcities: contextSubcities,
    neighbourhoods: contextNeighbourhoods,
    loadingData,
    dataError,
    dataRevision,
    refreshData,
  } = useApp();

  const [mapRecords, setMapRecords] = useState<{
    revision: number;
    data: ActiveMapRecords;
  } | null>(null);
  const [loadingMap, setLoadingMap] = useState<boolean>(true);
  const [mapError, setMapError] = useState<string | null>(null);
  const fetchCounterRef = useRef<number>(0);

  const [layerFilter, setLayerFilter] = useState<LayerFilter>('all');
  const [search, setSearch] = useState('');
  const [requestStatusFilter, setRequestStatusFilter] = useState('');
  const [driverStatusFilter, setDriverStatusFilter] = useState('');
  const [mobileFiltersOpen, setMobileFiltersOpen] = useState(false);
  const [missingPanelOpen, setMissingPanelOpen] = useState(false);
  const [copiedSql, setCopiedSql] = useState(false);

  const fetchActiveMapData = useCallback(async (targetRevision: number) => {
    const requestId = ++fetchCounterRef.current;
    setLoadingMap(true);
    setMapError(null);
    try {
      const active = await loadActiveMapRecords();
      if (requestId === fetchCounterRef.current) {
        setMapRecords({ revision: targetRevision, data: active });
      }
    } catch (err) {
      if (requestId === fetchCounterRef.current) {
        setMapError(
          err instanceof Error ? err.message : 'Failed to load active map records.'
        );
      }
    } finally {
      if (requestId === fetchCounterRef.current) {
        setLoadingMap(false);
      }
    }
  }, []);

  useEffect(() => {
    void fetchActiveMapData(dataRevision);
  }, [fetchActiveMapData, dataRevision]);

  const activeMapData =
    mapRecords && mapRecords.revision === dataRevision ? mapRecords.data : null;

  const requests = useMemo(
    () =>
      (activeMapData?.requests ?? contextRequests).filter((r) =>
        isActiveMapRequestStatus(r.status)
      ),
    [activeMapData, contextRequests]
  );

  const operators = useMemo(
    () =>
      (activeMapData?.operators ?? contextOperators).filter((op) =>
        isActiveMapOperatorStatus(op.availability)
      ),
    [activeMapData, contextOperators]
  );

  const subcities = activeMapData?.subcities ?? contextSubcities;
  const neighbourhoods = activeMapData?.neighbourhoods ?? contextNeighbourhoods;

  const mapContainerRef = useRef<HTMLDivElement | null>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const markersLayerRef = useRef<L.LayerGroup | null>(null);
  const hasFittedBoundsRef = useRef(false);

  const [popupState, setPopupState] = useState<{
    key: string;
    group: NeighbourhoodMapGroup;
    container: HTMLDivElement;
  } | null>(null);
  const [mobileSheetState, setMobileSheetState] = useState<{
    key: string;
    group: NeighbourhoodMapGroup;
  } | null>(null);

  const subcityMap = useMemo(
    () => new Map(subcities.map((sc) => [sc.id, sc.nameEn])),
    [subcities]
  );

  const neighbourhoodMap = useMemo(
    () => new Map(neighbourhoods.map((nb) => [nb.id, nb])),
    [neighbourhoods]
  );

  const hasCoordinateColumns = useMemo(
    () => neighbourhoods.some((nb) => nb.hasCoordinateColumns),
    [neighbourhoods]
  );

  const { neighbourhoodsWithCoords, neighbourhoodsMissingCoords } = useMemo(() => {
    const withCoords = neighbourhoods.filter((nb) =>
      isValidAddisAbabaCoordinate(nb.latitude, nb.longitude)
    );
    const missingCoords = neighbourhoods.filter(
      (nb) => !isValidAddisAbabaCoordinate(nb.latitude, nb.longitude)
    );
    return {
      neighbourhoodsWithCoords: withCoords,
      neighbourhoodsMissingCoords: missingCoords,
    };
  }, [neighbourhoods]);

  const missingBySubcity = useMemo(() => {
    const grouped = new Map<string, string[]>();
    neighbourhoodsMissingCoords.forEach((nb) => {
      const scName = subcityMap.get(nb.subcityId) ?? 'Addis Ababa';
      const list = grouped.get(scName) ?? [];
      list.push(nb.nameEn);
      grouped.set(scName, list);
    });
    return Array.from(grouped.entries())
      .map(([subcity, names]) => ({ subcity, names: names.sort() }))
      .sort((a, b) => a.subcity.localeCompare(b.subcity));
  }, [neighbourhoodsMissingCoords, subcityMap]);

  const filteredRequests = useMemo(() => {
    if (layerFilter === 'drivers') return [];
    const q = search.trim().toLowerCase();
    return requests.filter((r) => {
      if (!isActiveMapRequestStatus(r.status)) return false;
      if (requestStatusFilter && r.status !== requestStatusFilter) return false;
      if (q) {
        const matches =
          r.customerName.toLowerCase().includes(q) ||
          r.customerPhone.toLowerCase().includes(q) ||
          r.referenceNumber.toLowerCase().includes(q);
        if (!matches) return false;
      }
      return true;
    });
  }, [requests, layerFilter, requestStatusFilter, search]);

  const filteredOperators = useMemo(() => {
    if (layerFilter === 'customers') return [];
    const q = search.trim().toLowerCase();
    return operators.filter((op) => {
      if (!isActiveMapOperatorStatus(op.availability)) return false;
      if (driverStatusFilter && op.availability !== driverStatusFilter) return false;
      if (q) {
        const matches =
          op.fullName.toLowerCase().includes(q) ||
          op.phone_e164.toLowerCase().includes(q) ||
          Boolean(op.secondary_phone_e164?.toLowerCase().includes(q)) ||
          op.vehiclePlate.toLowerCase().includes(q);
        if (!matches) return false;
      }
      return true;
    });
  }, [operators, layerFilter, driverStatusFilter, search]);

  const {
    mappedGroups,
    pendingCoordinateRequests,
    unmappedOperatorsCount,
  } = useMemo(() => {
    const groupMap = new Map<string, NeighbourhoodMapGroup>();
    const pendingRequests: ServiceRequest[] = [];
    let missingOp = 0;

    const ensureGroup = (
      nbId: string,
      fallback?: {
        nameEn: string;
        subcityName: string;
        latitude: number;
        longitude: number;
      }
    ): NeighbourhoodMapGroup | null => {
      const nb = nbId ? neighbourhoodMap.get(nbId) : undefined;
      if (nb && isValidAddisAbabaCoordinate(nb.latitude, nb.longitude)) {
        const existing = groupMap.get(nb.id);
        if (existing) return existing;
        const created: NeighbourhoodMapGroup = {
          neighbourhoodId: nb.id,
          neighbourhoodName: nb.nameEn,
          neighbourhoodNameAm: nb.nameAm,
          subcityName: subcityMap.get(nb.subcityId) ?? 'Addis Ababa',
          latitude: nb.latitude as number,
          longitude: nb.longitude as number,
          requests: [],
          operators: [],
        };
        groupMap.set(nb.id, created);
        return created;
      }

      if (fallback && isValidAddisAbabaCoordinate(fallback.latitude, fallback.longitude)) {
        const key = nbId || `pos-${fallback.latitude.toFixed(5)}-${fallback.longitude.toFixed(5)}`;
        const existing = groupMap.get(key);
        if (existing) return existing;
        const created: NeighbourhoodMapGroup = {
          neighbourhoodId: key,
          neighbourhoodName: fallback.nameEn || 'Addis Ababa Neighbourhood',
          neighbourhoodNameAm: nb?.nameAm ?? '',
          subcityName: fallback.subcityName || 'Addis Ababa',
          latitude: fallback.latitude,
          longitude: fallback.longitude,
          requests: [],
          operators: [],
        };
        groupMap.set(key, created);
        return created;
      }

      return null;
    };

    filteredRequests.forEach((req: ServiceRequest) => {
      if (
        req.coordinateStatus !== 'resolved' ||
        !isValidAddisAbabaCoordinate(req.locationLatitude, req.locationLongitude)
      ) {
        pendingRequests.push(req);
        return;
      }
      const grp = ensureGroup(req.neighbourhoodId, {
        nameEn: req.neighbourhoodName,
        subcityName: req.subcityName,
        latitude: req.locationLatitude as number,
        longitude: req.locationLongitude as number,
      });
      if (!grp) {
        pendingRequests.push(req);
        return;
      }
      grp.requests.push(req);
    });

    filteredOperators.forEach((op: Operator) => {
      const grp = ensureGroup(op.neighbourhoodId);
      if (!grp) {
        missingOp += 1;
        return;
      }
      grp.operators.push(op);
    });

    return {
      mappedGroups: Array.from(groupMap.values()),
      pendingCoordinateRequests: pendingRequests,
      unmappedOperatorsCount: missingOp,
    };
  }, [filteredRequests, filteredOperators, neighbourhoodMap, subcityMap]);

  // Initialize Leaflet map once
  useEffect(() => {
    if (!mapContainerRef.current || mapInstanceRef.current) return;

    const map = L.map(mapContainerRef.current, {
      center: ADDIS_ABABA_CENTER,
      zoom: ADDIS_ABABA_ZOOM,
      minZoom: 11,
      maxZoom: 18,
      maxBounds: ADDIS_ABABA_BOUNDS,
      maxBoundsViscosity: 0.8,
      zoomControl: true,
    });

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; OpenStreetMap contributors',
      maxZoom: 19,
    }).addTo(map);

    const layerGroup = L.layerGroup().addTo(map);
    mapInstanceRef.current = map;
    markersLayerRef.current = layerGroup;

    map.on('popupclose', () => {
      setPopupState(null);
    });

    map.on('click', () => {
      setMobileSheetState(null);
    });

    return () => {
      map.remove();
      mapInstanceRef.current = null;
      markersLayerRef.current = null;
    };
  }, []);

  // Re-render markers whenever filtered mappedGroups change
  useEffect(() => {
    const map = mapInstanceRef.current;
    const layerGroup = markersLayerRef.current;
    if (!map || !layerGroup) return;

    layerGroup.clearLayers();
    setPopupState(null);
    setMobileSheetState(null);

    if (mappedGroups.length === 0) return;

    const latLngs: L.LatLngExpression[] = [];

    mappedGroups.forEach((group) => {
      const pos: [number, number] = [group.latitude, group.longitude];
      latLngs.push(pos);

      const marker = L.marker(pos, {
        icon: createMarkerIcon(group),
      });

      marker.on('click', () => {
        const selectionKey = `${group.neighbourhoodId}-${Date.now()}`;
        const isMobile = typeof window !== 'undefined' && window.innerWidth < 640;

        if (isMobile) {
          map.closePopup();
          setPopupState(null);
          map.panTo(pos, { animate: true });
          setMobileSheetState({ key: selectionKey, group });
          return;
        }

        setMobileSheetState(null);
        const container = document.createElement('div');
        marker
          .unbindPopup()
          .bindPopup(container, {
            maxWidth: 328,
            minWidth: 230,
            autoPan: true,
            autoPanPadding: [16, 16],
          })
          .openPopup();
        setPopupState({ key: selectionKey, group, container });
      });

      marker.addTo(layerGroup);
    });

    if (!hasFittedBoundsRef.current && latLngs.length > 0) {
      hasFittedBoundsRef.current = true;
      if (latLngs.length === 1) {
        map.setView(latLngs[0], 14);
      } else {
        map.fitBounds(L.latLngBounds(latLngs), { padding: [44, 44], maxZoom: 14 });
      }
    }
  }, [mappedGroups]);

  const handleResetView = () => {
    const map = mapInstanceRef.current;
    if (!map) return;
    map.setView(ADDIS_ABABA_CENTER, ADDIS_ABABA_ZOOM);
  };

  const activeSqlSnippet = hasCoordinateColumns
    ? LOCATIONS_SAFE_UPDATE_SQL
    : LOCATIONS_SQL_MIGRATION;

  const handleCopySql = async () => {
    try {
      await navigator.clipboard.writeText(activeSqlSnippet);
      setCopiedSql(true);
      window.setTimeout(() => setCopiedSql(false), 2000);
    } catch {
      // Ignore clipboard failure in restricted iframes
    }
  };

  const totalPlottedRequests = mappedGroups.reduce((sum, g) => sum + g.requests.length, 0);
  const totalPlottedDrivers = mappedGroups.reduce((sum, g) => sum + g.operators.length, 0);

  const activeMapFilterCount =
    (search.trim() ? 1 : 0) + (requestStatusFilter ? 1 : 0) + (driverStatusFilter ? 1 : 0);

  return (
    <div className="space-y-4 sm:space-y-5 min-w-0">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="min-w-0">
          <h2 className="text-lg font-semibold text-[#202A24]">Addis Ababa Operations Map</h2>
          <p className="text-xs text-[#758078] mt-0.5">
            Active Addis Ababa requests (completed &amp; cancelled hidden automatically) and active drivers. Customer locations are neighbourhood estimates.
          </p>
        </div>

        <button
          type="button"
          onClick={handleResetView}
          className="inline-flex items-center justify-center gap-1.5 min-h-[44px] sm:min-h-[38px] px-3.5 py-2 text-xs font-medium text-[#123C2A] bg-white border border-[#E6EAE5] rounded-lg hover:bg-[#F7F6F0] whitespace-nowrap shrink-0 w-full sm:w-auto"
        >
          <RotateCcw className="w-3.5 h-3.5" />
          Reset Addis View
        </button>
      </div>

      {/* Controls & Legend */}
      <section
        aria-label="Map Controls"
        className="bg-white border border-[#E6EAE5] rounded-xl p-3 sm:p-4 space-y-3"
      >
        <div className="flex flex-col lg:flex-row lg:items-center gap-3">
          {/* Layer Segmented Toggle + Mobile Filters Button */}
          <div className="flex items-center justify-between gap-2 lg:contents">
            <div
              role="group"
              aria-label="Marker type filter"
              className="grid grid-cols-3 sm:inline-flex items-center p-1 bg-[#F7F6F0] border border-[#E6EAE5] rounded-lg flex-1 sm:flex-initial shrink-0"
            >
              <button
                type="button"
                onClick={() => setLayerFilter('all')}
                aria-pressed={layerFilter === 'all'}
                className={`min-h-[40px] sm:min-h-[30px] px-2.5 sm:px-3 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap ${
                  layerFilter === 'all'
                    ? 'bg-[#123C2A] text-white'
                    : 'text-[#758078] hover:text-[#202A24]'
                }`}
              >
                All
              </button>
              <button
                type="button"
                onClick={() => setLayerFilter('customers')}
                aria-pressed={layerFilter === 'customers'}
                className={`min-h-[40px] sm:min-h-[30px] px-2.5 sm:px-3 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap ${
                  layerFilter === 'customers'
                    ? 'bg-[#123C2A] text-white'
                    : 'text-[#758078] hover:text-[#202A24]'
                }`}
              >
                Customers 💩
              </button>
              <button
                type="button"
                onClick={() => setLayerFilter('drivers')}
                aria-pressed={layerFilter === 'drivers'}
                className={`min-h-[40px] sm:min-h-[30px] px-2.5 sm:px-3 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap ${
                  layerFilter === 'drivers'
                    ? 'bg-[#123C2A] text-white'
                    : 'text-[#758078] hover:text-[#202A24]'
                }`}
              >
                Drivers 🚛
              </button>
            </div>

            <button
              type="button"
              onClick={() => setMobileFiltersOpen((v) => !v)}
              aria-expanded={mobileFiltersOpen}
              className={`sm:hidden inline-flex items-center justify-center gap-1.5 min-h-[44px] px-3 text-xs font-medium rounded-lg border transition-colors shrink-0 ${
                mobileFiltersOpen || activeMapFilterCount > 0
                  ? 'bg-[#DCE8DF]/60 text-[#123C2A] border-[#123C2A]/30'
                  : 'bg-[#F7F6F0] text-[#202A24] border-[#E6EAE5]'
              }`}
            >
              <SlidersHorizontal className="w-3.5 h-3.5" />
              {activeMapFilterCount > 0 && (
                <span className="inline-flex items-center justify-center min-w-[18px] h-[18px] px-1 text-[10px] font-mono font-semibold bg-[#123C2A] text-white rounded-full">
                  {activeMapFilterCount}
                </span>
              )}
            </button>
          </div>

          {/* Search & Status Dropdowns */}
          <div className={`${mobileFiltersOpen ? 'grid' : 'hidden'} sm:grid grid-cols-1 sm:grid-cols-3 gap-2.5 sm:gap-3 flex-1 min-w-0`}>
            <div className="relative min-w-0">
              <Search className="w-4 h-4 text-[#758078] absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                type="search"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Customer, driver, phone, or ref..."
                className="w-full min-h-[44px] sm:min-h-[36px] pl-9 pr-3 py-2 text-xs bg-[#F7F6F0] border border-[#E6EAE5] rounded-lg focus:outline-none focus:bg-white focus:border-[#123C2A]"
              />
            </div>

            <select
              value={requestStatusFilter}
              disabled={layerFilter === 'drivers'}
              onChange={(e) => setRequestStatusFilter(e.target.value)}
              aria-label="Filter customers by active request status"
              className="w-full min-h-[44px] sm:min-h-[36px] px-3 py-2 text-xs bg-white border border-[#E6EAE5] rounded-lg focus:outline-none focus:border-[#123C2A] disabled:bg-[#F7F6F0] disabled:text-[#758078]"
            >
              <option value="">All active request statuses</option>
              {REQUEST_STATUS_OPTIONS.map((st) => (
                <option key={st} value={st}>
                  {st}
                </option>
              ))}
            </select>

            <select
              value={driverStatusFilter}
              disabled={layerFilter === 'customers'}
              onChange={(e) => setDriverStatusFilter(e.target.value)}
              aria-label="Filter drivers by active availability status"
              className="w-full min-h-[44px] sm:min-h-[36px] px-3 py-2 text-xs bg-white border border-[#E6EAE5] rounded-lg focus:outline-none focus:border-[#123C2A] disabled:bg-[#F7F6F0] disabled:text-[#758078]"
            >
              <option value="">All active driver availability</option>
              {OPERATOR_STATUS_OPTIONS.map((st) => (
                <option key={st} value={st}>
                  {st}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Legend & Live Counts */}
        <div className="pt-2.5 border-t border-[#E6EAE5] flex flex-wrap items-center justify-between gap-2.5 text-xs">
          <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
            <span className="inline-flex items-center gap-2 text-[#202A24]">
              <span
                className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-white border border-[#123C2A] text-sm leading-none shrink-0"
                aria-hidden="true"
              >
                💩
              </span>
              <span>Customer Request</span>
            </span>

            <span className="inline-flex items-center gap-2 text-[#202A24]">
              <span className="inline-flex items-center justify-center px-1.5 py-0.5 rounded-md bg-white border border-[#1D4ED8] shrink-0">
                <BlueTankerIcon className="w-6 h-4" />
              </span>
              <span>Septic Tanker Driver</span>
            </span>

            <span className="hidden sm:inline text-[11px] text-[#758078]">
              Customer locations are neighbourhood estimates, not exact street addresses or live GPS.
            </span>
          </div>

          <div className="text-[11px] text-[#758078] font-mono tabular-nums">
            {totalPlottedRequests} request(s) · {totalPlottedDrivers} driver(s)
            {pendingCoordinateRequests.length > 0
              ? ` · ${pendingCoordinateRequests.length} coordinates_pending`
              : ''}
          </div>
        </div>
      </section>

      {/* Missing Coordinates / coordinates_pending Notice */}
      {(neighbourhoodsMissingCoords.length > 0 || pendingCoordinateRequests.length > 0) && (
        <section
          aria-label="Neighbourhood Coordinate Status"
          className="bg-[#FEF3C7]/60 border border-[#FDE68A] rounded-xl p-4 space-y-3"
        >
          <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
            <div className="flex items-start gap-2.5 min-w-0">
              <AlertTriangle className="w-4 h-4 text-[#92400E] shrink-0 mt-0.5" />
              <div className="text-xs text-[#78350F] space-y-1 min-w-0">
                <p className="font-semibold text-[#92400E]">
                  {!hasCoordinateColumns
                    ? 'Neighbourhood coordinate columns are missing in Supabase (locations table)'
                    : `${neighbourhoodsWithCoords.length} of ${neighbourhoods.length} Addis Ababa neighbourhoods have coordinates · ${neighbourhoodsMissingCoords.length} awaiting coordinates`}
                </p>
                <p className="leading-relaxed">
                  Records without verified <code className="font-mono bg-white/70 px-1 py-0.5 rounded">latitude</code> /{' '}
                  <code className="font-mono bg-white/70 px-1 py-0.5 rounded">longitude</code> in{' '}
                  <code className="font-mono bg-white/70 px-1 py-0.5 rounded">public.locations</code> are marked{' '}
                  <code className="font-mono bg-white/70 px-1 py-0.5 rounded">coordinates_pending</code> and are not plotted with guessed markers. Currently{' '}
                  <strong className="font-mono">{pendingCoordinateRequests.length}</strong> filtered request(s) (
                  <code className="font-mono">coordinates_pending</code>) and{' '}
                  <strong className="font-mono">{unmappedOperatorsCount}</strong> filtered driver(s) are unmapped.
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={() => setMissingPanelOpen((o) => !o)}
              className="inline-flex items-center justify-center gap-1.5 min-h-[44px] sm:min-h-[34px] px-3 py-1.5 text-xs font-medium text-[#92400E] bg-white border border-[#FDE68A] rounded-lg hover:bg-[#FEF3C7] shrink-0 w-full sm:w-auto"
            >
              <span>
                {missingPanelOpen
                  ? 'Hide Details'
                  : hasCoordinateColumns
                  ? 'Pending Records & Coordinate Guide'
                  : 'SQL & Missing Neighbourhoods'}
              </span>
              {missingPanelOpen ? (
                <ChevronUp className="w-3.5 h-3.5" />
              ) : (
                <ChevronDown className="w-3.5 h-3.5" />
              )}
            </button>
          </div>

          {missingPanelOpen && (
            <div className="pt-3 border-t border-[#FDE68A] space-y-3">
              {pendingCoordinateRequests.length > 0 && (
                <div className="bg-white border border-[#E6EAE5] rounded-lg p-3 space-y-2">
                  <p className="text-xs font-semibold text-[#202A24]">
                    Customer Requests Marked <code className="font-mono">coordinates_pending</code> ({pendingCoordinateRequests.length})
                  </p>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-2 max-h-48 overflow-y-auto pr-1 text-xs">
                    {pendingCoordinateRequests.map((req) => (
                      <Link
                        key={req.id}
                        to={`/requests/${req.id}`}
                        className="flex items-center justify-between gap-2 p-2 rounded-lg bg-[#F7F6F0] border border-[#E6EAE5] hover:border-[#123C2A] transition-colors"
                      >
                        <div className="min-w-0">
                          <p className="font-medium text-[#202A24] truncate">
                            {req.customerName}{' '}
                            <span className="font-mono text-[11px] text-[#758078]">
                              ({req.referenceNumber})
                            </span>
                          </p>
                          <p className="text-[11px] text-[#758078] truncate">
                            {req.subcityName} · {req.neighbourhoodName}
                          </p>
                        </div>
                        <span className="px-2 py-0.5 rounded bg-[#FEF3C7] text-[#92400E] font-mono text-[10px] shrink-0">
                          coordinates_pending
                        </span>
                      </Link>
                    ))}
                  </div>
                </div>
              )}

              <div className="bg-white border border-[#E6EAE5] rounded-lg p-3 space-y-2">
                <div className="flex items-center justify-between gap-2">
                  <p className="text-xs font-semibold text-[#202A24]">
                    {hasCoordinateColumns
                      ? 'Safe Coordinate Update SQL (only fills NULL rows; preserves verified coordinates)'
                      : 'Required Supabase Migration (add nullable coordinates to locations)'}
                  </p>
                  <button
                    type="button"
                    onClick={() => void handleCopySql()}
                    className="inline-flex items-center gap-1 px-2.5 py-1 text-[11px] font-medium text-[#123C2A] bg-[#F7F6F0] border border-[#E6EAE5] rounded-md hover:bg-[#DCE8DF]"
                  >
                    {copiedSql ? (
                      <>
                        <Check className="w-3 h-3" />
                        Copied
                      </>
                    ) : (
                      <>
                        <Copy className="w-3 h-3" />
                        Copy SQL
                      </>
                    )}
                  </button>
                </div>
                <pre className="text-[11px] font-mono bg-[#F7F6F0] border border-[#E6EAE5] rounded-md p-2.5 overflow-x-auto text-[#202A24]">
                  {activeSqlSnippet}
                </pre>
              </div>

              {neighbourhoodsMissingCoords.length > 0 && (
                <div className="bg-white border border-[#E6EAE5] rounded-lg p-3 space-y-2">
                  <p className="text-xs font-semibold text-[#202A24]">
                    Addis Ababa Neighbourhoods Awaiting Coordinates ({neighbourhoodsMissingCoords.length})
                  </p>
                  <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3 max-h-64 overflow-y-auto pr-1 text-xs">
                    {missingBySubcity.map((group) => (
                      <div key={group.subcity} className="p-2.5 bg-[#F7F6F0] rounded-lg border border-[#E6EAE5]">
                        <p className="font-semibold text-[#123C2A] mb-1">
                          {group.subcity} ({group.names.length})
                        </p>
                        <p className="text-[11px] text-[#758078] leading-relaxed">
                          {group.names.join(', ')}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </section>
      )}

      {/* Map Viewport */}
      <section aria-label="Addis Ababa Interactive Map" className="relative z-0 isolate">
        {(loadingData || loadingMap) && !mapRecords && requests.length === 0 && operators.length === 0 ? (
          <div className="h-[420px] sm:h-[580px] bg-white border border-[#E6EAE5] rounded-xl flex items-center justify-center">
            <div className="flex items-center gap-2.5 text-xs text-[#758078]">
              <Loader2 className="w-4 h-4 animate-spin text-[#123C2A]" />
              <span>Loading Addis Ababa map records from Supabase...</span>
            </div>
          </div>
        ) : (mapError || dataError) && !mapRecords ? (
          <div className="h-[380px] bg-white border border-[#FECACA] rounded-xl flex flex-col items-center justify-center p-6 text-center gap-3">
            <p className="text-sm font-semibold text-[#991B1B]">Unable to load map data</p>
            <p className="text-xs text-[#758078] max-w-md">{mapError || dataError}</p>
            <button
              type="button"
              onClick={() => {
                void refreshData();
                void fetchActiveMapData(dataRevision);
              }}
              className="min-h-[44px] sm:min-h-[36px] px-4 py-2 text-xs font-medium text-white bg-[#123C2A] rounded-lg"
            >
              Retry
            </button>
          </div>
        ) : (
          <div className="relative bg-white border border-[#E6EAE5] rounded-xl overflow-hidden shadow-[0_1px_2px_rgba(18,60,42,0.04)]">
            <div
              ref={mapContainerRef}
              className="h-[420px] sm:h-[580px] lg:h-[calc(100dvh-310px)] min-h-[340px] w-full"
            />

            {mappedGroups.length === 0 && (
              <div className="pointer-events-none absolute inset-x-4 bottom-4 z-[450] flex justify-center">
                <div className="pointer-events-auto bg-white/95 backdrop-blur-sm border border-[#E6EAE5] rounded-xl px-4 py-3 shadow-md max-w-md text-center">
                  <div className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#202A24]">
                    <MapPin className="w-3.5 h-3.5 text-[#123C2A]" />
                    <span>
                      {neighbourhoodsWithCoords.length === 0
                        ? 'No neighbourhood coordinates stored in Supabase yet'
                        : 'No mapped requests or drivers match the active filters'}
                    </span>
                  </div>
                  <p className="text-[11px] text-[#758078] mt-1">
                    {neighbourhoodsWithCoords.length === 0
                      ? 'Add latitude and longitude to the locations table to display customer and driver markers accurately.'
                      : 'Adjust the marker type, search query, or status filters above.'}
                  </p>
                </div>
              </div>
            )}
          </div>
        )}
      </section>

      {/* Portal for Desktop Leaflet Popup */}
      {popupState &&
        createPortal(
          <MapPopupContent key={popupState.key} group={popupState.group} variant="popup" />,
          popupState.container
        )}

      {/* Mobile Bottom Sheet for Marker Quick Contact & Direct Navigation */}
      {mobileSheetState && (
        <div
          className="sm:hidden fixed inset-x-0 bottom-0 z-[1000] pointer-events-none px-2 pb-2"
          role="dialog"
          aria-modal="false"
          aria-label={`${mobileSheetState.group.neighbourhoodName} map details`}
        >
          <div className="pointer-events-auto bg-white border border-[#E6EAE5] rounded-2xl shadow-2xl overflow-hidden max-h-[72dvh] flex flex-col">
            <div className="flex items-center justify-between px-4 py-2.5 border-b border-[#E6EAE5] bg-[#F7F6F0]/80 shrink-0">
              <div className="min-w-0">
                <p className="text-xs font-semibold text-[#202A24] truncate">
                  {mobileSheetState.group.neighbourhoodName}
                </p>
                <p className="text-[11px] text-[#758078] truncate">
                  {mobileSheetState.group.subcityName}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setMobileSheetState(null)}
                aria-label="Close marker details"
                className="inline-flex items-center justify-center min-w-[44px] min-h-[44px] -mr-2 rounded-lg text-[#5C665F] hover:text-[#202A24] hover:bg-white transition-colors shrink-0"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="p-4 overflow-y-auto pb-[max(1rem,env(safe-area-inset-bottom))]">
              <MapPopupContent
                key={mobileSheetState.key}
                group={mobileSheetState.group}
                variant="sheet"
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

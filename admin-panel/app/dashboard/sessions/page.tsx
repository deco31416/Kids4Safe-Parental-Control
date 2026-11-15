'use client';

import { Suspense, useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { getDashboardView, DASHBOARD_VIEWS } from '@/lib/dashboard-navigation';
import { buildMobilePeople, getPersonKey, mergeEmergencySessions } from '@/lib/dashboard-data';
import { DashboardHeader } from '@/components/dashboard/DashboardHeader';
import { DashboardOverview } from '@/components/dashboard/DashboardOverview';
import { MobileDirectoryPanel } from '@/components/dashboard/MobileDirectoryPanel';
import { EmergencyHistoryPanel } from '@/components/dashboard/EmergencyHistoryPanel';
import { PushNotificationDialog } from '@/components/dashboard/PushNotificationDialog';
import dynamic from 'next/dynamic';
import { AdminAPI, type ActiveSession, type MobileAppProfile } from '@/lib/admin-api';
import { isAdminSessionExpiredError } from '@/lib/admin-auth';
import { SessionsTable } from '@/components/admin/sessions/SessionsTable';
import { FilterPresets } from '@/components/sessions/FilterPresets';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/hooks/use-toast';
import { Globe, RefreshCw, Send, Smartphone } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ENABLE_QR_LINK_MODULE } from '@/lib/branch-features';

const isMobileAppSession = (session: ActiveSession) =>
  session.source === 'mobile-app' || session.qrId?.startsWith('mobile-direct:');

const PAGE_SIZE = 100;
const OVERVIEW_PAGE_SIZE = 12;

const SessionDetailModal = dynamic(
  () => import('@/components/SessionDetailModal').then((m) => m.SessionDetailModal),
  { ssr: false }
);

const ScreenMonitorModal = dynamic(
  () => import('@/components/ScreenMonitorModal').then((m) => m.ScreenMonitorModal),
  { ssr: false }
);

const AudioMonitorModal = dynamic(
  () => import('@/components/AudioMonitorModal').then((m) => m.AudioMonitorModal),
  { ssr: false }
);

const RecordingMediaModal = dynamic(
  () => import('@/components/recordings/RecordingMediaModal').then((m) => m.RecordingMediaModal),
  { ssr: false }
);

const SessionLiveModal = dynamic(
  () => import('@/components/SessionLiveModal').then((m) => m.SessionLiveModal),
  { ssr: false }
);

const NotificationCenter = dynamic(
  () => import('@/components/NotificationCenter').then((m) => m.NotificationCenter),
  { ssr: false }
);

function SessionsPageContent() {
  const searchParams = useSearchParams();
  const qrIdFilter = searchParams.get('qrId');
  const view = getDashboardView(searchParams.get('view'));
  const viewInfo = DASHBOARD_VIEWS[view];
  const { toast } = useToast();

  const [sessions, setSessions] = useState<ActiveSession[]>([]);
  const [recentFrontendSessions, setRecentFrontendSessions] = useState<ActiveSession[]>([]);
  const [mobileUnits, setMobileUnits] = useState<MobileAppProfile[]>([]);
  const [recentMobileEmergencies, setRecentMobileEmergencies] = useState<ActiveSession[]>([]);
  const [filteredSessions, setFilteredSessions] = useState<ActiveSession[]>([]);
  const [currentFilters, setCurrentFilters] = useState<Record<string, any>>({});
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(false);
  const [mobileUnitsPage, setMobileUnitsPage] = useState(1);
  const [mobileUnitsSearch, setMobileUnitsSearch] = useState('');
  const [recentEmergenciesPage, setRecentEmergenciesPage] = useState(1);
  const [emergencyStatusFilter, setEmergencyStatusFilter] = useState<'all' | 'active' | 'finished'>('all');
  
  // Estados para modales
  const [selectedSession, setSelectedSession] = useState<ActiveSession | null>(null);
  const [detailModalOpen, setDetailModalOpen] = useState(false);
  const [screenModalOpen, setScreenModalOpen] = useState(false);
  const [audioModalOpen, setAudioModalOpen] = useState(false);
  const [recordingsModalOpen, setRecordingsModalOpen] = useState(false);
  const [liveModalOpen, setLiveModalOpen] = useState(false);
  const [pushModalOpen, setPushModalOpen] = useState(false);
  const [selectedSessionsForPush, setSelectedSessionsForPush] = useState<string[]>([]);

  const closePushModal = () => {
    setPushModalOpen(false);
    setSelectedSessionsForPush([]);
  };

  // Auto-refresh cada 5 segundos (pausar cuando el modal live está abierto)
  useEffect(() => {
    loadSessions({ reset: true });
    
    // ⛔ No hacer polling si el modal live está abierto (evita re-renders que matan el socket)
    if (liveModalOpen) {
      console.log('⏸️ [Sessions] Polling pausado - modal live abierto');
      return;
    }
    
    const interval = setInterval(() => loadSessions({ reset: true, silent: true }), 5000);
    return () => clearInterval(interval);
  }, [qrIdFilter, liveModalOpen]);

  const mergeSessions = (current: ActiveSession[], incoming: ActiveSession[]) => {
    const byId = new Map(current.map((session) => [session.sessionId, session]));
    incoming.forEach((session) => byId.set(session.sessionId, session));
    return Array.from(byId.values());
  };

  const loadSessions = async (options?: { reset?: boolean; silent?: boolean }) => {
    try {
      if (!options?.silent) setRefreshing(true);
      const page = await AdminAPI.getActiveSessionsPage({
        limit: PAGE_SIZE,
        cursor: options?.reset ? null : nextCursor,
        qrId: qrIdFilter,
      });
      const recentFrontendPage = ENABLE_QR_LINK_MODULE && options?.reset
        ? await AdminAPI.getRecentFrontendSessionsPage({
            limit: PAGE_SIZE,
            qrId: qrIdFilter,
          }).catch(() => ({ sessions: [], pagination: { limit: PAGE_SIZE, nextCursor: null, hasMore: false } }))
        : null;
      const units = options?.reset
        ? await AdminAPI.getMobileAppProfiles({ limit: 100 }).then((response) => response.items).catch(() => [])
        : mobileUnits;
      const recentEmergencies = options?.reset ? await AdminAPI.getRecentMobileEmergencies(50).catch(() => []) : recentMobileEmergencies;

      setSessions((current) => (options?.reset ? page.sessions : mergeSessions(current, page.sessions)));
      if (options?.reset && recentFrontendPage) setRecentFrontendSessions(recentFrontendPage.sessions);
      if (options?.reset) setMobileUnits(units);
      if (options?.reset) setRecentMobileEmergencies(recentEmergencies);
      setNextCursor(page.pagination.nextCursor);
      setHasMore(page.pagination.hasMore);
    } catch (err) {
      if (isAdminSessionExpiredError(err)) return;
      console.error('[Sessions] Error loading sessions:', err);
      toast({
        title: "Error al cargar sesiones",
        description: err instanceof Error ? err.message : "Error desconocido",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
      setRefreshing(false);
      setLoadingMore(false);
    }
  };

  const handleLoadMore = async () => {
    if (!nextCursor || loadingMore) return;
    setLoadingMore(true);
    await loadSessions({ reset: false });
  };

  const handleKillSession = async (sessionId: string) => {
    try {
      await AdminAPI.killSession(sessionId);
      toast({
        title: 'Sesión eliminada',
        description: 'La sesión y su evidencia asociada fueron eliminadas correctamente',
      });
      setSessions((current) => current.filter((session) => session.sessionId !== sessionId));
      setRecentFrontendSessions((current) => current.filter((session) => session.sessionId !== sessionId));
      setRecentMobileEmergencies((current) => current.filter((session) => session.sessionId !== sessionId));
      setFilteredSessions((current) => current.filter((session) => session.sessionId !== sessionId));
      loadSessions({ reset: true });
    } catch (err) {
      toast({
        title: 'Error',
        description: err instanceof Error ? err.message : 'No se pudo terminar la sesión',
        variant: 'destructive',
      });
    }
  };

  const findSessionById = (sessionId: string) =>
    [
      ...sessions,
      ...(ENABLE_QR_LINK_MODULE ? recentFrontendSessions : []),
      ...recentMobileEmergencies,
    ].find((session) => session.sessionId === sessionId);

  const handleViewSession = (sessionId: string) => {
    const session = findSessionById(sessionId);
    if (session) {
      setSelectedSession(session);
      setDetailModalOpen(true);
    }
  };

  const handleViewScreen = (sessionId: string) => {
    const session = findSessionById(sessionId);
    if (session) {
      setSelectedSession(session);
      setScreenModalOpen(true);
    }
  };

  const handleViewAudio = (sessionId: string) => {
    const session = findSessionById(sessionId);
    if (session) {
      setSelectedSession(session);
      setAudioModalOpen(true);
    }
  };

  const handleViewRecordings = (sessionId: string) => {
    const session = findSessionById(sessionId);
    if (session) {
      setSelectedSession(session);
      setRecordingsModalOpen(true);
    }
  };

  const handleViewLive = (sessionId: string) => {
    const session = findSessionById(sessionId);
    if (session?.status === 'active') {
      setSelectedSession(session);
      setLiveModalOpen(true);
    }
  };

  const handleSendNotification = (sessionId: string) => {
    setSelectedSessionsForPush([sessionId]);
    setPushModalOpen(true);
  };

  const handleDeleteEmergency = async (session: ActiveSession) => {
    await handleKillSession(session.sessionId);
  };

  const handleApplyPreset = (filters: Record<string, any>) => {
    setCurrentFilters(filters);
  };

  const handleClearFilters = () => {
    setCurrentFilters({});
    setFilteredSessions(ENABLE_QR_LINK_MODULE ? mergeSessions(sessions, recentFrontendSessions) : sessions);
  };

  // Aplicar filtros cuando cambian las sesiones o los filtros
  useEffect(() => {
    let filtered = ENABLE_QR_LINK_MODULE ? mergeSessions(sessions, recentFrontendSessions) : sessions;

    // Filtro por rango de tiempo
    if (currentFilters.timeRange) {
      const now = new Date();
      let cutoff: Date;

      switch (currentFilters.timeRange) {
        case '24h':
          cutoff = new Date(now.getTime() - 24 * 60 * 60 * 1000);
          break;
        case '7d':
          cutoff = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
          break;
        case '30d':
          cutoff = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
          break;
        case 'today':
          cutoff = new Date(now.getFullYear(), now.getMonth(), now.getDate());
          break;
        default:
          cutoff = new Date(0);
      }

      filtered = filtered.filter(s => s.createdAt && new Date(s.createdAt) >= cutoff);
    }

    // Filtro por estado
    if (currentFilters.status) {
      filtered = filtered.filter(s => s.status === currentFilters.status);
    }

    // Filtro por nivel de riesgo
    if (currentFilters.riskLevel) {
      filtered = filtered.filter(s => s.riskLevel === currentFilters.riskLevel);
    }

    // Filtro por alertas GPS
    if (currentFilters.hasGpsAlert) {
      filtered = filtered.filter(s => s.hasGpsAlert === true);
    }

    // Filtro por QR ID
    if (currentFilters.qrId) {
      filtered = filtered.filter(s => s.qrId.includes(currentFilters.qrId));
    }

    // Filtro por IP
    if (currentFilters.ip) {
      filtered = filtered.filter(s => s.ip?.includes(currentFilters.ip));
    }

    setFilteredSessions(filtered);
  }, [sessions, recentFrontendSessions, currentFilters]);

  useEffect(() => {
    const normalizedSearch = mobileUnitsSearch.trim().toLowerCase();
    const groups = new Map<string, MobileAppProfile[]>();
    mobileUnits.forEach((unit) => {
      const key = getPersonKey(unit);
      groups.set(key, [...(groups.get(key) || []), unit]);
    });
    const people = Array.from(groups.values());
    const count = normalizedSearch
      ? people.filter((units) =>
          units.some((unit) =>
            [
              unit.fullName,
              unit.phone,
              unit.securityId,
              unit.mobileUnitId,
              unit.deviceLabel,
              unit.emergencyContact?.name,
              unit.emergencyContact?.phone,
            ]
              .filter(Boolean)
              .some((value) => String(value).toLowerCase().includes(normalizedSearch)),
          ),
        ).length
      : people.length;
    const maxPage = Math.max(1, Math.ceil(count / OVERVIEW_PAGE_SIZE));
    setMobileUnitsPage((page) => Math.min(page, maxPage));
  }, [mobileUnits, mobileUnitsSearch]);

  useEffect(() => {
    setMobileUnitsPage(1);
  }, [mobileUnitsSearch]);

  useEffect(() => {
    const filteredCount = recentMobileEmergencies.filter((session) => {
      if (emergencyStatusFilter === 'active') return session.status === 'active';
      if (emergencyStatusFilter === 'finished') return session.status !== 'active';
      return true;
    }).length;
    const maxPage = Math.max(1, Math.ceil(filteredCount / OVERVIEW_PAGE_SIZE));
    setRecentEmergenciesPage((page) => Math.min(page, maxPage));
  }, [recentMobileEmergencies, emergencyStatusFilter]);

  useEffect(() => {
    setRecentEmergenciesPage(1);
  }, [emergencyStatusFilter]);

  if (loading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-16 w-full" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  return (
    <div className="kids-sessions min-w-0 space-y-6 pb-8">
      {/* Header */}
      <DashboardHeader title={viewInfo.title} description={viewInfo.description}>
        <div className="kids-session-actions grid w-full min-w-0 grid-cols-2 items-start gap-2 text-foreground sm:flex sm:w-auto sm:flex-wrap sm:justify-end">
          {/* Notification Center */}
          <NotificationCenter />

          {/* Filter Presets */}
          {view === 'sessions' && <FilterPresets
            currentFilters={currentFilters}
            onApplyPreset={handleApplyPreset}
            onClearFilters={handleClearFilters}
          />}
          
          {/* Enviar notificación global */}
          <Button
            variant="outline"
            size="sm"
            className='kids-pill-control w-full border-border bg-card sm:w-auto'
            aria-label="Notificación global"
            onClick={() => {
              setSelectedSessionsForPush([]);
              setPushModalOpen(true);
            }}
          >
            <Send className="mr-2 h-4 w-4" />
            <span className="sm:hidden">Notificar</span>
            <span className="hidden sm:inline">Notificación global</span>
          </Button>
          
          {/* Manual refresh */}
          <Button
            variant="outline"
            size="sm"
            className='kids-pill-control w-full border-border bg-card sm:w-auto'
            onClick={() => loadSessions({ reset: true })}
            disabled={refreshing}
          >
            <RefreshCw className={`mr-2 h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} />
            Actualizar
          </Button>
        </div>
      </DashboardHeader>

      {(() => {
        const visibleSessions =
          filteredSessions.length > 0 || Object.keys(currentFilters).length > 0 ? filteredSessions : sessions;
        const mobileSessions = visibleSessions.filter(isMobileAppSession);
        const frontendSessions = ENABLE_QR_LINK_MODULE
          ? Object.keys(currentFilters).length > 0
            ? visibleSessions.filter((session) => !isMobileAppSession(session))
            : mergeSessions(
                visibleSessions.filter((session) => !isMobileAppSession(session)),
                recentFrontendSessions,
              )
          : [];
        const mobileSessionByUnitId = new Map<string, ActiveSession>();
        [...sessions.filter(isMobileAppSession), ...recentMobileEmergencies].forEach((session) => {
          const unitId = session.mobile?.unitId || session.qrId?.replace(/^mobile-direct:/, '');
          if (!unitId) return;

          const current = mobileSessionByUnitId.get(unitId);
          if (!current || (session.status === 'active' && current.status !== 'active')) {
            mobileSessionByUnitId.set(unitId, session);
          }
        });
        const mobilePeople = buildMobilePeople(mobileUnits, mobileSessionByUnitId);
        const emergencySessions = mergeEmergencySessions(sessions, recentMobileEmergencies);
        const normalizedMobileUnitsSearch = mobileUnitsSearch.trim().toLowerCase();
        const filteredMobilePeople = normalizedMobileUnitsSearch
          ? mobilePeople.filter((person) =>
              person.units.some((unit) =>
                [
                  unit.fullName,
                  unit.phone,
                  unit.securityId,
                  unit.mobileUnitId,
                  unit.deviceLabel,
                  unit.emergencyContact?.name,
                  unit.emergencyContact?.phone,
                ]
                  .filter(Boolean)
                  .some((value) => String(value).toLowerCase().includes(normalizedMobileUnitsSearch)),
              ),
            )
          : mobilePeople;
        return (
          <div className="space-y-8">
            {view === 'overview' && (
              <DashboardOverview people={mobilePeople} units={mobileUnits} emergencies={emergencySessions} onView={handleViewSession} onLive={handleViewLive} />
            )}
            {(['people', 'devices', 'locations'] as string[]).includes(view) && (
              <MobileDirectoryPanel
                mode={view as 'people' | 'devices' | 'locations'} people={filteredMobilePeople}
                units={mobileUnits} sessions={mobileSessionByUnitId} search={mobileUnitsSearch}
                onSearch={setMobileUnitsSearch} page={mobileUnitsPage} onPage={setMobileUnitsPage}
                pageSize={OVERVIEW_PAGE_SIZE} onViewSession={handleViewSession}
              />
            )}
            {(view === 'history' || view === 'emergencies') && (
              <EmergencyHistoryPanel
                activeOnly={view === 'emergencies'} emergencies={view === 'emergencies' ? emergencySessions.filter(s => s.status === 'active') : recentMobileEmergencies}
                status={emergencyStatusFilter} onStatus={setEmergencyStatusFilter}
                page={recentEmergenciesPage} onPage={setRecentEmergenciesPage} pageSize={OVERVIEW_PAGE_SIZE}
                onView={handleViewSession} onScreen={handleViewScreen} onAudio={handleViewAudio}
                onLive={handleViewLive} onDelete={handleDeleteEmergency}
              />
            )}
            {view === 'sessions' && <>
            <section className="space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="flex min-w-0 items-start gap-2">
                  <Smartphone className="h-5 w-5 text-primary" />
                  <h2 className="text-lg font-semibold text-foreground">App movil directa</h2>
                </div>
                <span className="text-sm text-foreground/55">{mobileSessions.length} activa{mobileSessions.length === 1 ? '' : 's'}</span>
              </div>
              <SessionsTable
                sessions={mobileSessions}
                onKill={handleKillSession}
                onView={handleViewSession}
                onViewScreen={handleViewScreen}
                onViewAudio={handleViewAudio}
                onViewLive={handleViewLive}
                onSendNotification={handleSendNotification}
                emptyMessage="No hay apps móviles transmitiendo"
                emptyDescription="Las sesiones aparecerán aquí cuando un dispositivo inicie un auxilio."
              />
            </section>

            {ENABLE_QR_LINK_MODULE && (
            <section className="space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <Globe className="h-5 w-5 text-blue-700" />
                  <h2 className="text-lg font-semibold text-foreground">Frontend QR / Link</h2>
                </div>
                <span className="text-sm text-foreground/55">{frontendSessions.length} registro{frontendSessions.length === 1 ? '' : 's'}</span>
              </div>
              <SessionsTable
                sessions={frontendSessions}
                onKill={handleKillSession}
                onView={handleViewSession}
                onViewScreen={handleViewScreen}
                onViewAudio={handleViewAudio}
                onViewLive={handleViewLive}
                onSendNotification={handleSendNotification}
                emptyMessage="Todavia no hay sesiones QR o link registradas"
              />
            </section>
            )}

            {hasMore && (
              <div className="flex justify-center">
                <Button
                  variant="outline"
                  className="border-border bg-card text-foreground"
                  onClick={handleLoadMore}
                  disabled={loadingMore || refreshing}
                >
                  <RefreshCw className={`mr-2 h-4 w-4 ${loadingMore ? 'animate-spin' : ''}`} />
                  Cargar más sesiones
                </Button>
              </div>
            )}
            </>}
          </div>
        );
      })()}

      {/* Auto-refresh indicator */}
      {sessions.length > 0 && (
        <p className="text-xs text-muted-foreground text-center">
          Actualización automática cada 5 segundos
        </p>
      )}

      {/* Modales */}
      <SessionDetailModal
        session={selectedSession}
        open={detailModalOpen}
        onViewAudio={(sessionId) => {
          setDetailModalOpen(false);
          handleViewAudio(sessionId);
        }}
        onViewScreen={(sessionId) => {
          setDetailModalOpen(false);
          handleViewScreen(sessionId);
        }}
        onViewLive={(sessionId) => {
          setDetailModalOpen(false);
          handleViewLive(sessionId);
        }}
        onViewRecordings={(sessionId) => {
          setDetailModalOpen(false);
          handleViewRecordings(sessionId);
        }}
        onClose={() => {
          setDetailModalOpen(false);
          setSelectedSession(null);
        }}
      />

      <ScreenMonitorModal
        session={selectedSession}
        open={screenModalOpen}
        onClose={() => {
          setScreenModalOpen(false);
          setSelectedSession(null);
        }}
      />

      <AudioMonitorModal
        session={selectedSession}
        open={audioModalOpen}
        onClose={() => {
          setAudioModalOpen(false);
          setSelectedSession(null);
        }}
      />

      <RecordingMediaModal
        session={selectedSession}
        open={recordingsModalOpen}
        onClose={() => {
          setRecordingsModalOpen(false);
          setSelectedSession(null);
        }}
      />

      <SessionLiveModal
        sessionId={selectedSession?.sessionId || ''}
        open={liveModalOpen}
        onClose={() => {
          setLiveModalOpen(false);
          setSelectedSession(null);
        }}
      />

      <PushNotificationDialog open={pushModalOpen} targetSessions={selectedSessionsForPush} onClose={closePushModal} />
    </div>
  );
}

export default function SessionsPage() {
  return (
    <Suspense fallback={
      <div className="space-y-6">
        <Skeleton className="h-16 w-full" />
        <Skeleton className="h-64 w-full" />
      </div>
    }>
      <SessionsPageContent />
    </Suspense>
  );
}

import { getSupabaseClient } from '../lib/supabase';
import {
  ArcadeCompetition,
  ArcadeCompetitionGame,
  ArcadeCompetitionStatus,
  ArcadeCompetitionType,
  ArcadeDataset,
  ArcadeGame,
  ArcadeGameSession,
  ArcadePlayer,
  ArcadePlayerStatus,
  ArcadePrizeStatus,
  ArcadeScore,
  ArcadeScoreValidationStatus,
  ArcadeWinner,
  ArcadeWinnerApprovalStatus,
} from '../types/arcade';

interface TableSchemaHint {
  columns: Set<string>;
  samples: Array<Record<string, unknown>>;
}

const schemaHints: Record<string, TableSchemaHint> = {};

function recordSchemaHint(table: string, rows: Array<Record<string, unknown>>) {
  const columns = new Set<string>();
  for (const row of rows) {
    for (const key of Object.keys(row)) {
      columns.add(key);
    }
  }
  schemaHints[table] = { columns, samples: rows.slice(0, 5) };
}

function hasColumn(table: string, col: string): boolean {
  const hint = schemaHints[table];
  if (!hint || hint.columns.size === 0) return false;
  return hint.columns.has(col);
}

function detectFirstExistingColumn(table: string, candidates: string[], fallback: string): string {
  const hint = schemaHints[table];
  if (hint && hint.columns.size > 0) {
    for (const c of candidates) {
      if (hint.columns.has(c)) return c;
    }
  }
  return fallback;
}

function isPermissionOrRlsError(message: string): boolean {
  const lower = message.toLowerCase();
  return (
    lower.includes('permission denied') ||
    lower.includes('row-level security') ||
    lower.includes('42501') ||
    lower.includes('not authorized')
  );
}

function formatArcadePermissionError(table: string, rawMessage: string): Error {
  return new Error(
    `Supabase permission denied on public.${table} (${rawMessage}). ` +
      'Run the staff-only GRANT and RLS migration in supabase/migrations/20261117_arcade_staff_rls.sql on your Supabase project so authenticated Zblal staff (verified via public.staff_profiles) can query and manage the arcade tables.'
  );
}

function extractMissingColumnName(message: string): string | null {
  const m1 = message.match(/Could not find the ['"]([a-zA-Z0-9_]+)['"] column/i);
  if (m1?.[1]) return m1[1];
  const m2 = message.match(/column\s+(?:[a-zA-Z0-9_]+\.)?["']?([a-zA-Z0-9_]+)["']?\s+of relation/i);
  if (m2?.[1]) return m2[1];
  const m3 = message.match(/column\s+["']?([a-zA-Z0-9_]+)["']?\s+does not exist/i);
  if (m3?.[1]) return m3[1];
  return null;
}

async function mutateWithColumnAdaptation(params: {
  table: string;
  mode: 'insert' | 'update';
  id?: string;
  payload: Record<string, unknown>;
  alternatives?: Record<string, string[]>;
  optionalColumns?: string[];
  selectExpr?: string;
}): Promise<Array<Record<string, unknown>>> {
  const supabase = getSupabaseClient();
  const working: Record<string, unknown> = { ...params.payload };
  const alternatives: Record<string, string[]> = { ...(params.alternatives ?? {}) };
  const optionalCols = new Set(params.optionalColumns ?? []);
  const triedAlternatives: Record<string, number> = {};

  for (let attempt = 0; attempt < 12; attempt += 1) {
    const query =
      params.mode === 'insert'
        ? supabase.from(params.table).insert(working).select(params.selectExpr ?? 'id')
        : supabase
            .from(params.table)
            .update(working)
            .eq('id', params.id!)
            .select(params.selectExpr ?? 'id');

    const { data, error } = await query;
    if (!error) {
      return (data as unknown as Array<Record<string, unknown>>) ?? [];
    }

    if (isPermissionOrRlsError(error.message)) {
      throw formatArcadePermissionError(params.table, error.message);
    }

    const missingCol = extractMissingColumnName(error.message);
    if (!missingCol || !(missingCol in working)) {
      throw new Error(error.message);
    }

    const val = working[missingCol];
    delete working[missingCol];

    const altList = alternatives[missingCol] ?? [];
    const nextIdx = triedAlternatives[missingCol] ?? 0;
    if (nextIdx < altList.length) {
      const nextKey = altList[nextIdx];
      triedAlternatives[nextKey] = nextIdx + 1;
      alternatives[nextKey] = altList;
      working[nextKey] = val;
      continue;
    }

    if (optionalCols.has(missingCol)) {
      continue;
    }

    throw new Error(error.message);
  }

  throw new Error(`Unable to save changes to ${params.table}: column mapping exhausted.`);
}

async function fetchTableRows(
  table: string
): Promise<{ rows: Array<Record<string, unknown>>; error?: string }> {
  const supabase = getSupabaseClient();
  const pageSize = 1000;
  const allRows: Array<Record<string, unknown>> = [];

  for (let page = 0; page < 20; page += 1) {
    const from = page * pageSize;
    const to = from + pageSize - 1;
    const { data, error } = await supabase.from(table).select('*').range(from, to);

    if (error) {
      return { rows: [], error: error.message };
    }

    const batch = (data as Array<Record<string, unknown>> | null) ?? [];
    allRows.push(...batch);

    if (batch.length < pageSize) {
      break;
    }
  }

  recordSchemaHint(table, allRows);
  return { rows: allRows };
}

function normalizePlayerStatus(row: Record<string, unknown>): {
  status: ArcadePlayerStatus;
  isActive: boolean;
} {
  const rawStatus = String(row.status ?? row.account_status ?? '').trim().toLowerCase();
  if (
    rawStatus === 'suspended' ||
    rawStatus === 'banned' ||
    rawStatus === 'disabled' ||
    rawStatus === 'inactive' ||
    row.is_suspended === true ||
    row.suspended === true ||
    row.is_active === false ||
    row.active === false
  ) {
    return { status: 'Suspended', isActive: false };
  }
  return { status: 'Active', isActive: true };
}

/**
 * Enforces official leaderboard validation strictly:
 * When validation_status is present on arcade_scores, ONLY validation_status = 'valid' counts.
 */
function normalizeScoreValidation(row: Record<string, unknown>): {
  validationStatus: ArcadeScoreValidationStatus;
  isValid: boolean;
  rawValidation: string;
} {
  if ('validation_status' in row) {
    const raw = String(row.validation_status ?? '').trim().toLowerCase();
    if (raw === 'valid') {
      return { validationStatus: 'Valid', isValid: true, rawValidation: raw };
    }
    if (raw === 'flagged' || raw === 'suspicious' || raw === 'review') {
      return { validationStatus: 'Flagged', isValid: false, rawValidation: raw };
    }
    if (
      raw === 'invalid' ||
      raw === 'rejected' ||
      raw === 'disqualified' ||
      raw === 'void'
    ) {
      return { validationStatus: 'Invalid', isValid: false, rawValidation: raw };
    }
    return { validationStatus: 'Pending', isValid: false, rawValidation: raw || 'pending' };
  }

  if (row.is_valid === true || String(row.status ?? '').trim().toLowerCase() === 'valid') {
    return { validationStatus: 'Valid', isValid: true, rawValidation: 'valid' };
  }
  if (row.is_valid === false || String(row.status ?? '').trim().toLowerCase() === 'invalid') {
    return { validationStatus: 'Invalid', isValid: false, rawValidation: 'invalid' };
  }
  return { validationStatus: 'Pending', isValid: false, rawValidation: 'pending' };
}

function normalizeCompetitionType(raw: unknown): ArcadeCompetitionType {
  const str = String(raw ?? 'daily').trim().toLowerCase();
  return str.includes('week') ? 'weekly' : 'daily';
}

function normalizeCompetitionStatus(raw: unknown): ArcadeCompetitionStatus {
  const str = String(raw ?? 'active').trim().toLowerCase();
  if (str === 'draft') return 'Draft';
  if (str === 'upcoming' || str === 'scheduled') return 'Upcoming';
  if (str === 'paused' || str === 'hold') return 'Paused';
  if (str === 'completed' || str === 'ended' || str === 'finished') return 'Completed';
  if (str === 'cancelled' || str === 'canceled') return 'Cancelled';
  return 'Active';
}

function normalizeApprovalStatus(raw: unknown): ArcadeWinnerApprovalStatus {
  const str = String(raw ?? 'pending').trim().toLowerCase();
  if (str === 'approved' || str === 'confirmed') return 'Approved';
  if (str === 'rejected' || str === 'declined' || str === 'disqualified') return 'Rejected';
  return 'Pending';
}

function normalizePrizeStatus(raw: unknown): ArcadePrizeStatus {
  const str = String(raw ?? 'pending').trim().toLowerCase();
  if (str === 'awarded' || str === 'claimed' || str === 'delivered' || str === 'paid') {
    return 'Awarded';
  }
  if (str === 'forfeited' || str === 'cancelled' || str === 'canceled' || str === 'expired') {
    return 'Forfeited';
  }
  return 'Pending';
}

function detectCaseStyle(table: string, field: string, lowerSample: string): 'lower' | 'title' {
  const samples = schemaHints[table]?.samples ?? [];
  for (const row of samples) {
    const val = row[field];
    if (typeof val === 'string' && val.trim()) {
      return val.trim() === val.trim().toLowerCase() ? 'lower' : 'title';
    }
  }
  return lowerSample === lowerSample.toLowerCase() ? 'lower' : 'title';
}

function buildArcadeDataset(params: {
  playerRows: Array<Record<string, unknown>>;
  gameRows: Array<Record<string, unknown>>;
  sessionRows: Array<Record<string, unknown>>;
  scoreRows: Array<Record<string, unknown>>;
  competitionRows: Array<Record<string, unknown>>;
  compGameRows: Array<Record<string, unknown>>;
  winnerRows: Array<Record<string, unknown>>;
}): ArcadeDataset {
  const {
    playerRows,
    gameRows,
    sessionRows,
    scoreRows,
    competitionRows,
    compGameRows,
    winnerRows,
  } = params;

  const players: ArcadePlayer[] = playerRows
    .map((r) => {
      const { status, isActive } = normalizePlayerStatus(r);
      return {
        id: String(r.id),
        nickname: String(
          r.nickname ?? r.player_nickname ?? r.username ?? r.display_name ?? r.name ?? 'Player'
        ).trim(),
        phone_e164: String(
          r.phone_e164 ?? r.phone ?? r.phone_number ?? r.mobile ?? ''
        ).trim(),
        registeredAt: String(
          r.created_at ?? r.registered_at ?? new Date().toISOString()
        ),
        status,
        isActive,
        lastActivityAt: r.last_active_at
          ? String(r.last_active_at)
          : r.last_played_at
          ? String(r.last_played_at)
          : r.updated_at
          ? String(r.updated_at)
          : undefined,
        internalNotes:
          r.internal_notes || r.suspension_reason || r.notes
            ? String(r.internal_notes ?? r.suspension_reason ?? r.notes)
            : undefined,
      };
    })
    .sort((a, b) => new Date(b.registeredAt).getTime() - new Date(a.registeredAt).getTime());

  const games: ArcadeGame[] = gameRows
    .map((r, index) => {
      const rawStatus = String(r.status ?? '').trim().toLowerCase();
      const isComingSoon =
        r.is_coming_soon === true ||
        r.coming_soon === true ||
        rawStatus === 'coming_soon';
      const isActive =
        !isComingSoon &&
        r.is_active !== false &&
        r.active !== false &&
        rawStatus !== 'inactive' &&
        rawStatus !== 'disabled';
      const orderNum = Number(r.display_order ?? r.sort_order ?? r.order_index ?? index + 1);
      const name = String(
        r.name_en ?? r.name ?? r.title ?? r.game_name ?? r.slug ?? `Game ${index + 1}`
      ).trim();

      return {
        id: String(r.id),
        slug: String(r.slug ?? r.code ?? r.game_key ?? name.toLowerCase().replace(/\s+/g, '_')),
        name,
        nameAm: r.name_am || r.title_am ? String(r.name_am ?? r.title_am) : undefined,
        description: String(r.description ?? r.description_en ?? r.summary ?? '').trim(),
        isActive,
        isComingSoon,
        displayOrder: Number.isFinite(orderNum) ? orderNum : index + 1,
        scoreUnit: String(r.score_unit ?? r.unit ?? 'pts').trim() || 'pts',
        createdAt: r.created_at ? String(r.created_at) : undefined,
        updatedAt: r.updated_at ? String(r.updated_at) : undefined,
      };
    })
    .sort((a, b) => a.displayOrder - b.displayOrder || a.name.localeCompare(b.name));

  const sessions: ArcadeGameSession[] = sessionRows
    .map((r) => ({
      id: String(r.id),
      playerId: String(r.player_id ?? ''),
      gameId: String(r.game_id ?? ''),
      competitionId: r.competition_id ? String(r.competition_id) : undefined,
      status: String(r.status ?? 'completed'),
      startedAt: String(r.started_at ?? r.created_at ?? new Date().toISOString()),
      endedAt: r.ended_at
        ? String(r.ended_at)
        : r.completed_at
        ? String(r.completed_at)
        : undefined,
      durationSeconds:
        r.duration_seconds !== undefined && r.duration_seconds !== null
          ? Number(r.duration_seconds)
          : undefined,
    }))
    .sort((a, b) => new Date(b.startedAt).getTime() - new Date(a.startedAt).getTime());

  const scores: ArcadeScore[] = scoreRows
    .map((r) => {
      const { validationStatus, isValid, rawValidation } = normalizeScoreValidation(r);
      const rawScore = Number(r.score ?? r.points ?? r.value ?? 0);
      return {
        id: String(r.id),
        playerId: String(r.player_id ?? ''),
        gameId: String(r.game_id ?? ''),
        sessionId: r.session_id ? String(r.session_id) : undefined,
        competitionId: r.competition_id ? String(r.competition_id) : undefined,
        score: Number.isFinite(rawScore) ? rawScore : 0,
        validationStatus,
        isValid,
        rawValidation,
        submittedAt: String(
          r.submitted_at ?? r.created_at ?? r.played_at ?? r.recorded_at ?? new Date().toISOString()
        ),
      };
    })
    .sort((a, b) => new Date(b.submittedAt).getTime() - new Date(a.submittedAt).getTime());

  const competitions: ArcadeCompetition[] = competitionRows
    .map((r) => ({
      id: String(r.id),
      name: String(r.name ?? r.title ?? r.competition_name ?? 'Untitled Competition').trim(),
      competitionType: normalizeCompetitionType(
        r.competition_type ?? r.type ?? r.period_type ?? 'daily'
      ),
      startsAt: String(r.starts_at ?? r.start_date ?? r.start_at ?? new Date().toISOString()),
      endsAt: String(r.ends_at ?? r.end_date ?? r.end_at ?? new Date().toISOString()),
      status: normalizeCompetitionStatus(r.status),
      prizeDescription: String(
        r.prize_description ?? r.prize_title ?? r.prize ?? r.reward_description ?? ''
      ).trim(),
      createdAt: r.created_at ? String(r.created_at) : undefined,
      updatedAt: r.updated_at ? String(r.updated_at) : undefined,
    }))
    .sort((a, b) => new Date(b.startsAt).getTime() - new Date(a.startsAt).getTime());

  const competitionGames: ArcadeCompetitionGame[] = compGameRows.map((r) => ({
    id: String(r.id),
    competitionId: String(r.competition_id ?? ''),
    gameId: String(r.game_id ?? ''),
    displayOrder:
      r.display_order !== undefined && r.display_order !== null
        ? Number(r.display_order)
        : undefined,
  }));

  const winners: ArcadeWinner[] = winnerRows
    .map((r) => ({
      id: String(r.id),
      competitionId: String(r.competition_id ?? ''),
      playerId: String(r.player_id ?? ''),
      gameId: r.game_id ? String(r.game_id) : undefined,
      rank: Number(r.rank ?? r.placement ?? r.position ?? 1),
      finalScore: Number(r.final_score ?? r.score ?? r.best_score ?? 0),
      overallPoints: Number(
        r.overall_points ?? r.placement_points ?? r.total_points ?? r.points ?? 0
      ),
      approvalStatus: normalizeApprovalStatus(r.approval_status ?? r.status),
      prizeStatus: normalizePrizeStatus(r.prize_status ?? r.reward_status),
      internalNotes:
        r.internal_notes || r.admin_notes || r.notes
          ? String(r.internal_notes ?? r.admin_notes ?? r.notes)
          : undefined,
      approvedBy: r.approved_by ? String(r.approved_by) : undefined,
      approvedAt: r.approved_at ? String(r.approved_at) : undefined,
      awardedBy: r.awarded_by ? String(r.awarded_by) : undefined,
      awardedAt: r.awarded_at ? String(r.awarded_at) : undefined,
      createdAt: String(r.created_at ?? new Date().toISOString()),
    }))
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

  return {
    players,
    games,
    sessions,
    scores,
    competitions,
    competitionGames,
    winners,
  };
}

export async function loadAllArcadeData(): Promise<ArcadeDataset> {
  const supabase = getSupabaseClient();
  const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
  if (sessionError || !sessionData.session) {
    throw new Error('Staff authentication session is required to load Arcade records.');
  }

  const tables = [
    'arcade_players',
    'arcade_games',
    'arcade_game_sessions',
    'arcade_scores',
    'arcade_competitions',
    'arcade_competition_games',
    'arcade_winners',
  ] as const;

  const results = await Promise.all(tables.map((table) => fetchTableRows(table)));

  const failedTables: Array<{ table: string; error: string }> = [];
  for (let i = 0; i < tables.length; i += 1) {
    const err = results[i].error;
    if (err) {
      failedTables.push({ table: tables[i], error: err });
    }
  }

  if (failedTables.length > 0) {
    const hasPermissionError = failedTables.some((f) => isPermissionOrRlsError(f.error));
    const summary = failedTables.map((f) => `${f.table}: ${f.error}`).join(' | ');
    if (hasPermissionError) {
      throw new Error(
        `Arcade database query blocked by table permissions/RLS (${summary}). ` +
          'Apply supabase/migrations/20261117_arcade_staff_rls.sql in your Supabase SQL Editor so authenticated Zblal staff (verified via public.staff_profiles) have SELECT/management permissions matching the other admin tables.'
      );
    }
    throw new Error(`Arcade database query failed (${summary})`);
  }

  return buildArcadeDataset({
    playerRows: results[0].rows,
    gameRows: results[1].rows,
    sessionRows: results[2].rows,
    scoreRows: results[3].rows,
    competitionRows: results[4].rows,
    compGameRows: results[5].rows,
    winnerRows: results[6].rows,
  });
}

export async function updateArcadePlayerStatusRecord(params: {
  playerId: string;
  nextStatus: ArcadePlayerStatus;
  reason?: string;
}): Promise<void> {
  const isSuspended = params.nextStatus === 'Suspended';
  const payload: Record<string, unknown> = {};
  const optionalCols: string[] = ['suspended_at', 'internal_notes', 'suspension_reason', 'notes'];

  const hasStatus = hasColumn('arcade_players', 'status');
  const hasIsActive = hasColumn('arcade_players', 'is_active');
  const hasIsSuspended = hasColumn('arcade_players', 'is_suspended');

  if (hasStatus || (!hasIsActive && !hasIsSuspended)) {
    const caseStyle = detectCaseStyle('arcade_players', 'status', 'active');
    const val = isSuspended
      ? caseStyle === 'title'
        ? 'Suspended'
        : 'suspended'
      : caseStyle === 'title'
      ? 'Active'
      : 'active';
    payload.status = val;
    if (!hasStatus) optionalCols.push('status');
  }

  if (hasIsActive || (!hasStatus && !hasIsSuspended)) {
    payload.is_active = !isSuspended;
    if (!hasIsActive) optionalCols.push('is_active');
  }

  if (hasIsSuspended) {
    payload.is_suspended = isSuspended;
  }

  if (hasColumn('arcade_players', 'suspended_at')) {
    payload.suspended_at = isSuspended ? new Date().toISOString() : null;
  }

  if (params.reason !== undefined) {
    const notesCol = detectFirstExistingColumn(
      'arcade_players',
      ['internal_notes', 'suspension_reason', 'notes'],
      'internal_notes'
    );
    payload[notesCol] = params.reason.trim() || null;
  }

  const rows = await mutateWithColumnAdaptation({
    table: 'arcade_players',
    mode: 'update',
    id: params.playerId,
    payload,
    alternatives: {
      is_active: ['active'],
      internal_notes: ['suspension_reason', 'notes'],
    },
    optionalColumns: optionalCols,
  });

  if (rows.length === 0) {
    throw new Error(
      'Unable to update player status. Verify staff permissions on public.arcade_players.'
    );
  }
}

export interface UpdateArcadeGameInput {
  id: string;
  description: string;
  isActive: boolean;
  isComingSoon: boolean;
  displayOrder: number;
}

export async function updateArcadeGameRecord(input: UpdateArcadeGameInput): Promise<void> {
  if (!Number.isFinite(input.displayOrder) || input.displayOrder < 1) {
    throw new Error('Display order must be a whole number of 1 or higher.');
  }

  const descCol = detectFirstExistingColumn(
    'arcade_games',
    ['description', 'description_en', 'summary'],
    'description'
  );
  const orderCol = detectFirstExistingColumn(
    'arcade_games',
    ['display_order', 'sort_order', 'order_index'],
    'display_order'
  );
  const activeCol = detectFirstExistingColumn('arcade_games', ['is_active', 'active'], 'is_active');
  const comingCol = detectFirstExistingColumn(
    'arcade_games',
    ['is_coming_soon', 'coming_soon'],
    'is_coming_soon'
  );

  const payload: Record<string, unknown> = {
    [descCol]: input.description.trim(),
    [orderCol]: Math.round(input.displayOrder),
    [activeCol]: input.isComingSoon ? false : input.isActive,
    [comingCol]: input.isComingSoon,
  };

  if (hasColumn('arcade_games', 'status')) {
    payload.status = input.isComingSoon
      ? 'coming_soon'
      : input.isActive
      ? 'active'
      : 'inactive';
  }

  const rows = await mutateWithColumnAdaptation({
    table: 'arcade_games',
    mode: 'update',
    id: input.id,
    payload,
    alternatives: {
      description: ['description_en', 'summary'],
      display_order: ['sort_order', 'order_index'],
      is_active: ['active'],
      is_coming_soon: ['coming_soon'],
    },
    optionalColumns: ['status', 'is_coming_soon', 'coming_soon'],
  });

  if (rows.length === 0) {
    throw new Error(
      'Unable to update game record. Verify staff permissions on public.arcade_games.'
    );
  }
}

export interface SaveCompetitionInput {
  id?: string;
  name: string;
  competitionType: ArcadeCompetitionType;
  startsAt: string;
  endsAt: string;
  status: ArcadeCompetitionStatus;
  prizeDescription: string;
  gameIds: string[];
  staffUserId?: string;
}

export async function saveArcadeCompetitionRecord(
  input: SaveCompetitionInput
): Promise<string> {
  const name = input.name.trim();
  if (!name) throw new Error('Competition name is required.');
  if (input.gameIds.length === 0) {
    throw new Error('Select at least one participating game.');
  }
  const startMs = new Date(input.startsAt).getTime();
  const endMs = new Date(input.endsAt).getTime();
  if (Number.isNaN(startMs) || Number.isNaN(endMs) || endMs <= startMs) {
    throw new Error('End date/time must be after start date/time.');
  }

  const supabase = getSupabaseClient();
  const nameCol = detectFirstExistingColumn(
    'arcade_competitions',
    ['name', 'title', 'competition_name'],
    'name'
  );
  const typeCol = detectFirstExistingColumn(
    'arcade_competitions',
    ['competition_type', 'type', 'period_type'],
    'competition_type'
  );
  const startCol = detectFirstExistingColumn(
    'arcade_competitions',
    ['starts_at', 'start_date', 'start_at'],
    'starts_at'
  );
  const endCol = detectFirstExistingColumn(
    'arcade_competitions',
    ['ends_at', 'end_date', 'end_at'],
    'ends_at'
  );
  const prizeCol = detectFirstExistingColumn(
    'arcade_competitions',
    ['prize_description', 'prize_title', 'prize', 'reward_description'],
    'prize_description'
  );

  const payload: Record<string, unknown> = {
    [nameCol]: name,
    [typeCol]: input.competitionType,
    [startCol]: input.startsAt,
    [endCol]: input.endsAt,
    status: input.status.toLowerCase(),
    [prizeCol]: input.prizeDescription.trim(),
  };

  if (!input.id && input.staffUserId && hasColumn('arcade_competitions', 'created_by')) {
    payload.created_by = input.staffUserId;
  }

  const savedRows = await mutateWithColumnAdaptation({
    table: 'arcade_competitions',
    mode: input.id ? 'update' : 'insert',
    id: input.id,
    payload,
    alternatives: {
      name: ['title', 'competition_name'],
      competition_type: ['type', 'period_type'],
      starts_at: ['start_date', 'start_at'],
      ends_at: ['end_date', 'end_at'],
      prize_description: ['prize_title', 'prize', 'reward_description'],
    },
    optionalColumns: ['created_by'],
  });

  if (savedRows.length === 0) {
    throw new Error(
      'Unable to save competition. Verify staff permissions on public.arcade_competitions.'
    );
  }

  const competitionId = String(savedRows[0].id);

  const { error: delErr } = await supabase
    .from('arcade_competition_games')
    .delete()
    .eq('competition_id', competitionId);

  if (delErr) {
    if (isPermissionOrRlsError(delErr.message)) {
      throw formatArcadePermissionError('arcade_competition_games', delErr.message);
    }
    throw new Error(`Competition saved, but failed to sync participating games: ${delErr.message}`);
  }

  const junctionRows = input.gameIds.map((gameId, idx) =>
    hasColumn('arcade_competition_games', 'display_order')
      ? { competition_id: competitionId, game_id: gameId, display_order: idx + 1 }
      : { competition_id: competitionId, game_id: gameId }
  );

  const { error: insErr } = await supabase
    .from('arcade_competition_games')
    .insert(junctionRows);

  if (insErr) {
    if (isPermissionOrRlsError(insErr.message)) {
      throw formatArcadePermissionError('arcade_competition_games', insErr.message);
    }
    throw new Error(`Competition saved, but failed to attach games: ${insErr.message}`);
  }

  return competitionId;
}

export async function updateCompetitionStatusRecord(
  competitionId: string,
  status: ArcadeCompetitionStatus
): Promise<void> {
  const rows = await mutateWithColumnAdaptation({
    table: 'arcade_competitions',
    mode: 'update',
    id: competitionId,
    payload: {
      status: status.toLowerCase(),
    },
  });

  if (rows.length === 0) {
    throw new Error(
      'Unable to update competition status. Check staff permissions on public.arcade_competitions.'
    );
  }
}

export async function reviewWinnerRecord(params: {
  winnerId: string;
  approvalStatus: ArcadeWinnerApprovalStatus;
  internalNotes?: string;
  staffUserId?: string;
}): Promise<void> {
  const approvalCol = detectFirstExistingColumn(
    'arcade_winners',
    ['approval_status', 'status'],
    'approval_status'
  );
  const notesCol = detectFirstExistingColumn(
    'arcade_winners',
    ['internal_notes', 'admin_notes', 'notes'],
    'internal_notes'
  );

  const payload: Record<string, unknown> = {
    [approvalCol]: params.approvalStatus.toLowerCase(),
  };

  if (params.internalNotes !== undefined) {
    payload[notesCol] = params.internalNotes.trim() || null;
  }

  if (params.approvalStatus === 'Approved') {
    if (hasColumn('arcade_winners', 'approved_at')) {
      payload.approved_at = new Date().toISOString();
    }
    if (params.staffUserId && hasColumn('arcade_winners', 'approved_by')) {
      payload.approved_by = params.staffUserId;
    }
  }

  const rows = await mutateWithColumnAdaptation({
    table: 'arcade_winners',
    mode: 'update',
    id: params.winnerId,
    payload,
    alternatives: {
      approval_status: ['status'],
      internal_notes: ['admin_notes', 'notes'],
    },
    optionalColumns: ['internal_notes', 'admin_notes', 'notes', 'approved_at', 'approved_by'],
  });

  if (rows.length === 0) {
    throw new Error(
      'Unable to update winner approval. Check staff permissions on public.arcade_winners.'
    );
  }
}

export async function updateWinnerNotesRecord(
  winnerId: string,
  internalNotes: string
): Promise<void> {
  const notesCol = detectFirstExistingColumn(
    'arcade_winners',
    ['internal_notes', 'admin_notes', 'notes'],
    'internal_notes'
  );
  const rows = await mutateWithColumnAdaptation({
    table: 'arcade_winners',
    mode: 'update',
    id: winnerId,
    payload: {
      [notesCol]: internalNotes.trim() || null,
    },
    alternatives: {
      internal_notes: ['admin_notes', 'notes'],
    },
  });

  if (rows.length === 0) {
    throw new Error('Unable to save winner notes on public.arcade_winners.');
  }
}

export async function markWinnerPrizeAwardedRecord(params: {
  winnerId: string;
  currentApprovalStatus: ArcadeWinnerApprovalStatus;
  internalNotes?: string;
  staffUserId?: string;
}): Promise<void> {
  if (params.currentApprovalStatus !== 'Approved') {
    throw new Error('Approve the winner before marking their prize as awarded.');
  }

  const prizeCol = detectFirstExistingColumn(
    'arcade_winners',
    ['prize_status', 'reward_status'],
    'prize_status'
  );
  const notesCol = detectFirstExistingColumn(
    'arcade_winners',
    ['internal_notes', 'admin_notes', 'notes'],
    'internal_notes'
  );

  const payload: Record<string, unknown> = {
    [prizeCol]: 'awarded',
  };

  if (params.internalNotes !== undefined) {
    payload[notesCol] = params.internalNotes.trim() || null;
  }
  if (hasColumn('arcade_winners', 'awarded_at')) {
    payload.awarded_at = new Date().toISOString();
  }
  if (params.staffUserId && hasColumn('arcade_winners', 'awarded_by')) {
    payload.awarded_by = params.staffUserId;
  }

  const rows = await mutateWithColumnAdaptation({
    table: 'arcade_winners',
    mode: 'update',
    id: params.winnerId,
    payload,
    alternatives: {
      prize_status: ['reward_status'],
      internal_notes: ['admin_notes', 'notes'],
    },
    optionalColumns: ['internal_notes', 'admin_notes', 'notes', 'awarded_at', 'awarded_by'],
  });

  if (rows.length === 0) {
    throw new Error(
      'Unable to mark prize awarded. Check staff permissions on public.arcade_winners.'
    );
  }
}

export async function recordCompetitionWinnerNomination(params: {
  competitionId: string;
  playerId: string;
  gameId?: string;
  rank: number;
  finalScore: number;
  overallPoints: number;
  internalNotes?: string;
}): Promise<void> {
  const approvalCol = detectFirstExistingColumn(
    'arcade_winners',
    ['approval_status', 'status'],
    'approval_status'
  );
  const prizeCol = detectFirstExistingColumn(
    'arcade_winners',
    ['prize_status', 'reward_status'],
    'prize_status'
  );
  const scoreCol = detectFirstExistingColumn(
    'arcade_winners',
    ['final_score', 'score', 'best_score'],
    'final_score'
  );
  const pointsCol = detectFirstExistingColumn(
    'arcade_winners',
    ['overall_points', 'placement_points', 'total_points', 'points'],
    'overall_points'
  );
  const rankCol = detectFirstExistingColumn(
    'arcade_winners',
    ['rank', 'placement', 'position'],
    'rank'
  );

  const payload: Record<string, unknown> = {
    competition_id: params.competitionId,
    player_id: params.playerId,
    game_id: params.gameId ?? null,
    [rankCol]: params.rank,
    [scoreCol]: params.finalScore,
    [pointsCol]: params.overallPoints,
    [approvalCol]: 'pending',
    // Never auto-award prizes on nomination
    [prizeCol]: 'pending',
  };

  if (params.internalNotes?.trim()) {
    const notesCol = detectFirstExistingColumn(
      'arcade_winners',
      ['internal_notes', 'admin_notes', 'notes'],
      'internal_notes'
    );
    payload[notesCol] = params.internalNotes.trim();
  }

  const rows = await mutateWithColumnAdaptation({
    table: 'arcade_winners',
    mode: 'insert',
    payload,
    alternatives: {
      approval_status: ['status'],
      prize_status: ['reward_status'],
      final_score: ['score', 'best_score'],
      overall_points: ['placement_points', 'total_points', 'points'],
      rank: ['placement', 'position'],
      internal_notes: ['admin_notes', 'notes'],
    },
    optionalColumns: ['game_id', 'internal_notes', 'admin_notes', 'notes'],
  });

  if (rows.length === 0) {
    throw new Error('Unable to record winner entry in public.arcade_winners.');
  }
}

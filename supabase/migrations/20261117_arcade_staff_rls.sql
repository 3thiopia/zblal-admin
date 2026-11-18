-- Staff-only RLS policies and minimal authenticated grants for Zblal Admin Webapp Arcade Management.
-- Matches the existing admin authentication model (public.staff_profiles with active super_admin, admin, or staff role).
-- Does NOT enable anon access, does NOT disable RLS, and does NOT alter permissions on non-arcade tables.

BEGIN;

-- 1. Security-definer helper checking if the signed-in user is an active Zblal staff member.
-- Uses to_jsonb(sp) so it works cleanly whether staff_profiles uses `id = auth.uid()` or `user_id = auth.uid()`,
-- and whether optional status columns (`is_active`, `active`, `status`) exist.
CREATE OR REPLACE FUNCTION public.is_zblal_staff()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT auth.uid() IS NOT NULL AND EXISTS (
    SELECT 1
    FROM public.staff_profiles sp
    WHERE (
      (to_jsonb(sp)->>'id') = auth.uid()::text
      OR (to_jsonb(sp)->>'user_id') = auth.uid()::text
    )
    AND lower(trim(coalesce(sp.role::text, ''))) IN ('super_admin', 'admin', 'staff')
    AND coalesce((to_jsonb(sp)->>'is_active')::boolean, true) = true
    AND coalesce((to_jsonb(sp)->>'active')::boolean, true) = true
    AND lower(trim(coalesce(to_jsonb(sp)->>'status', 'active'))) NOT IN ('inactive', 'suspended')
  );
$$;

REVOKE ALL ON FUNCTION public.is_zblal_staff() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.is_zblal_staff() TO authenticated;

-- 2. Keep RLS enabled on all seven arcade tables.
ALTER TABLE public.arcade_players ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.arcade_games ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.arcade_game_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.arcade_scores ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.arcade_competitions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.arcade_competition_games ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.arcade_winners ENABLE ROW LEVEL SECURITY;

-- 3. Keep anon completely revoked on arcade tables (ordinary public users have no direct access).
REVOKE ALL ON TABLE public.arcade_players FROM anon;
REVOKE ALL ON TABLE public.arcade_games FROM anon;
REVOKE ALL ON TABLE public.arcade_game_sessions FROM anon;
REVOKE ALL ON TABLE public.arcade_scores FROM anon;
REVOKE ALL ON TABLE public.arcade_competitions FROM anon;
REVOKE ALL ON TABLE public.arcade_competition_games FROM anon;
REVOKE ALL ON TABLE public.arcade_winners FROM anon;

-- 4. Grant minimal table privileges to `authenticated` (every query remains strictly gated by RLS below).
GRANT SELECT, UPDATE ON TABLE public.arcade_players TO authenticated;
GRANT SELECT, UPDATE ON TABLE public.arcade_games TO authenticated;
GRANT SELECT ON TABLE public.arcade_game_sessions TO authenticated;
GRANT SELECT ON TABLE public.arcade_scores TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.arcade_competitions TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.arcade_competition_games TO authenticated;
GRANT SELECT, INSERT, UPDATE ON TABLE public.arcade_winners TO authenticated;

-- 5. Admin-only RLS policies on each arcade table (idempotent drop + recreate).

-- arcade_players: read + status/notes update only by active Zblal staff (protects phone_e164).
DROP POLICY IF EXISTS "zblal_staff_select_arcade_players" ON public.arcade_players;
CREATE POLICY "zblal_staff_select_arcade_players"
  ON public.arcade_players
  FOR SELECT
  TO authenticated
  USING (public.is_zblal_staff());

DROP POLICY IF EXISTS "zblal_staff_update_arcade_players" ON public.arcade_players;
CREATE POLICY "zblal_staff_update_arcade_players"
  ON public.arcade_players
  FOR UPDATE
  TO authenticated
  USING (public.is_zblal_staff())
  WITH CHECK (public.is_zblal_staff());

-- arcade_games: read + metadata/status update by active Zblal staff (no delete).
DROP POLICY IF EXISTS "zblal_staff_select_arcade_games" ON public.arcade_games;
CREATE POLICY "zblal_staff_select_arcade_games"
  ON public.arcade_games
  FOR SELECT
  TO authenticated
  USING (public.is_zblal_staff());

DROP POLICY IF EXISTS "zblal_staff_update_arcade_games" ON public.arcade_games;
CREATE POLICY "zblal_staff_update_arcade_games"
  ON public.arcade_games
  FOR UPDATE
  TO authenticated
  USING (public.is_zblal_staff())
  WITH CHECK (public.is_zblal_staff());

-- arcade_game_sessions: read-only audit access for active Zblal staff.
DROP POLICY IF EXISTS "zblal_staff_select_arcade_game_sessions" ON public.arcade_game_sessions;
CREATE POLICY "zblal_staff_select_arcade_game_sessions"
  ON public.arcade_game_sessions
  FOR SELECT
  TO authenticated
  USING (public.is_zblal_staff());

-- arcade_scores: read-only access for active Zblal staff (preserves historical score integrity).
DROP POLICY IF EXISTS "zblal_staff_select_arcade_scores" ON public.arcade_scores;
CREATE POLICY "zblal_staff_select_arcade_scores"
  ON public.arcade_scores
  FOR SELECT
  TO authenticated
  USING (public.is_zblal_staff());

-- arcade_competitions: full management by active Zblal staff.
DROP POLICY IF EXISTS "zblal_staff_manage_arcade_competitions" ON public.arcade_competitions;
CREATE POLICY "zblal_staff_manage_arcade_competitions"
  ON public.arcade_competitions
  FOR ALL
  TO authenticated
  USING (public.is_zblal_staff())
  WITH CHECK (public.is_zblal_staff());

-- arcade_competition_games: full management by active Zblal staff.
DROP POLICY IF EXISTS "zblal_staff_manage_arcade_competition_games" ON public.arcade_competition_games;
CREATE POLICY "zblal_staff_manage_arcade_competition_games"
  ON public.arcade_competition_games
  FOR ALL
  TO authenticated
  USING (public.is_zblal_staff())
  WITH CHECK (public.is_zblal_staff());

-- arcade_winners: read, nominate, approve/reject, notes, and prize award fulfillment by active Zblal staff.
DROP POLICY IF EXISTS "zblal_staff_select_arcade_winners" ON public.arcade_winners;
CREATE POLICY "zblal_staff_select_arcade_winners"
  ON public.arcade_winners
  FOR SELECT
  TO authenticated
  USING (public.is_zblal_staff());

DROP POLICY IF EXISTS "zblal_staff_insert_arcade_winners" ON public.arcade_winners;
CREATE POLICY "zblal_staff_insert_arcade_winners"
  ON public.arcade_winners
  FOR INSERT
  TO authenticated
  WITH CHECK (public.is_zblal_staff());

DROP POLICY IF EXISTS "zblal_staff_update_arcade_winners" ON public.arcade_winners;
CREATE POLICY "zblal_staff_update_arcade_winners"
  ON public.arcade_winners
  FOR UPDATE
  TO authenticated
  USING (public.is_zblal_staff())
  WITH CHECK (public.is_zblal_staff());

-- 6. Safely ensure arcade tables emit Supabase Realtime events when publication exists.
DO $$
DECLARE
  tbl text;
BEGIN
  IF EXISTS (SELECT 1 FROM pg_publication WHERE pubname = 'supabase_realtime') THEN
    FOREACH tbl IN ARRAY ARRAY[
      'arcade_players',
      'arcade_games',
      'arcade_game_sessions',
      'arcade_scores',
      'arcade_competitions',
      'arcade_competition_games',
      'arcade_winners'
    ]
    LOOP
      BEGIN
        EXECUTE format('ALTER PUBLICATION supabase_realtime ADD TABLE public.%I', tbl);
      EXCEPTION WHEN duplicate_object THEN
        NULL;
      END;
    END LOOP;
  END IF;
END $$;

COMMIT;

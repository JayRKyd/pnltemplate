-- Create a view that joins team_memberships with stack_users
-- This eliminates the N+1 query pattern in getTeamMembers()

CREATE OR REPLACE VIEW team_members_with_profiles AS
SELECT 
  tm.id as membership_id,
  tm.team_id,
  tm.user_id,
  tm.role,
  tm.permissions,
  tm.invited_by,
  tm.joined_at,
  tm.updated_at,
  tm.is_active,
  su.email,
  su.name,
  su.avatar_url
FROM team_memberships tm
LEFT JOIN stack_users su ON tm.user_id = su.id;

-- Grant access to the view (RLS will still apply through underlying tables)
GRANT SELECT ON team_members_with_profiles TO authenticated;
GRANT SELECT ON team_members_with_profiles TO anon;

-- ============================================================================
-- Migration: Create team_members table for team-level role management
-- ============================================================================
-- This migration creates a TeamMember table to implement team-level roles
-- (OWNER, MEMBER) separate from platform-level roles (USER, ADMIN).
-- 
-- Design Principles:
-- - Least Privilege: Team roles don't grant platform privileges
-- - Auditability: Tracks team membership and role changes
-- - Scalability: Supports users in multiple teams with different roles

-- Create team_member_role enum
CREATE TYPE team_member_role AS ENUM ('OWNER', 'MEMBER');

-- Create team_members table
CREATE TABLE team_members (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    team_id UUID NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
    role team_member_role NOT NULL DEFAULT 'MEMBER',
    
    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    
    -- Constraints
    CONSTRAINT team_members_unique_user_team UNIQUE (user_id, team_id),
    CONSTRAINT team_members_user_not_null CHECK (user_id IS NOT NULL),
    CONSTRAINT team_members_team_not_null CHECK (team_id IS NOT NULL)
);

-- Create indexes for performance
CREATE INDEX idx_team_members_team_id ON team_members(team_id);
CREATE INDEX idx_team_members_user_id ON team_members(user_id);
CREATE INDEX idx_team_members_team_role ON team_members(team_id, role);
CREATE INDEX idx_team_members_user_team ON team_members(user_id, team_id);

-- Add comment explaining the table
COMMENT ON TABLE team_members IS 'Team-level role assignments. Separates team ownership (OWNER) from platform-level admin privileges.';
COMMENT ON COLUMN team_members.role IS 'Team-level role: OWNER can manage team, MEMBER has basic access';


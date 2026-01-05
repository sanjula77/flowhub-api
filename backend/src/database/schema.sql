-- ============================================================================
-- Multi-Tenant SaaS Database Schema
-- FlowHub - PostgreSQL Schema Design
-- ============================================================================

-- Enable UUID extension for generating unique IDs
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================================================
-- ENUMS
-- ============================================================================

-- User roles enum (enforced at database level)
CREATE TYPE user_role AS ENUM ('USER', 'ADMIN');

-- Task status enum (enforced at database level)
CREATE TYPE task_status AS ENUM ('TODO', 'IN_PROGRESS', 'DONE');

-- ============================================================================
-- TABLES
-- ============================================================================

-- ----------------------------------------------------------------------------
-- Teams Table
-- ----------------------------------------------------------------------------
CREATE TABLE teams (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    slug VARCHAR(255) NOT NULL UNIQUE, -- URL-friendly identifier
    description TEXT,
    
    -- Metadata
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    deleted_at TIMESTAMP WITH TIME ZONE NULL, -- Soft delete
    
    -- Constraints
    CONSTRAINT teams_name_not_empty CHECK (LENGTH(TRIM(name)) > 0),
    CONSTRAINT teams_slug_format CHECK (slug ~ '^[a-z0-9-]+$') -- Lowercase, alphanumeric, hyphens only
);

-- ----------------------------------------------------------------------------
-- Users Table
-- ----------------------------------------------------------------------------
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    email VARCHAR(255) NOT NULL UNIQUE, -- Unique constraint at DB level
    password VARCHAR(255) NOT NULL, -- Bcrypt hashed password
    
    -- Team relationship (one-to-many: one team, many users)
    team_id UUID NOT NULL REFERENCES teams(id) ON DELETE RESTRICT,
    
    -- Role (enforced at DB level via enum)
    role user_role NOT NULL DEFAULT 'USER',
    
    -- Profile information
    first_name VARCHAR(100),
    last_name VARCHAR(100),
    
    -- Metadata
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    deleted_at TIMESTAMP WITH TIME ZONE NULL, -- Soft delete
    last_login_at TIMESTAMP WITH TIME ZONE NULL,
    
    -- Constraints
    CONSTRAINT users_email_format CHECK (email ~* '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$'),
    CONSTRAINT users_email_not_empty CHECK (LENGTH(TRIM(email)) > 0),
    CONSTRAINT users_password_not_empty CHECK (LENGTH(password) > 0),
    CONSTRAINT users_not_deleted_team CHECK (
        deleted_at IS NULL OR 
        NOT EXISTS (SELECT 1 FROM teams WHERE teams.id = users.team_id AND teams.deleted_at IS NOT NULL)
    )
);

-- ----------------------------------------------------------------------------
-- Projects Table
-- ----------------------------------------------------------------------------
CREATE TABLE projects (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    description TEXT,
    
    -- Team relationship (many-to-one: many projects, one team)
    team_id UUID NOT NULL REFERENCES teams(id) ON DELETE RESTRICT,
    
    -- Creator relationship (many-to-one: many projects, one creator)
    created_by_id UUID REFERENCES users(id) ON DELETE SET NULL,
    
    -- Metadata
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    deleted_at TIMESTAMP WITH TIME ZONE NULL, -- Soft delete
    
    -- Constraints
    CONSTRAINT projects_name_not_empty CHECK (LENGTH(TRIM(name)) > 0)
);

-- ----------------------------------------------------------------------------
-- Tasks Table
-- ----------------------------------------------------------------------------
CREATE TABLE tasks (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    title VARCHAR(255) NOT NULL,
    description TEXT,
    
    -- Status (enforced at DB level via enum)
    status task_status NOT NULL DEFAULT 'TODO',
    
    -- Project relationship (many-to-one: many tasks, one project)
    project_id UUID NOT NULL REFERENCES projects(id) ON DELETE RESTRICT,
    
    -- Team relationship (many-to-one: many tasks, one team)
    -- Denormalized for performance - can be derived from project, but stored for fast queries
    team_id UUID NOT NULL REFERENCES teams(id) ON DELETE RESTRICT,
    
    -- Assigned user relationship (many-to-one: many tasks, one user, nullable)
    assigned_to_id UUID REFERENCES users(id) ON DELETE SET NULL,
    
    -- Priority (optional, for future use)
    priority INTEGER, -- 1 (highest) to 5 (lowest), or similar scale
    
    -- Due date (optional)
    due_date TIMESTAMP WITH TIME ZONE NULL,
    
    -- Metadata
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    version INTEGER NOT NULL DEFAULT 0, -- Optimistic locking version
    deleted_at TIMESTAMP WITH TIME ZONE NULL, -- Soft delete
    
    -- Constraints
    CONSTRAINT tasks_title_not_empty CHECK (LENGTH(TRIM(title)) > 0),
    CONSTRAINT tasks_project_team_consistency CHECK (
        -- Ensure task's team matches project's team (data integrity)
        EXISTS (
            SELECT 1 FROM projects 
            WHERE projects.id = tasks.project_id 
            AND projects.team_id = tasks.team_id
        )
    )
);

-- ============================================================================
-- INDEXES
-- ============================================================================

-- Teams indexes
CREATE INDEX idx_teams_slug ON teams(slug) WHERE deleted_at IS NULL; -- Partial index for active teams
CREATE INDEX idx_teams_deleted_at ON teams(deleted_at) WHERE deleted_at IS NOT NULL; -- For cleanup queries

-- Users indexes
CREATE INDEX idx_users_email ON users(email) WHERE deleted_at IS NULL; -- Fast email lookup (partial index)
CREATE INDEX idx_users_team_id ON users(team_id) WHERE deleted_at IS NULL; -- Fast team member queries
CREATE INDEX idx_users_role ON users(role) WHERE deleted_at IS NULL; -- Fast role-based queries
CREATE INDEX idx_users_deleted_at ON users(deleted_at) WHERE deleted_at IS NOT NULL; -- For cleanup queries
CREATE INDEX idx_users_team_role ON users(team_id, role) WHERE deleted_at IS NULL; -- Composite index for common queries

-- Projects indexes
CREATE INDEX idx_projects_team_id ON projects(team_id) WHERE deleted_at IS NULL; -- Fast team project queries (partial index)
CREATE INDEX idx_projects_created_by_id ON projects(created_by_id) WHERE deleted_at IS NULL; -- Fast creator queries (partial index)
CREATE INDEX idx_projects_deleted_at ON projects(deleted_at) WHERE deleted_at IS NOT NULL; -- For cleanup queries
CREATE INDEX idx_projects_team_deleted ON projects(team_id, deleted_at) WHERE deleted_at IS NULL; -- Composite index for common team queries

-- Tasks indexes
CREATE INDEX idx_tasks_project_id ON tasks(project_id) WHERE deleted_at IS NULL; -- Fast project task queries (partial index)
CREATE INDEX idx_tasks_team_id ON tasks(team_id) WHERE deleted_at IS NULL; -- Fast team task queries (partial index)
CREATE INDEX idx_tasks_assigned_to_id ON tasks(assigned_to_id) WHERE deleted_at IS NULL; -- Fast assigned user queries (partial index)
CREATE INDEX idx_tasks_status ON tasks(status) WHERE deleted_at IS NULL; -- Fast status queries (partial index)
CREATE INDEX idx_tasks_deleted_at ON tasks(deleted_at) WHERE deleted_at IS NOT NULL; -- For cleanup queries
CREATE INDEX idx_tasks_project_status ON tasks(project_id, status) WHERE deleted_at IS NULL; -- Composite index for project status queries
CREATE INDEX idx_tasks_team_status ON tasks(team_id, status) WHERE deleted_at IS NULL; -- Composite index for team status queries
CREATE INDEX idx_tasks_assigned_status ON tasks(assigned_to_id, status) WHERE deleted_at IS NULL; -- Composite index for user task queries
CREATE INDEX idx_tasks_due_date ON tasks(due_date) WHERE deleted_at IS NULL AND due_date IS NOT NULL; -- Partial index for due date queries

-- ============================================================================
-- FUNCTIONS & TRIGGERS
-- ============================================================================

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger for teams updated_at
CREATE TRIGGER update_teams_updated_at
    BEFORE UPDATE ON teams
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Trigger for users updated_at
CREATE TRIGGER update_users_updated_at
    BEFORE UPDATE ON users
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Trigger for projects updated_at
CREATE TRIGGER update_projects_updated_at
    BEFORE UPDATE ON projects
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Trigger for tasks updated_at
CREATE TRIGGER update_tasks_updated_at
    BEFORE UPDATE ON tasks
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- VIEWS (for easier querying of active records)
-- ============================================================================

-- Active teams view (excludes soft-deleted)
CREATE VIEW active_teams AS
SELECT * FROM teams WHERE deleted_at IS NULL;

-- Active users view (excludes soft-deleted)
CREATE VIEW active_users AS
SELECT 
    u.*,
    t.name AS team_name,
    t.slug AS team_slug
FROM users u
INNER JOIN teams t ON u.team_id = t.id
WHERE u.deleted_at IS NULL AND t.deleted_at IS NULL;

-- Active projects view (excludes soft-deleted)
CREATE VIEW active_projects AS
SELECT 
    p.*,
    t.name AS team_name,
    t.slug AS team_slug,
    u.email AS creator_email,
    u.first_name AS creator_first_name,
    u.last_name AS creator_last_name
FROM projects p
INNER JOIN teams t ON p.team_id = t.id
LEFT JOIN users u ON p.created_by_id = u.id
WHERE p.deleted_at IS NULL AND t.deleted_at IS NULL;

-- Active tasks view (excludes soft-deleted)
CREATE VIEW active_tasks AS
SELECT 
    t.*,
    p.name AS project_name,
    tm.name AS team_name,
    tm.slug AS team_slug,
    u.email AS assigned_user_email,
    u.first_name AS assigned_user_first_name,
    u.last_name AS assigned_user_last_name
FROM tasks t
INNER JOIN projects p ON t.project_id = p.id
INNER JOIN teams tm ON t.team_id = tm.id
LEFT JOIN users u ON t.assigned_to_id = u.id
WHERE t.deleted_at IS NULL 
  AND p.deleted_at IS NULL 
  AND tm.deleted_at IS NULL;

-- ============================================================================
-- FUTURE: Many-to-Many Support (commented out, ready to enable)
-- ============================================================================

-- Uncomment when you need many-to-many user-team relationships:
--
-- CREATE TABLE user_teams (
--     id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
--     user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
--     team_id UUID NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
--     role user_role NOT NULL DEFAULT 'USER', -- Role within this specific team
--     joined_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
--     deleted_at TIMESTAMP WITH TIME ZONE NULL,
--     
--     -- Constraints
--     CONSTRAINT user_teams_unique UNIQUE (user_id, team_id) WHERE deleted_at IS NULL,
--     CONSTRAINT user_teams_not_self_delete CHECK (deleted_at IS NULL OR user_id IS NOT NULL)
-- );
--
-- CREATE INDEX idx_user_teams_user_id ON user_teams(user_id) WHERE deleted_at IS NULL;
-- CREATE INDEX idx_user_teams_team_id ON user_teams(team_id) WHERE deleted_at IS NULL;
-- CREATE INDEX idx_user_teams_role ON user_teams(role) WHERE deleted_at IS NULL;

-- ============================================================================
-- SAMPLE DATA (for testing)
-- ============================================================================

-- Insert sample teams
INSERT INTO teams (name, slug, description) VALUES
    ('Engineering', 'engineering', 'Engineering team'),
    ('Marketing', 'marketing', 'Marketing team'),
    ('Sales', 'sales', 'Sales team')
ON CONFLICT (slug) DO NOTHING;

-- Insert sample users (passwords are bcrypt hashed - replace with actual hashes)
-- Password: 'password123' -> '$2b$10$...' (use your AuthService to generate)
INSERT INTO users (email, password, team_id, role, first_name, last_name) VALUES
    ('admin@engineering.com', '$2b$10$example_hash_replace_with_real', 
     (SELECT id FROM teams WHERE slug = 'engineering'), 'ADMIN', 'Admin', 'User'),
    ('user@engineering.com', '$2b$10$example_hash_replace_with_real',
     (SELECT id FROM teams WHERE slug = 'engineering'), 'USER', 'Regular', 'User'),
    ('admin@marketing.com', '$2b$10$example_hash_replace_with_real',
     (SELECT id FROM teams WHERE slug = 'marketing'), 'ADMIN', 'Marketing', 'Admin')
ON CONFLICT (email) DO NOTHING;


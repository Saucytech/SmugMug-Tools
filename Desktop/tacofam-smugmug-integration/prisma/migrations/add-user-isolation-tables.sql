-- Migration: Add User-Isolated Tables for Multi-Tenant Security
-- Date: 2025-10-13
-- Purpose: Implement proper user isolation for Favorites Manager and Photo Organizer tools

-- ====================
-- FAVORITES SESSIONS TABLE
-- ====================
-- Stores customer photo selection sessions (Favorites Manager tool)
CREATE TABLE IF NOT EXISTS favorites_sessions (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    session_id VARCHAR(100) UNIQUE NOT NULL, -- fav_timestamp_randomid format
    name VARCHAR(255) NOT NULL,
    description TEXT,
    album_keys TEXT[] NOT NULL, -- Array of SmugMug album keys
    theme VARCHAR(20) DEFAULT 'purple' CHECK (theme IN ('purple', 'blue', 'green', 'red', 'orange', 'pink', 'dark')),
    show_buy_button BOOLEAN DEFAULT false,
    logo_url TEXT, -- Base64 encoded logo or uploaded file URL
    customer_favorites JSONB DEFAULT '{}', -- JSON: { "customer@email.com": { "photoKeys": [], "customerName": "", "selectedAt": "" } }
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    expires_at TIMESTAMP, -- Optional expiration date
    last_viewed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Indexes for favorites_sessions
CREATE INDEX IF NOT EXISTS idx_favorites_sessions_user_id ON favorites_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_favorites_sessions_session_id ON favorites_sessions(session_id);
CREATE INDEX IF NOT EXISTS idx_favorites_sessions_created_at ON favorites_sessions(created_at DESC);

-- ====================
-- PHOTO ANALYSIS SESSIONS TABLE
-- ====================
-- Stores AI photo organization analysis sessions (Photo Organizer tool)
CREATE TABLE IF NOT EXISTS photo_analysis_sessions (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    session_id VARCHAR(100) UNIQUE NOT NULL, -- analysis_timestamp_randomid format
    source_gallery_keys TEXT[] NOT NULL, -- SmugMug gallery keys being analyzed
    source_gallery_names TEXT[] NOT NULL, -- Gallery display names
    analysis_type VARCHAR(20) NOT NULL CHECK (analysis_type IN ('sort', 'cull')),
    photos JSONB NOT NULL, -- Array of analyzed photos: [{ imageKey, fileName, thumbnailUrl, suggestedDestination, confidence, status, etc. }]
    total_photos INTEGER NOT NULL,
    pending_count INTEGER DEFAULT 0,
    moved_count INTEGER DEFAULT 0,
    copied_count INTEGER DEFAULT 0,
    ignored_count INTEGER DEFAULT 0,
    analyzed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    last_viewed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    completed_at TIMESTAMP -- Set when all photos are processed
);

-- Indexes for photo_analysis_sessions
CREATE INDEX IF NOT EXISTS idx_photo_analysis_user_id ON photo_analysis_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_photo_analysis_session_id ON photo_analysis_sessions(session_id);
CREATE INDEX IF NOT EXISTS idx_photo_analysis_created_at ON photo_analysis_sessions(analyzed_at DESC);
CREATE INDEX IF NOT EXISTS idx_photo_analysis_completed ON photo_analysis_sessions(completed_at) WHERE completed_at IS NOT NULL;

-- ====================
-- GUEST UPLOAD PROJECTS TABLE
-- ====================
-- Stores guest upload project configurations (Guest Upload Manager tool)
CREATE TABLE IF NOT EXISTS guest_upload_projects (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    project_id VARCHAR(100) UNIQUE NOT NULL,
    project_name VARCHAR(255) NOT NULL,
    description TEXT,
    people JSONB DEFAULT '[]', -- Array of people: [{ id, name, email, folder, uploadUrl, status }]
    folder_template VARCHAR(500), -- SmugMug folder path template
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    last_used_at TIMESTAMP
);

-- Indexes for guest_upload_projects
CREATE INDEX IF NOT EXISTS idx_guest_upload_user_id ON guest_upload_projects(user_id);
CREATE INDEX IF NOT EXISTS idx_guest_upload_project_id ON guest_upload_projects(project_id);

-- ====================
-- AI GALLERY TEMPLATES TABLE
-- ====================
-- Stores custom gallery structure templates (AI Gallery Creator tool)
CREATE TABLE IF NOT EXISTS gallery_templates (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    template_id VARCHAR(100) UNIQUE NOT NULL,
    template_name VARCHAR(255) NOT NULL,
    description TEXT,
    structure JSONB NOT NULL, -- JSON structure of folders and galleries
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    use_count INTEGER DEFAULT 0
);

-- Indexes for gallery_templates
CREATE INDEX IF NOT EXISTS idx_gallery_templates_user_id ON gallery_templates(user_id);
CREATE INDEX IF NOT EXISTS idx_gallery_templates_template_id ON gallery_templates(template_id);

-- ====================
-- TRIGGERS FOR UPDATED_AT
-- ====================
CREATE TRIGGER update_guest_upload_projects_updated_at
    BEFORE UPDATE ON guest_upload_projects
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_gallery_templates_updated_at
    BEFORE UPDATE ON gallery_templates
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ====================
-- COMMENTS
-- ====================
COMMENT ON TABLE favorites_sessions IS 'User-isolated customer photo selection sessions for Favorites Manager tool';
COMMENT ON TABLE photo_analysis_sessions IS 'User-isolated AI photo organization analysis sessions for Photo Organizer tool';
COMMENT ON TABLE guest_upload_projects IS 'User-isolated guest upload project configurations for Guest Upload Manager tool';
COMMENT ON TABLE gallery_templates IS 'User-isolated custom gallery structure templates for AI Gallery Creator tool';

-- ====================
-- VERIFICATION QUERIES
-- ====================
-- Verify tables were created successfully:
-- SELECT tablename FROM pg_tables WHERE schemaname = 'public' AND tablename IN ('favorites_sessions', 'photo_analysis_sessions', 'guest_upload_projects', 'gallery_templates');

-- Verify indexes:
-- SELECT indexname, tablename FROM pg_indexes WHERE schemaname = 'public' AND tablename IN ('favorites_sessions', 'photo_analysis_sessions', 'guest_upload_projects', 'gallery_templates');

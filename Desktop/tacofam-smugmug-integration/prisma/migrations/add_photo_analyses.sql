-- Migration: Add Photo Analyses Table
-- Purpose: Store AI analysis results to avoid re-analyzing photos
-- Date: 2025-10-13

-- Photo analyses table - Store cached AI analysis results
CREATE TABLE IF NOT EXISTS photo_analyses (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,

    -- Photo identification
    image_key VARCHAR(255) NOT NULL, -- SmugMug image key (e.g., "MLB2MBL-0")
    image_uri TEXT, -- Full SmugMug URI for reference
    album_key VARCHAR(255), -- Which album this photo is in

    -- Analysis details
    analysis_type VARCHAR(50) NOT NULL CHECK (analysis_type IN (
        'quality',      -- Photo Organizer quality analysis
        'culling',      -- Intelligent Culling recommendations
        'metadata',     -- MetaData Monster generated metadata
        'similarity',   -- Photo similarity analysis
        'gallery',      -- Gallery structure analysis
        'sanity'        -- Sanity Checker issue detection
    )),

    -- AI processing info
    model_used VARCHAR(100) NOT NULL, -- e.g., 'claude-sonnet-4-5-20250929'
    coins_spent INTEGER DEFAULT 1,

    -- Analysis results stored as JSONB for flexibility
    analysis_data JSONB NOT NULL, -- Complete analysis results

    -- Quality/confidence scoring
    confidence_score NUMERIC(5, 2), -- 0.00 to 100.00
    quality_score NUMERIC(5, 2), -- 0.00 to 100.00

    -- Status tracking
    status VARCHAR(20) DEFAULT 'completed' CHECK (status IN ('processing', 'completed', 'error', 'invalidated')),
    error_message TEXT,

    -- Timestamps
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    -- Unique constraint: One analysis of each type per photo per user
    UNIQUE(user_id, image_key, analysis_type)
);

-- Indexes for fast lookups
CREATE INDEX IF NOT EXISTS idx_photo_analyses_user_id ON photo_analyses(user_id);
CREATE INDEX IF NOT EXISTS idx_photo_analyses_image_key ON photo_analyses(image_key);
CREATE INDEX IF NOT EXISTS idx_photo_analyses_analysis_type ON photo_analyses(analysis_type);
CREATE INDEX IF NOT EXISTS idx_photo_analyses_status ON photo_analyses(status);
CREATE INDEX IF NOT EXISTS idx_photo_analyses_created_at ON photo_analyses(created_at DESC);

-- Composite index for the most common query pattern
CREATE INDEX IF NOT EXISTS idx_photo_analyses_lookup
    ON photo_analyses(user_id, image_key, analysis_type, status);

-- Add trigger for auto-updating updated_at
CREATE TRIGGER update_photo_analyses_updated_at BEFORE UPDATE ON photo_analyses
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Add a view for easy analysis summaries
CREATE OR REPLACE VIEW photo_analyses_summary AS
SELECT
    user_id,
    analysis_type,
    COUNT(*) as total_analyses,
    SUM(coins_spent) as total_coins_spent,
    AVG(confidence_score) as avg_confidence,
    AVG(quality_score) as avg_quality,
    MIN(created_at) as first_analysis,
    MAX(created_at) as last_analysis
FROM photo_analyses
WHERE status = 'completed'
GROUP BY user_id, analysis_type;

-- Comment on the table for documentation
COMMENT ON TABLE photo_analyses IS 'Stores AI analysis results to enable caching and avoid re-analyzing photos, saving coins and tokens';
COMMENT ON COLUMN photo_analyses.image_key IS 'SmugMug image key with version suffix (e.g., MLB2MBL-0)';
COMMENT ON COLUMN photo_analyses.analysis_data IS 'Complete analysis results in JSONB format - structure varies by analysis_type';
COMMENT ON COLUMN photo_analyses.status IS 'invalidated status means analysis is outdated and should be re-run';

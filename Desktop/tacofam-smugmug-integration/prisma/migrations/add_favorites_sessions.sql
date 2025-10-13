-- Favorites Sessions Table
-- Store customer favorites session data for Favorites Manager tool
-- Allows users to create shareable galleries where customers can select their favorite photos

CREATE TABLE IF NOT EXISTS favorites_sessions (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    session_id VARCHAR(255) UNIQUE NOT NULL, -- Unique session identifier (e.g., fav_1234567890_abc123)
    name VARCHAR(255) NOT NULL, -- Session name (e.g., "Wedding Photos Selection")
    description TEXT, -- Optional instructions for customers
    album_keys TEXT[] NOT NULL, -- Array of SmugMug album keys
    theme VARCHAR(20) DEFAULT 'purple' CHECK (theme IN ('purple', 'blue', 'green', 'red', 'orange', 'pink', 'dark')),
    show_buy_button BOOLEAN DEFAULT FALSE,
    logo_url TEXT, -- Base64 encoded logo or URL
    customer_favorites JSONB DEFAULT '{}', -- Customer selections: { "email@example.com": { "photoKeys": [...], "selectedAt": "...", "customerName": "..." } }
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    expires_at TIMESTAMP, -- Optional expiration date
    last_viewed_at TIMESTAMP -- Track when session was last accessed
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_favorites_sessions_user_id ON favorites_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_favorites_sessions_session_id ON favorites_sessions(session_id);
CREATE INDEX IF NOT EXISTS idx_favorites_sessions_created_at ON favorites_sessions(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_favorites_sessions_expires_at ON favorites_sessions(expires_at);

-- Trigger to auto-update updated_at (using existing function)
-- Note: No updated_at column, so no trigger needed

-- Sample queries
-- Get all sessions for a user:
-- SELECT * FROM favorites_sessions WHERE user_id = 1 ORDER BY created_at DESC;

-- Get session with customer favorites count:
-- SELECT
--   session_id, name, album_keys,
--   jsonb_object_keys(customer_favorites) AS customers,
--   created_at
-- FROM favorites_sessions
-- WHERE user_id = 1;

-- Get all customer emails for a session:
-- SELECT jsonb_object_keys(customer_favorites) AS customer_email
-- FROM favorites_sessions
-- WHERE session_id = 'fav_1234567890_abc123';

-- Smugtools Multi-Tenant Database Schema
-- For Neon PostgreSQL Database
-- Run this in your Neon SQL Editor

-- Users table - Core user accounts
CREATE TABLE IF NOT EXISTS users (
    id SERIAL PRIMARY KEY,
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    name VARCHAR(255),
    role VARCHAR(20) DEFAULT 'user' CHECK (role IN ('user', 'admin')),
    coin_balance INTEGER DEFAULT 10000, -- Starting balance
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    last_login TIMESTAMP
);

-- Index for faster email lookups
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);

-- SmugMug tokens table - Encrypted OAuth tokens per user
CREATE TABLE IF NOT EXISTS smugmug_tokens (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    access_token_encrypted TEXT NOT NULL, -- AES encrypted
    token_secret_encrypted TEXT NOT NULL, -- AES encrypted
    smugmug_nickname VARCHAR(255),
    smugmug_domain VARCHAR(255),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(user_id) -- One SmugMug account per user
);

CREATE INDEX IF NOT EXISTS idx_smugmug_tokens_user_id ON smugmug_tokens(user_id);

-- Coin transactions table - Track all coin purchases and spending
CREATE TABLE IF NOT EXISTS coin_transactions (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    amount INTEGER NOT NULL, -- Positive for purchase, negative for spending
    type VARCHAR(50) NOT NULL CHECK (type IN ('purchase', 'ai_operation', 'bonus', 'refund')),
    description TEXT,
    stripe_payment_id VARCHAR(255), -- Stripe Payment Intent ID
    related_ai_operation_id INTEGER, -- Link to AI operation if spending
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_coin_transactions_user_id ON coin_transactions(user_id);
CREATE INDEX IF NOT EXISTS idx_coin_transactions_type ON coin_transactions(type);
CREATE INDEX IF NOT EXISTS idx_coin_transactions_created_at ON coin_transactions(created_at DESC);

-- AI operations table - Track all AI processing
CREATE TABLE IF NOT EXISTS ai_operations (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    tool_name VARCHAR(100) NOT NULL, -- 'MetaData Monster', 'AI Gallery Creator', etc.
    status VARCHAR(20) DEFAULT 'processing' CHECK (status IN ('processing', 'completed', 'error')),
    task_summary TEXT,
    input_tokens INTEGER,
    output_tokens INTEGER,
    total_tokens INTEGER,
    coins_spent INTEGER,
    model_name VARCHAR(100),
    request_data JSONB, -- Store request details
    response_data JSONB, -- Store response details
    error_message TEXT,
    started_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    completed_at TIMESTAMP,
    duration_seconds NUMERIC(10, 2)
);

CREATE INDEX IF NOT EXISTS idx_ai_operations_user_id ON ai_operations(user_id);
CREATE INDEX IF NOT EXISTS idx_ai_operations_tool_name ON ai_operations(tool_name);
CREATE INDEX IF NOT EXISTS idx_ai_operations_status ON ai_operations(status);
CREATE INDEX IF NOT EXISTS idx_ai_operations_started_at ON ai_operations(started_at DESC);

-- NextAuth.js required tables for session management
CREATE TABLE IF NOT EXISTS accounts (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    type VARCHAR(255) NOT NULL,
    provider VARCHAR(255) NOT NULL,
    provider_account_id VARCHAR(255) NOT NULL,
    refresh_token TEXT,
    access_token TEXT,
    expires_at INTEGER,
    token_type VARCHAR(255),
    scope VARCHAR(255),
    id_token TEXT,
    session_state VARCHAR(255),
    UNIQUE(provider, provider_account_id)
);

CREATE INDEX IF NOT EXISTS idx_accounts_user_id ON accounts(user_id);

CREATE TABLE IF NOT EXISTS sessions (
    id SERIAL PRIMARY KEY,
    session_token VARCHAR(255) UNIQUE NOT NULL,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    expires TIMESTAMP NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_sessions_user_id ON sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_sessions_session_token ON sessions(session_token);

CREATE TABLE IF NOT EXISTS verification_tokens (
    identifier VARCHAR(255) NOT NULL,
    token VARCHAR(255) UNIQUE NOT NULL,
    expires TIMESTAMP NOT NULL,
    PRIMARY KEY (identifier, token)
);

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Triggers to auto-update updated_at
CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_smugmug_tokens_updated_at BEFORE UPDATE ON smugmug_tokens
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Create default admin user (password: 'admin123' - CHANGE THIS!)
-- Password hash for 'admin123' using bcrypt
INSERT INTO users (email, password_hash, name, role, coin_balance)
VALUES (
    'admin@smugmugtoolbox.com',
    '$2a$10$rKZqJqYJxQYxJxQYxJxQYu3nYqGqGqGqGqGqGqGqGqGqGqGqGqGqG', -- PLACEHOLDER - will need real hash
    'Admin User',
    'admin',
    999999999
)
ON CONFLICT (email) DO NOTHING;

-- Sample queries for testing
-- SELECT * FROM users;
-- SELECT * FROM coin_transactions WHERE user_id = 1;
-- SELECT * FROM ai_operations WHERE user_id = 1 ORDER BY started_at DESC;
-- SELECT u.email, COUNT(ai.id) as operation_count, SUM(ai.coins_spent) as total_spent
-- FROM users u
-- LEFT JOIN ai_operations ai ON u.id = ai.user_id
-- GROUP BY u.id;

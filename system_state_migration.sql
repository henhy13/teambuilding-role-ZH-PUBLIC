
CREATE TABLE IF NOT EXISTS system_state (
  key TEXT PRIMARY KEY,
  value JSONB NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);


ALTER TABLE system_state ENABLE ROW LEVEL SECURITY;


DO $$ 
BEGIN 
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' 
    AND tablename = 'system_state' 
    AND policyname = 'Allow system state operations'
  ) THEN
    CREATE POLICY "Allow system state operations" ON system_state
    FOR ALL USING (true);
  END IF;
END $$;


CREATE INDEX IF NOT EXISTS idx_system_state_key ON system_state(key);
CREATE INDEX IF NOT EXISTS idx_system_state_updated_at ON system_state(updated_at);


COMMENT ON TABLE system_state IS 'Stores application state for persistence across restarts';
COMMENT ON COLUMN system_state.key IS 'Unique identifier for the state entry';
COMMENT ON COLUMN system_state.value IS 'JSON data for the state';
COMMENT ON COLUMN system_state.updated_at IS 'Last update timestamp';
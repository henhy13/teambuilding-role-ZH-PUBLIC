CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Sessions table
CREATE TABLE IF NOT EXISTS sessions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  description TEXT,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'ended', 'archived')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  ended_at TIMESTAMPTZ,
  created_by TEXT NOT NULL,
  settings JSONB NOT NULL DEFAULT '{}',
  stats JSONB NOT NULL DEFAULT '{}',
  session_code TEXT UNIQUE
);

-- Teams table
CREATE TABLE IF NOT EXISTS teams (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  session_id UUID NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
  max_members INTEGER NOT NULL DEFAULT 10,
  is_complete BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Applicants table
CREATE TABLE IF NOT EXISTS applicants (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  team_id UUID NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  occupation TEXT NOT NULL,
  years_of_experience INTEGER NOT NULL,
  experience_unit TEXT DEFAULT 'years' CHECK (experience_unit IN ('years', 'months')),
  skills TEXT[] NOT NULL DEFAULT '{}',
  personality_traits TEXT[] NOT NULL DEFAULT '{}',
  submitted_at TIMESTAMPTZ DEFAULT NOW()
);

-- Assignment sessions table
CREATE TABLE IF NOT EXISTS assignment_sessions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  team_id UUID NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
  session_id UUID NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
  roles JSONB NOT NULL DEFAULT '[]',
  score_matrix JSONB,
  assignment JSONB,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'scoring', 'assigning', 'justifying', 'complete')),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_teams_session_id ON teams(session_id);
CREATE INDEX IF NOT EXISTS idx_applicants_team_id ON applicants(team_id);
CREATE INDEX IF NOT EXISTS idx_assignment_sessions_team_id ON assignment_sessions(team_id);
CREATE INDEX IF NOT EXISTS idx_assignment_sessions_session_id ON assignment_sessions(session_id);
CREATE INDEX IF NOT EXISTS idx_sessions_session_code ON sessions(session_code);
CREATE INDEX IF NOT EXISTS idx_sessions_status ON sessions(status);
CREATE INDEX IF NOT EXISTS idx_teams_is_complete ON teams(is_complete);
CREATE INDEX IF NOT EXISTS idx_assignment_sessions_status ON assignment_sessions(status);

-- Add unique constraint on assignment_sessions.team_id if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'assignment_sessions_team_id_key'
  ) THEN
    ALTER TABLE assignment_sessions ADD CONSTRAINT assignment_sessions_team_id_key UNIQUE(team_id);
  END IF;
END $$;

-- Enable Row Level Security (RLS)
ALTER TABLE sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE teams ENABLE ROW LEVEL SECURITY;
ALTER TABLE applicants ENABLE ROW LEVEL SECURITY;
ALTER TABLE assignment_sessions ENABLE ROW LEVEL SECURITY;

-- Create policies for public access (adjust as needed for your security requirements)
-- Only create policies if they don't already exist
DO $$
BEGIN
  -- Policy for sessions
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'sessions' AND policyname = 'Allow all operations on sessions'
  ) THEN
    CREATE POLICY "Allow all operations on sessions" ON sessions FOR ALL USING (true);
  END IF;
  
  -- Policy for teams  
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'teams' AND policyname = 'Allow all operations on teams'
  ) THEN
    CREATE POLICY "Allow all operations on teams" ON teams FOR ALL USING (true);
  END IF;
  
  -- Policy for applicants
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'applicants' AND policyname = 'Allow all operations on applicants'
  ) THEN
    CREATE POLICY "Allow all operations on applicants" ON applicants FOR ALL USING (true);
  END IF;
  
  -- Policy for assignment_sessions
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'assignment_sessions' AND policyname = 'Allow all operations on assignment_sessions'
  ) THEN
    CREATE POLICY "Allow all operations on assignment_sessions" ON assignment_sessions FOR ALL USING (true);
  END IF;
END $$;

-- Function to automatically update team completion status
CREATE OR REPLACE FUNCTION update_team_completion()
RETURNS TRIGGER AS $$
BEGIN
  -- Update the team's is_complete status based on applicant count
  UPDATE teams 
  SET is_complete = (
    SELECT COUNT(*) >= max_members 
    FROM applicants 
    WHERE team_id = COALESCE(NEW.team_id, OLD.team_id)
  )
  WHERE id = COALESCE(NEW.team_id, OLD.team_id);
  
  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

-- Trigger to automatically update team completion status when applicants are added/removed
-- Only create trigger if it doesn't already exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger 
    WHERE tgname = 'trigger_update_team_completion'
  ) THEN
    CREATE TRIGGER trigger_update_team_completion
      AFTER INSERT OR DELETE ON applicants
      FOR EACH ROW
      EXECUTE FUNCTION update_team_completion();
  END IF;
END $$;

-- CRITICAL: Function to enforce team member limits and prevent race conditions
CREATE OR REPLACE FUNCTION enforce_team_member_limit()
RETURNS TRIGGER AS $$
DECLARE
  current_count INTEGER;
  max_count INTEGER;
BEGIN
  -- Get current member count and max allowed for this team
  SELECT COUNT(*), t.max_members
  INTO current_count, max_count
  FROM applicants a
  JOIN teams t ON t.id = NEW.team_id
  WHERE a.team_id = NEW.team_id
  GROUP BY t.max_members;
  
  -- If no existing members, get max_members from teams table
  IF current_count IS NULL THEN
    SELECT max_members INTO max_count
    FROM teams
    WHERE id = NEW.team_id;
    current_count := 0;
  END IF;
  
  -- Check if adding this applicant would exceed the limit
  IF current_count >= max_count THEN
    RAISE EXCEPTION 'Team member limit exceeded. Team already has % members (max: %)', current_count, max_count
      USING ERRCODE = 'check_violation',
            HINT = 'Cannot add more members to this team';
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to enforce team member limits before insert (prevents race conditions)
-- Only create trigger if it doesn't already exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger 
    WHERE tgname = 'trigger_enforce_team_member_limit'
  ) THEN
    CREATE TRIGGER trigger_enforce_team_member_limit
      BEFORE INSERT ON applicants
      FOR EACH ROW
      EXECUTE FUNCTION enforce_team_member_limit();
  END IF;
END $$;

-- Function to safely add applicant to team (atomic operation)
CREATE OR REPLACE FUNCTION add_applicant_to_team(
  p_applicant_id UUID,
  p_team_id UUID,
  p_name TEXT,
  p_occupation TEXT,
  p_years_of_experience INTEGER,
  p_experience_unit TEXT DEFAULT 'years',
  p_skills TEXT[] DEFAULT '{}',
  p_personality_traits TEXT[] DEFAULT '{}'
)
RETURNS JSON AS $$
DECLARE
  result JSON;
  current_count INTEGER;
  max_count INTEGER;
BEGIN
  -- Lock the team row to prevent concurrent modifications
  SELECT max_members INTO max_count
  FROM teams
  WHERE id = p_team_id
  FOR UPDATE;
  
  -- Check current count after locking
  SELECT COUNT(*) INTO current_count
  FROM applicants
  WHERE team_id = p_team_id;
  
  -- Verify we can add this member
  IF current_count >= max_count THEN
    result := json_build_object(
      'success', false,
      'error', 'Team member limit exceeded',
      'current_count', current_count,
      'max_count', max_count
    );
    RETURN result;
  END IF;
  
  -- Insert the applicant (this will also trigger our constraint check)
  INSERT INTO applicants (
    id, team_id, name, occupation, years_of_experience, 
    experience_unit, skills, personality_traits
  ) VALUES (
    p_applicant_id, p_team_id, p_name, p_occupation, p_years_of_experience,
    p_experience_unit, p_skills, p_personality_traits
  );
  
  -- Return success with the new applicant data
  SELECT json_build_object(
    'success', true,
    'applicant', json_build_object(
      'id', id,
      'name', name,
      'occupation', occupation,
      'years_of_experience', years_of_experience,
      'experience_unit', experience_unit,
      'skills', skills,
      'personality_traits', personality_traits,
      'team_id', team_id,
      'submitted_at', submitted_at
    ),
    'team_status', json_build_object(
      'current_count', current_count + 1,
      'max_count', max_count,
      'is_complete', (current_count + 1) >= max_count
    )
  ) INTO result
  FROM applicants
  WHERE id = p_applicant_id;
  
  RETURN result;
  
EXCEPTION
  WHEN OTHERS THEN
    result := json_build_object(
      'success', false,
      'error', SQLERRM,
      'error_code', SQLSTATE
    );
    RETURN result;
END;
$$ LANGUAGE plpgsql;

-- Function to get team with applicants (for efficient queries)
CREATE OR REPLACE FUNCTION get_team_with_applicants(team_uuid UUID)
RETURNS JSON AS $$
DECLARE
  result JSON;
BEGIN
  SELECT json_build_object(
    'id', t.id,
    'name', t.name,
    'session_id', t.session_id,
    'max_members', t.max_members,
    'is_complete', t.is_complete,
    'created_at', t.created_at,
    'applicants', COALESCE(applicants_array, '[]'::json)
  ) INTO result
  FROM teams t
  LEFT JOIN (
    SELECT 
      team_id,
      json_agg(
        json_build_object(
          'id', id,
          'name', name,
          'occupation', occupation,
          'years_of_experience', years_of_experience,
          'experience_unit', experience_unit,
          'skills', skills,
          'personality_traits', personality_traits,
          'submitted_at', submitted_at
        )
      ) as applicants_array
    FROM applicants
    WHERE team_id = team_uuid
    GROUP BY team_id
  ) a ON t.id = a.team_id
  WHERE t.id = team_uuid;
  
  RETURN result;
END;
$$ LANGUAGE plpgsql;

-- Comments for documentation
COMMENT ON TABLE sessions IS 'Main sessions table storing session information and settings';
COMMENT ON TABLE teams IS 'Teams within sessions with configurable member limits';
COMMENT ON TABLE applicants IS 'Individual applicants assigned to teams';
COMMENT ON TABLE assignment_sessions IS 'Role assignment sessions for completed teams';
COMMENT ON FUNCTION update_team_completion() IS 'Automatically updates team completion status when applicants are added/removed';
COMMENT ON FUNCTION enforce_team_member_limit() IS 'Prevents race conditions by enforcing team member limits at database level';
COMMENT ON FUNCTION add_applicant_to_team(UUID, UUID, TEXT, TEXT, INTEGER, TEXT, TEXT[], TEXT[]) IS 'Atomically adds applicant to team with proper race condition protection';
COMMENT ON FUNCTION get_team_with_applicants(UUID) IS 'Efficiently retrieves team data with all associated applicants';
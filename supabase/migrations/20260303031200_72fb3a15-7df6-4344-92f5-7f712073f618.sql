
-- Add custom_time column to medicine_sessions for per-medicine scheduling
ALTER TABLE public.medicine_sessions
ADD COLUMN custom_time time without time zone DEFAULT NULL;

-- Add comment for clarity
COMMENT ON COLUMN public.medicine_sessions.custom_time IS 'Custom reminder time for this medicine+session. Falls back to session_schedules default if NULL.';

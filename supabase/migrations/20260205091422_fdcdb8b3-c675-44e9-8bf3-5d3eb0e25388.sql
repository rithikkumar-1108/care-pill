-- Enable realtime for dose_logs and medicines tables for caregiver sync
ALTER PUBLICATION supabase_realtime ADD TABLE public.dose_logs;
ALTER PUBLICATION supabase_realtime ADD TABLE public.medicines;
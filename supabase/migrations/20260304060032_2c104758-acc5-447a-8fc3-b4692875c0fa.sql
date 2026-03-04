
-- Create prescriptions table
CREATE TABLE public.prescriptions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  file_url text NOT NULL,
  file_name text NOT NULL,
  file_type text NOT NULL,
  extracted_text text,
  extracted_medicines jsonb,
  status text NOT NULL DEFAULT 'pending',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.prescriptions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can insert own prescriptions" ON public.prescriptions FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can view own prescriptions" ON public.prescriptions FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users can update own prescriptions" ON public.prescriptions FOR UPDATE TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own prescriptions" ON public.prescriptions FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- Add prescription_id to medicines table
ALTER TABLE public.medicines ADD COLUMN prescription_id uuid REFERENCES public.prescriptions(id) ON DELETE SET NULL;

-- Create storage bucket for prescriptions
INSERT INTO storage.buckets (id, name, public) VALUES ('prescriptions', 'prescriptions', false);

-- Storage RLS policies
CREATE POLICY "Users can upload prescriptions" ON storage.objects FOR INSERT TO authenticated WITH CHECK (bucket_id = 'prescriptions' AND (storage.foldername(name))[1] = auth.uid()::text);
CREATE POLICY "Users can view own prescriptions" ON storage.objects FOR SELECT TO authenticated USING (bucket_id = 'prescriptions' AND (storage.foldername(name))[1] = auth.uid()::text);
CREATE POLICY "Users can delete own prescriptions" ON storage.objects FOR DELETE TO authenticated USING (bucket_id = 'prescriptions' AND (storage.foldername(name))[1] = auth.uid()::text);

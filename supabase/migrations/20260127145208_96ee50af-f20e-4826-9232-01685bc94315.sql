-- Create app_role enum for user roles
CREATE TYPE public.app_role AS ENUM ('admin', 'user', 'caregiver');

-- Create session_type enum
CREATE TYPE public.session_type AS ENUM ('morning', 'afternoon', 'night');

-- Create dose_status enum  
CREATE TYPE public.dose_status AS ENUM ('pending', 'taken', 'missed', 'skipped');

-- Create stock_status enum
CREATE TYPE public.stock_status AS ENUM ('good', 'low', 'critical');

-- Create profiles table
CREATE TABLE public.profiles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL UNIQUE,
    full_name TEXT NOT NULL,
    age INTEGER,
    gender TEXT,
    health_condition TEXT,
    caregiver_name TEXT,
    caregiver_email TEXT,
    caregiver_phone TEXT,
    avatar_url TEXT,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create user_roles table (separate from profiles as per security requirement)
CREATE TABLE public.user_roles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    role app_role NOT NULL DEFAULT 'user',
    UNIQUE (user_id, role)
);

-- Create session_schedules table for custom session times
CREATE TABLE public.session_schedules (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    session_type session_type NOT NULL,
    scheduled_time TIME NOT NULL,
    is_default BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    UNIQUE (user_id, session_type)
);

-- Create medicines table
CREATE TABLE public.medicines (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    name TEXT NOT NULL,
    dosage TEXT NOT NULL,
    dosage_unit TEXT NOT NULL DEFAULT 'tablet',
    instructions TEXT,
    start_date DATE NOT NULL,
    end_date DATE,
    stock_quantity INTEGER NOT NULL DEFAULT 0,
    low_stock_threshold INTEGER NOT NULL DEFAULT 10,
    image_url TEXT,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create medicine_sessions table (which medicines for which sessions)
CREATE TABLE public.medicine_sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    medicine_id UUID REFERENCES public.medicines(id) ON DELETE CASCADE NOT NULL,
    session_type session_type NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    UNIQUE (medicine_id, session_type)
);

-- Create dose_logs table
CREATE TABLE public.dose_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    medicine_id UUID REFERENCES public.medicines(id) ON DELETE CASCADE NOT NULL,
    session_type session_type NOT NULL,
    scheduled_date DATE NOT NULL,
    status dose_status NOT NULL DEFAULT 'pending',
    taken_at TIMESTAMP WITH TIME ZONE,
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    UNIQUE (user_id, medicine_id, session_type, scheduled_date)
);

-- Create caregiver_links table
CREATE TABLE public.caregiver_links (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    patient_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    caregiver_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    invitation_token TEXT,
    status TEXT NOT NULL DEFAULT 'pending',
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    accepted_at TIMESTAMP WITH TIME ZONE,
    UNIQUE (patient_id, caregiver_id)
);

-- Create stock_alerts table
CREATE TABLE public.stock_alerts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    medicine_id UUID REFERENCES public.medicines(id) ON DELETE CASCADE NOT NULL,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    alert_type TEXT NOT NULL,
    is_read BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create notification_logs table for tracking sent notifications
CREATE TABLE public.notification_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    notification_type TEXT NOT NULL,
    recipient_email TEXT,
    recipient_phone TEXT,
    message TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'pending',
    sent_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on all tables
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.session_schedules ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.medicines ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.medicine_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.dose_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.caregiver_links ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.stock_alerts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notification_logs ENABLE ROW LEVEL SECURITY;

-- Create security definer function for role checking
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
    SELECT EXISTS (
        SELECT 1
        FROM public.user_roles
        WHERE user_id = _user_id
          AND role = _role
    )
$$;

-- Create function to check if user is caregiver for a patient
CREATE OR REPLACE FUNCTION public.is_caregiver_of(_caregiver_id UUID, _patient_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
    SELECT EXISTS (
        SELECT 1
        FROM public.caregiver_links
        WHERE caregiver_id = _caregiver_id
          AND patient_id = _patient_id
          AND status = 'accepted'
    )
$$;

-- Profiles policies
CREATE POLICY "Users can view own profile" ON public.profiles
    FOR SELECT USING (auth.uid() = user_id);
    
CREATE POLICY "Users can insert own profile" ON public.profiles
    FOR INSERT WITH CHECK (auth.uid() = user_id);
    
CREATE POLICY "Users can update own profile" ON public.profiles
    FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Caregivers can view patient profiles" ON public.profiles
    FOR SELECT USING (public.is_caregiver_of(auth.uid(), user_id));

-- User roles policies
CREATE POLICY "Users can view own roles" ON public.user_roles
    FOR SELECT USING (auth.uid() = user_id);

-- Session schedules policies
CREATE POLICY "Users can view own schedules" ON public.session_schedules
    FOR SELECT USING (auth.uid() = user_id);
    
CREATE POLICY "Users can insert own schedules" ON public.session_schedules
    FOR INSERT WITH CHECK (auth.uid() = user_id);
    
CREATE POLICY "Users can update own schedules" ON public.session_schedules
    FOR UPDATE USING (auth.uid() = user_id);
    
CREATE POLICY "Users can delete own schedules" ON public.session_schedules
    FOR DELETE USING (auth.uid() = user_id);

CREATE POLICY "Caregivers can view patient schedules" ON public.session_schedules
    FOR SELECT USING (public.is_caregiver_of(auth.uid(), user_id));

-- Medicines policies
CREATE POLICY "Users can view own medicines" ON public.medicines
    FOR SELECT USING (auth.uid() = user_id);
    
CREATE POLICY "Users can insert own medicines" ON public.medicines
    FOR INSERT WITH CHECK (auth.uid() = user_id);
    
CREATE POLICY "Users can update own medicines" ON public.medicines
    FOR UPDATE USING (auth.uid() = user_id);
    
CREATE POLICY "Users can delete own medicines" ON public.medicines
    FOR DELETE USING (auth.uid() = user_id);

CREATE POLICY "Caregivers can view patient medicines" ON public.medicines
    FOR SELECT USING (public.is_caregiver_of(auth.uid(), user_id));

-- Medicine sessions policies
CREATE POLICY "Users can view own medicine sessions" ON public.medicine_sessions
    FOR SELECT USING (
        EXISTS (SELECT 1 FROM public.medicines WHERE id = medicine_id AND user_id = auth.uid())
    );
    
CREATE POLICY "Users can insert own medicine sessions" ON public.medicine_sessions
    FOR INSERT WITH CHECK (
        EXISTS (SELECT 1 FROM public.medicines WHERE id = medicine_id AND user_id = auth.uid())
    );
    
CREATE POLICY "Users can delete own medicine sessions" ON public.medicine_sessions
    FOR DELETE USING (
        EXISTS (SELECT 1 FROM public.medicines WHERE id = medicine_id AND user_id = auth.uid())
    );

CREATE POLICY "Caregivers can view patient medicine sessions" ON public.medicine_sessions
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.medicines m 
            WHERE m.id = medicine_id 
            AND public.is_caregiver_of(auth.uid(), m.user_id)
        )
    );

-- Dose logs policies
CREATE POLICY "Users can view own dose logs" ON public.dose_logs
    FOR SELECT USING (auth.uid() = user_id);
    
CREATE POLICY "Users can insert own dose logs" ON public.dose_logs
    FOR INSERT WITH CHECK (auth.uid() = user_id);
    
CREATE POLICY "Users can update own dose logs" ON public.dose_logs
    FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Caregivers can view patient dose logs" ON public.dose_logs
    FOR SELECT USING (public.is_caregiver_of(auth.uid(), user_id));

-- Caregiver links policies
CREATE POLICY "Patients can view own caregiver links" ON public.caregiver_links
    FOR SELECT USING (auth.uid() = patient_id);
    
CREATE POLICY "Caregivers can view their links" ON public.caregiver_links
    FOR SELECT USING (auth.uid() = caregiver_id);
    
CREATE POLICY "Patients can create caregiver links" ON public.caregiver_links
    FOR INSERT WITH CHECK (auth.uid() = patient_id);
    
CREATE POLICY "Caregivers can update link status" ON public.caregiver_links
    FOR UPDATE USING (auth.uid() = caregiver_id);
    
CREATE POLICY "Patients can delete caregiver links" ON public.caregiver_links
    FOR DELETE USING (auth.uid() = patient_id);

-- Stock alerts policies
CREATE POLICY "Users can view own stock alerts" ON public.stock_alerts
    FOR SELECT USING (auth.uid() = user_id);
    
CREATE POLICY "Users can insert own stock alerts" ON public.stock_alerts
    FOR INSERT WITH CHECK (auth.uid() = user_id);
    
CREATE POLICY "Users can update own stock alerts" ON public.stock_alerts
    FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Caregivers can view patient stock alerts" ON public.stock_alerts
    FOR SELECT USING (public.is_caregiver_of(auth.uid(), user_id));

-- Notification logs policies
CREATE POLICY "Users can view own notifications" ON public.notification_logs
    FOR SELECT USING (auth.uid() = user_id);

-- Create function to update timestamps
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- Create triggers for updated_at
CREATE TRIGGER update_profiles_updated_at
    BEFORE UPDATE ON public.profiles
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_session_schedules_updated_at
    BEFORE UPDATE ON public.session_schedules
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_medicines_updated_at
    BEFORE UPDATE ON public.medicines
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_dose_logs_updated_at
    BEFORE UPDATE ON public.dose_logs
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Create function to auto-create profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.profiles (user_id, full_name)
    VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email));
    
    INSERT INTO public.user_roles (user_id, role)
    VALUES (NEW.id, 'user');
    
    -- Insert default session schedules
    INSERT INTO public.session_schedules (user_id, session_type, scheduled_time, is_default)
    VALUES 
        (NEW.id, 'morning', '08:00:00', true),
        (NEW.id, 'afternoon', '14:00:00', true),
        (NEW.id, 'night', '20:00:00', true);
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Create trigger for new user signup
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Create function to auto-deduct stock when dose is taken
CREATE OR REPLACE FUNCTION public.handle_dose_taken()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.status = 'taken' AND (OLD.status IS NULL OR OLD.status != 'taken') THEN
        UPDATE public.medicines
        SET stock_quantity = GREATEST(0, stock_quantity - 1)
        WHERE id = NEW.medicine_id;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Create trigger for stock deduction
CREATE TRIGGER on_dose_taken
    AFTER INSERT OR UPDATE ON public.dose_logs
    FOR EACH ROW EXECUTE FUNCTION public.handle_dose_taken();
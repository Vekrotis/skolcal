-- Povolit rozšíření pgcrypto pro šifrování
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- Tabulka profilů (navázaná na auth.users)
CREATE TABLE public.profiles (
    id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
    calendar_mode TEXT CHECK (calendar_mode IN ('google', 'ics')) DEFAULT 'ics',
    skola_online_username TEXT,
    skola_online_password_encrypted TEXT,
    ics_token UUID DEFAULT gen_random_uuid() UNIQUE,
    schedule_data JSONB,
    google_calendar_id TEXT,
    google_notification_minutes INTEGER,
    google_sync_frequency_hours INTEGER DEFAULT 24,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- Tabulka pro ukládání Google OAuth tokenů
CREATE TABLE public.google_tokens (
    user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE PRIMARY KEY,
    access_token TEXT NOT NULL,
    refresh_token TEXT,
    expiry_date BIGINT,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- Tabulka pro mapování předmětů a barev
CREATE TABLE public.subject_colors (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
    subject_name TEXT NOT NULL,
    google_color_id TEXT, -- Google Calendar API color ID (1-11)
    ics_color TEXT,       -- Hex color or named color for ICS
    UNIQUE(user_id, subject_name)
);

-- RLS (Row Level Security) nastavení
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.google_tokens ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.subject_colors ENABLE ROW LEVEL SECURITY;

-- Politiky pro profiles
CREATE POLICY "Users can view own profile" ON public.profiles
    FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can update own profile" ON public.profiles
    FOR UPDATE USING (auth.uid() = id);

CREATE POLICY "Users can insert own profile" ON public.profiles
    FOR INSERT WITH CHECK (auth.uid() = id);

-- Politiky pro google_tokens
CREATE POLICY "Users can view own google tokens" ON public.google_tokens
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can update own google tokens" ON public.google_tokens
    FOR UPDATE USING (auth.uid() = user_id);
    
CREATE POLICY "Users can insert own google tokens" ON public.google_tokens
    FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Politiky pro subject_colors
CREATE POLICY "Users can view own subject colors" ON public.subject_colors
    FOR SELECT USING (auth.uid() = user_id);
    
CREATE POLICY "Users can insert own subject colors" ON public.subject_colors
    FOR INSERT WITH CHECK (auth.uid() = user_id);
    
CREATE POLICY "Users can update own subject colors" ON public.subject_colors
    FOR UPDATE USING (auth.uid() = user_id);
    
CREATE POLICY "Users can delete own subject colors" ON public.subject_colors
    FOR DELETE USING (auth.uid() = user_id);

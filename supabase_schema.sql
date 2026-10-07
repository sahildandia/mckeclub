-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create departments table
CREATE TABLE public.departments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL UNIQUE,
    short_name TEXT NOT NULL UNIQUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create clubs table
CREATE TABLE public.clubs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL UNIQUE,
    is_japanese_only BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create capacities table
CREATE TABLE public.club_department_capacities (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    department_id UUID REFERENCES public.departments(id) ON DELETE CASCADE,
    club_id UUID REFERENCES public.clubs(id) ON DELETE CASCADE,
    capacity INTEGER NOT NULL CHECK (capacity >= 0),
    UNIQUE(department_id, club_id),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create registrations table
CREATE TABLE public.registrations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    student_name TEXT NOT NULL,
    register_number TEXT NOT NULL UNIQUE,
    college_email TEXT NOT NULL,
    phone_number TEXT NOT NULL,
    department_id UUID REFERENCES public.departments(id),
    year TEXT NOT NULL,
    is_japanese_student BOOLEAN NOT NULL DEFAULT FALSE,
    club_id UUID REFERENCES public.clubs(id),
    status TEXT NOT NULL DEFAULT 'ACCEPTED' CHECK (status IN ('ACCEPTED', 'REJECTED', 'CANCELLED')),
    confirmation_id TEXT NOT NULL UNIQUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create audit logs table
CREATE TABLE public.audit_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    action TEXT NOT NULL,
    details JSONB NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    admin_id UUID REFERENCES auth.users(id)
);

-- Row Level Security (RLS)
ALTER TABLE public.departments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.clubs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.club_department_capacities ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.registrations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

-- Allow public read access to departments, clubs, and capacities
CREATE POLICY "Allow public read access on departments" ON public.departments FOR SELECT USING (true);
CREATE POLICY "Allow public read access on clubs" ON public.clubs FOR SELECT USING (true);
CREATE POLICY "Allow public read access on capacities" ON public.club_department_capacities FOR SELECT USING (true);

-- Allow public status check
CREATE POLICY "Allow public status check" ON public.registrations FOR SELECT USING (true);

-- Allow authenticated admins full access
CREATE POLICY "Allow admin full access on departments" ON public.departments USING (auth.role() = 'authenticated');
CREATE POLICY "Allow admin full access on clubs" ON public.clubs USING (auth.role() = 'authenticated');
CREATE POLICY "Allow admin full access on capacities" ON public.club_department_capacities USING (auth.role() = 'authenticated');
CREATE POLICY "Allow admin full access on registrations" ON public.registrations USING (auth.role() = 'authenticated');
CREATE POLICY "Allow admin full access on audit_logs" ON public.audit_logs USING (auth.role() = 'authenticated');

-- Function to handle atomic registration
CREATE OR REPLACE FUNCTION register_student(
    p_student_name TEXT,
    p_register_number TEXT,
    p_college_email TEXT,
    p_phone_number TEXT,
    p_department_id UUID,
    p_year TEXT,
    p_is_japanese_student BOOLEAN,
    p_club_id UUID
) RETURNS JSON AS $$
DECLARE
    v_capacity INTEGER;
    v_registered INTEGER;
    v_remaining INTEGER;
    v_confirmation_id TEXT;
    v_is_japanese_only BOOLEAN;
    v_result JSON;
BEGIN
    -- 1. Check if student already registered
    IF EXISTS (SELECT 1 FROM public.registrations WHERE register_number = p_register_number) THEN
        RETURN json_build_object('success', false, 'error', 'You have already registered for a club.');
    END IF;

    -- 2. Check if the club is Japanese-only and student is Japanese
    SELECT is_japanese_only INTO v_is_japanese_only FROM public.clubs WHERE id = p_club_id;
    
    IF v_is_japanese_only = TRUE AND p_is_japanese_student = FALSE THEN
        RETURN json_build_object('success', false, 'error', 'Only Japanese students can select this club.');
    END IF;
    
    IF v_is_japanese_only = FALSE AND p_is_japanese_student = TRUE THEN
        RETURN json_build_object('success', false, 'error', 'Japanese students can only select the Japanese Club.');
    END IF;

    -- 3. Check capacity with locking (Bypass for Japanese club)
    IF v_is_japanese_only = FALSE THEN
        SELECT capacity INTO v_capacity 
        FROM public.club_department_capacities 
        WHERE department_id = p_department_id AND club_id = p_club_id
        FOR UPDATE; -- Lock the row to prevent race conditions

        IF NOT FOUND THEN
            RETURN json_build_object('success', false, 'error', 'Invalid department or club selection.');
        END IF;

        -- Get current registered count
        SELECT COUNT(*) INTO v_registered 
        FROM public.registrations 
        WHERE department_id = p_department_id AND club_id = p_club_id AND status = 'ACCEPTED';

        v_remaining := v_capacity - v_registered;

        IF v_remaining <= 0 THEN
            RETURN json_build_object('success', false, 'error', 'Registration Closed: No seats are currently available for this club in your department.');
        END IF;
    END IF;

    -- 4. Generate confirmation ID
    v_confirmation_id := 'CONF-' || UPPER(SUBSTRING(MD5(RANDOM()::TEXT) FROM 1 FOR 8));

    -- 5. Insert registration
    INSERT INTO public.registrations (
        student_name, register_number, college_email, phone_number, department_id, year, is_japanese_student, club_id, confirmation_id
    ) VALUES (
        p_student_name, p_register_number, p_college_email, p_phone_number, p_department_id, p_year, p_is_japanese_student, p_club_id, v_confirmation_id
    );

    RETURN json_build_object('success', true, 'confirmation_id', v_confirmation_id);

EXCEPTION WHEN unique_violation THEN
    -- Fallback for concurrent unique violation on register_number or confirmation_id
    RETURN json_build_object('success', false, 'error', 'Registration failed due to a uniqueness conflict. Please try again.');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

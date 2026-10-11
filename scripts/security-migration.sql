BEGIN;
DROP POLICY IF EXISTS "Allow public status check" ON public.registrations;
DROP POLICY IF EXISTS "Allow admin full access on departments" ON public.departments;
CREATE POLICY "Allow admin full access on departments" ON public.departments USING (auth.jwt() -> 'app_metadata' ->> 'role' = 'admin') WITH CHECK (auth.jwt() -> 'app_metadata' ->> 'role' = 'admin');
DROP POLICY IF EXISTS "Allow admin full access on clubs" ON public.clubs;
CREATE POLICY "Allow admin full access on clubs" ON public.clubs USING (auth.jwt() -> 'app_metadata' ->> 'role' = 'admin') WITH CHECK (auth.jwt() -> 'app_metadata' ->> 'role' = 'admin');
DROP POLICY IF EXISTS "Allow admin full access on capacities" ON public.club_department_capacities;
CREATE POLICY "Allow admin full access on capacities" ON public.club_department_capacities USING (auth.jwt() -> 'app_metadata' ->> 'role' = 'admin') WITH CHECK (auth.jwt() -> 'app_metadata' ->> 'role' = 'admin');
DROP POLICY IF EXISTS "Allow admin full access on registrations" ON public.registrations;
CREATE POLICY "Allow admin full access on registrations" ON public.registrations USING (auth.jwt() -> 'app_metadata' ->> 'role' = 'admin') WITH CHECK (auth.jwt() -> 'app_metadata' ->> 'role' = 'admin');
DROP POLICY IF EXISTS "Allow admin full access on audit_logs" ON public.audit_logs;
CREATE POLICY "Allow admin full access on audit_logs" ON public.audit_logs USING (auth.jwt() -> 'app_metadata' ->> 'role' = 'admin') WITH CHECK (auth.jwt() -> 'app_metadata' ->> 'role' = 'admin');
CREATE OR REPLACE FUNCTION register_student(
    p_student_name TEXT,
    p_register_number TEXT,
    p_college_email TEXT,
    p_phone_number TEXT,
    p_department_id UUID,
    p_year TEXT,
    p_is_japanese_student BOOLEAN,
    p_is_aws_interested BOOLEAN,
    p_club_id UUID
) RETURNS JSON AS $$
DECLARE
    v_capacity INTEGER;
    v_registered INTEGER;
    v_remaining INTEGER;
    v_confirmation_id TEXT;
    v_is_japanese_only BOOLEAN;
    v_is_aws_only BOOLEAN;
    v_result JSON;
BEGIN
    IF p_college_email IS NULL OR p_college_email !~ '^[^@[:space:]]+@mkce\.ac\.in$'
       OR p_student_name IS NULL OR length(trim(p_student_name)) NOT BETWEEN 1 AND 120
       OR p_register_number IS NULL OR p_register_number !~ '^[A-Z0-9]{5,30}$'
       OR p_phone_number IS NULL OR p_phone_number !~ '^[0-9]{10}$'
       OR p_year IS NULL OR p_year NOT IN ('1st Year', '2nd Year', '3rd Year')
       OR p_department_id IS NULL OR p_club_id IS NULL
       OR p_is_japanese_student IS NULL OR p_is_aws_interested IS DISTINCT FROM FALSE THEN
        RETURN json_build_object('success', false, 'error', 'Invalid registration details.');
    END IF;
    IF NOT EXISTS (SELECT 1 FROM public.departments WHERE id = p_department_id) THEN
        RETURN json_build_object('success', false, 'error', 'Invalid department.');
    END IF;

    -- 1. Check if student already registered
    IF EXISTS (SELECT 1 FROM public.registrations WHERE register_number = p_register_number) THEN
        RETURN json_build_object('success', false, 'error', 'You have already registered for a club.');
    END IF;

    -- 2. Check if the club is Japanese-only or AWS-only
    SELECT is_japanese_only, is_aws_only INTO v_is_japanese_only, v_is_aws_only FROM public.clubs WHERE id = p_club_id;
    
    IF NOT FOUND OR v_is_aws_only THEN
        RETURN json_build_object('success', false, 'error', 'This club is not available.');
    END IF;

    IF v_is_japanese_only = TRUE AND p_is_japanese_student = FALSE THEN
        RETURN json_build_object('success', false, 'error', 'Only Japanese students can select this club.');
    END IF;
    
    IF v_is_japanese_only = FALSE AND p_is_japanese_student = TRUE THEN
        RETURN json_build_object('success', false, 'error', 'Japanese students can only select the Japanese Club.');
    END IF;

    IF v_is_aws_only = TRUE AND p_is_aws_interested = FALSE THEN
        RETURN json_build_object('success', false, 'error', 'Only students interested in AWS can select this club.');
    END IF;
    
    IF v_is_aws_only = FALSE AND p_is_aws_interested = TRUE THEN
        RETURN json_build_object('success', false, 'error', 'AWS interested students can only select the AWS Club.');
    END IF;

    -- 3. Check capacity with locking (Bypass for Japanese club and AWS club)
    IF v_is_japanese_only = FALSE AND v_is_aws_only = FALSE THEN
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
        student_name, register_number, college_email, phone_number, department_id, year, is_japanese_student, is_aws_interested, club_id, confirmation_id
    ) VALUES (
        p_student_name, p_register_number, p_college_email, p_phone_number, p_department_id, p_year, p_is_japanese_student, p_is_aws_interested, p_club_id, v_confirmation_id
    );

    RETURN json_build_object('success', true, 'confirmation_id', v_confirmation_id);

EXCEPTION WHEN unique_violation THEN
    -- Fallback for concurrent unique violation on register_number or confirmation_id
    RETURN json_build_object('success', false, 'error', 'Registration failed due to a uniqueness conflict. Please try again.');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp;

REVOKE EXECUTE ON FUNCTION public.register_student(TEXT,TEXT,TEXT,TEXT,UUID,TEXT,BOOLEAN,BOOLEAN,UUID) FROM PUBLIC, anon, authenticated;
COMMIT;

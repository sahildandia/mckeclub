const postgres = require('postgres');
const connectionString = "postgresql://postgres.kwzuhysldgendoswrfzd:927624Bcs%40139@aws-0-ap-northeast-2.pooler.supabase.com:5432/postgres";
const sql = postgres(connectionString);

async function run() {
  try {
    console.log("Adding columns...");
    await sql`ALTER TABLE public.clubs ADD COLUMN IF NOT EXISTS is_aws_only BOOLEAN NOT NULL DEFAULT FALSE;`;
    await sql`ALTER TABLE public.registrations ADD COLUMN IF NOT EXISTS is_aws_interested BOOLEAN NOT NULL DEFAULT FALSE;`;
    
    console.log("Inserting AWS Club...");
    const awsClub = await sql`INSERT INTO public.clubs (name, is_aws_only) VALUES ('AWS Cloud Club', TRUE) ON CONFLICT (name) DO NOTHING RETURNING id;`;
    
    // If club was just inserted, we might need to add capacities (0) for all departments
    if (awsClub.length > 0) {
      const departments = await sql`SELECT id FROM public.departments`;
      for (const dept of departments) {
        await sql`INSERT INTO public.club_department_capacities (department_id, club_id, capacity) VALUES (${dept.id}, ${awsClub[0].id}, 0) ON CONFLICT DO NOTHING`;
      }
      console.log("Inserted capacities for AWS club");
    }

    console.log("Updating register_student function...");
    await sql.unsafe(`
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
    -- 1. Check if student already registered
    IF EXISTS (SELECT 1 FROM public.registrations WHERE register_number = p_register_number) THEN
        RETURN json_build_object('success', false, 'error', 'You have already registered for a club.');
    END IF;

    -- 2. Check if the club is Japanese-only or AWS-only
    SELECT is_japanese_only, is_aws_only INTO v_is_japanese_only, v_is_aws_only FROM public.clubs WHERE id = p_club_id;
    
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
        FOR UPDATE;

        IF NOT FOUND THEN
            RETURN json_build_object('success', false, 'error', 'Invalid department or club selection.');
        END IF;

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
    RETURN json_build_object('success', false, 'error', 'Registration failed due to a uniqueness conflict. Please try again.');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
    `);
    
    console.log("Migration complete!");
  } catch (err) {
    console.error("Failed:", err);
  } finally {
    await sql.end();
  }
}

run();

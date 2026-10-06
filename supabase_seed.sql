-- Insert Departments
INSERT INTO public.departments (name, short_name) VALUES
    ('Artificial Intelligence and Data Science', 'AI & DS'),
    ('Artificial Intelligence and Machine Learning', 'AI & ML'),
    ('Civil Engineering', 'Civil Engineering'),
    ('Computer Science and Business Systems', 'CSBS'),
    ('Computer Science and Engineering', 'CSE'),
    ('Electrical and Electronics Engineering', 'EEE'),
    ('Electronics and Communication Engineering', 'ECE'),
    ('Electronics Engineering (VLSI)', 'VLSI'),
    ('Information Technology', 'IT'),
    ('Mechanical Engineering', 'Mechanical Engineering');

-- Insert Clubs
INSERT INTO public.clubs (name, is_japanese_only) VALUES
    ('Google Club', FALSE),
    ('Mobile App Club', FALSE),
    ('Unstop Igniters', FALSE),
    ('IEEE Chapter', FALSE),
    ('EWB Club', FALSE),
    ('Sustainable Engineers', FALSE),
    ('Innovators Forum', FALSE),
    ('IoT Club', FALSE),
    ('Communication Club', FALSE),
    ('Japanese Club', TRUE);

-- Helper block to populate capacities based on the exact matrix
DO $$
DECLARE
    d_aids UUID; d_aiml UUID; d_civil UUID; d_csbs UUID; d_cse UUID; 
    d_eee UUID; d_ece UUID; d_vlsi UUID; d_it UUID; d_mech UUID;
    
    c_google UUID; c_mobile UUID; c_unstop UUID; c_ieee UUID; c_ewb UUID; 
    c_sustainable UUID; c_innovators UUID; c_iot UUID; c_comm UUID; c_japan UUID;
BEGIN
    SELECT id INTO d_aids FROM public.departments WHERE short_name = 'AI & DS';
    SELECT id INTO d_aiml FROM public.departments WHERE short_name = 'AI & ML';
    SELECT id INTO d_civil FROM public.departments WHERE short_name = 'Civil Engineering';
    SELECT id INTO d_csbs FROM public.departments WHERE short_name = 'CSBS';
    SELECT id INTO d_cse FROM public.departments WHERE short_name = 'CSE';
    SELECT id INTO d_eee FROM public.departments WHERE short_name = 'EEE';
    SELECT id INTO d_ece FROM public.departments WHERE short_name = 'ECE';
    SELECT id INTO d_vlsi FROM public.departments WHERE short_name = 'VLSI';
    SELECT id INTO d_it FROM public.departments WHERE short_name = 'IT';
    SELECT id INTO d_mech FROM public.departments WHERE short_name = 'Mechanical Engineering';
    
    SELECT id INTO c_google FROM public.clubs WHERE name = 'Google Club';
    SELECT id INTO c_mobile FROM public.clubs WHERE name = 'Mobile App Club';
    SELECT id INTO c_unstop FROM public.clubs WHERE name = 'Unstop Igniters';
    SELECT id INTO c_ieee FROM public.clubs WHERE name = 'IEEE Chapter';
    SELECT id INTO c_ewb FROM public.clubs WHERE name = 'EWB Club';
    SELECT id INTO c_sustainable FROM public.clubs WHERE name = 'Sustainable Engineers';
    SELECT id INTO c_innovators FROM public.clubs WHERE name = 'Innovators Forum';
    SELECT id INTO c_iot FROM public.clubs WHERE name = 'IoT Club';
    SELECT id INTO c_comm FROM public.clubs WHERE name = 'Communication Club';
    SELECT id INTO c_japan FROM public.clubs WHERE name = 'Japanese Club';

    -- Google Club Capacities
    INSERT INTO public.club_department_capacities (department_id, club_id, capacity) VALUES 
    (d_aids, c_google, 13), (d_aiml, c_google, 11), (d_civil, c_google, 4), (d_csbs, c_google, 10), (d_cse, c_google, 42), (d_eee, c_google, 7), (d_ece, c_google, 30), (d_vlsi, c_google, 6), (d_it, c_google, 23), (d_mech, c_google, 4);

    -- Mobile App Club Capacities
    INSERT INTO public.club_department_capacities (department_id, club_id, capacity) VALUES 
    (d_aids, c_mobile, 17), (d_aiml, c_mobile, 11), (d_civil, c_mobile, 4), (d_csbs, c_mobile, 11), (d_cse, c_mobile, 45), (d_eee, c_mobile, 8), (d_ece, c_mobile, 20), (d_vlsi, c_mobile, 4), (d_it, c_mobile, 26), (d_mech, c_mobile, 4);

    -- Unstop Igniters Capacities
    INSERT INTO public.club_department_capacities (department_id, club_id, capacity) VALUES 
    (d_aids, c_unstop, 17), (d_aiml, c_unstop, 11), (d_civil, c_unstop, 5), (d_csbs, c_unstop, 11), (d_cse, c_unstop, 36), (d_eee, c_unstop, 11), (d_ece, c_unstop, 27), (d_vlsi, c_unstop, 7), (d_it, c_unstop, 20), (d_mech, c_unstop, 5);

    -- IEEE Chapter Capacities
    INSERT INTO public.club_department_capacities (department_id, club_id, capacity) VALUES 
    (d_aids, c_ieee, 11), (d_aiml, c_ieee, 7), (d_civil, c_ieee, 4), (d_csbs, c_ieee, 7), (d_cse, c_ieee, 26), (d_eee, c_ieee, 21), (d_ece, c_ieee, 48), (d_vlsi, c_ieee, 11), (d_it, c_ieee, 11), (d_mech, c_ieee, 4);

    -- EWB Club Capacities
    INSERT INTO public.club_department_capacities (department_id, club_id, capacity) VALUES 
    (d_aids, c_ewb, 10), (d_aiml, c_ewb, 7), (d_civil, c_ewb, 14), (d_csbs, c_ewb, 7), (d_cse, c_ewb, 23), (d_eee, c_ewb, 23), (d_ece, c_ewb, 35), (d_vlsi, c_ewb, 7), (d_it, c_ewb, 10), (d_mech, c_ewb, 14);

    -- Sustainable Engineers Capacities
    INSERT INTO public.club_department_capacities (department_id, club_id, capacity) VALUES 
    (d_aids, c_sustainable, 11), (d_aiml, c_sustainable, 7), (d_civil, c_sustainable, 15), (d_csbs, c_sustainable, 7), (d_cse, c_sustainable, 17), (d_eee, c_sustainable, 30), (d_ece, c_sustainable, 29), (d_vlsi, c_sustainable, 7), (d_it, c_sustainable, 11), (d_mech, c_sustainable, 16);

    -- Innovators Forum Capacities
    INSERT INTO public.club_department_capacities (department_id, club_id, capacity) VALUES 
    (d_aids, c_innovators, 14), (d_aiml, c_innovators, 10), (d_civil, c_innovators, 8), (d_csbs, c_innovators, 10), (d_cse, c_innovators, 29), (d_eee, c_innovators, 13), (d_ece, c_innovators, 34), (d_vlsi, c_innovators, 10), (d_it, c_innovators, 14), (d_mech, c_innovators, 8);

    -- IoT Club Capacities
    INSERT INTO public.club_department_capacities (department_id, club_id, capacity) VALUES 
    (d_aids, c_iot, 11), (d_aiml, c_iot, 10), (d_civil, c_iot, 4), (d_csbs, c_iot, 7), (d_cse, c_iot, 23), (d_eee, c_iot, 17), (d_ece, c_iot, 45), (d_vlsi, c_iot, 13), (d_it, c_iot, 13), (d_mech, c_iot, 7);

    -- Communication Club Capacities
    INSERT INTO public.club_department_capacities (department_id, club_id, capacity) VALUES 
    (d_aids, c_comm, 13), (d_aiml, c_comm, 10), (d_civil, c_comm, 8), (d_csbs, c_comm, 11), (d_cse, c_comm, 23), (d_eee, c_comm, 13), (d_ece, c_comm, 43), (d_vlsi, c_comm, 8), (d_it, c_comm, 13), (d_mech, c_comm, 8);

    -- Japanese Club Capacities
    -- Configurable: Set to a high number or initially 0 until configured
    INSERT INTO public.club_department_capacities (department_id, club_id, capacity) VALUES 
    (d_aids, c_japan, 0), (d_aiml, c_japan, 0), (d_civil, c_japan, 0), (d_csbs, c_japan, 0), (d_cse, c_japan, 0), (d_eee, c_japan, 0), (d_ece, c_japan, 0), (d_vlsi, c_japan, 0), (d_it, c_japan, 0), (d_mech, c_japan, 0);

END $$;

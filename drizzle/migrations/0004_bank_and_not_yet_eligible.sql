DROP FUNCTION IF EXISTS public.izf_submit_registration(uuid, text, text, text, text, text, text, text);
DROP FUNCTION IF EXISTS public.izf_update_bank_details(uuid, text, text);

ALTER TABLE public.registrations ALTER COLUMN eligible_student_id DROP NOT NULL;

ALTER TABLE public.registrations
  ADD COLUMN IF NOT EXISTS bank_name text,
  ADD COLUMN IF NOT EXISTS bank_account_name text,
  ADD COLUMN IF NOT EXISTS bank_account_number text,
  ADD COLUMN IF NOT EXISTS eligibility_status text NOT NULL DEFAULT 'eligible';

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid = 'public.registrations'::regclass AND conname = 'registrations_eligibility_status_check') THEN
    ALTER TABLE public.registrations ADD CONSTRAINT registrations_eligibility_status_check CHECK (eligibility_status IN ('eligible', 'not_yet_eligible'));
  END IF;
END $$;

CREATE OR REPLACE FUNCTION public.izf_submit_registration(
  _eligible_student_id uuid, _first_name text, _middle_name text, _surname text, _pan text,
  _reg_number text, _year text, _programme text, _bank_name text, _bank_account_name text, _bank_account_number text)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE st eligible_students%ROWTYPE; nreg text; bnum text; bname text;
BEGIN
  nreg := upper(regexp_replace(coalesce(_reg_number, ''), '\s+', '', 'g'));
  bnum := trim(coalesce(_bank_account_number, ''));
  bname := trim(coalesce(_bank_account_name, ''));
  IF coalesce(trim(_first_name), '') = '' OR coalesce(trim(_surname), '') = '' OR length(nreg) < 1
     OR coalesce(trim(_year), '') = '' OR length(trim(coalesce(_programme, ''))) < 2
     OR trim(coalesce(_bank_name, '')) = '' OR bnum = '' OR bname = '' THEN
    RETURN jsonb_build_object('ok', false, 'error', 'Please fill in all required fields.');
  END IF;
  IF trim(coalesce(_pan, '')) !~ '^[0-9]{12}$' THEN
    RETURN jsonb_build_object('ok', false, 'error', 'Personal Account Number must be exactly 12 digits (numbers only).');
  END IF;
  IF bnum !~ '^[0-9]+$' THEN
    RETURN jsonb_build_object('ok', false, 'error', 'Account Number must contain digits only.');
  END IF;
  IF _eligible_student_id IS NOT NULL THEN
    SELECT * INTO st FROM eligible_students WHERE id = _eligible_student_id;
    IF NOT FOUND THEN RETURN jsonb_build_object('ok', false, 'error', 'Student is not on the eligible list.'); END IF;
    IF st.reg_number IS NOT NULL AND upper(regexp_replace(st.reg_number, '\s+', '', 'g')) <> nreg THEN
      RETURN jsonb_build_object('ok', false, 'error', 'Registration Number does not match our records.');
    END IF;
    IF EXISTS (SELECT 1 FROM registrations WHERE eligible_student_id = st.id) THEN
      RETURN jsonb_build_object('ok', false, 'error', 'This student has already submitted.');
    END IF;
    INSERT INTO registrations (eligible_student_id, first_name, middle_name, surname, personal_account_number, reg_number, year_of_study, programme, bank_name, bank_account_name, bank_account_number, eligibility_status)
    VALUES (st.id, trim(_first_name), nullif(trim(coalesce(_middle_name, '')), ''), trim(_surname), trim(_pan), nreg, trim(_year),
      coalesce(nullif(st.programme, ''), trim(_programme)), trim(_bank_name), bname, bnum, 'eligible');
  ELSE
    INSERT INTO registrations (eligible_student_id, first_name, middle_name, surname, personal_account_number, reg_number, year_of_study, programme, bank_name, bank_account_name, bank_account_number, eligibility_status)
    VALUES (NULL, trim(_first_name), nullif(trim(coalesce(_middle_name, '')), ''), trim(_surname), trim(_pan), nreg, trim(_year),
      trim(_programme), trim(_bank_name), bname, bnum, 'not_yet_eligible');
  END IF;
  RETURN jsonb_build_object('ok', true);
EXCEPTION WHEN unique_violation THEN
  RETURN jsonb_build_object('ok', false, 'error', 'This student has already submitted.');
END; $$;

CREATE OR REPLACE FUNCTION public.izf_update_bank_details(_eligible_student_id uuid, _bank_name text, _bank_account_name text, _bank_account_number text)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF trim(coalesce(_bank_name, '')) = '' OR trim(coalesce(_bank_account_name, '')) = '' OR trim(coalesce(_bank_account_number, '')) = '' THEN
    RETURN jsonb_build_object('ok', false, 'error', 'Please provide bank name, account name and account number.');
  END IF;
  IF trim(_bank_account_number) !~ '^[0-9]+$' THEN
    RETURN jsonb_build_object('ok', false, 'error', 'Account Number must contain digits only.');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM registrations WHERE eligible_student_id = _eligible_student_id) THEN
    RETURN jsonb_build_object('ok', false, 'error', 'Submitted student record not found.');
  END IF;
  UPDATE registrations SET bank_name = trim(_bank_name), bank_account_name = trim(_bank_account_name), bank_account_number = trim(_bank_account_number)
  WHERE eligible_student_id = _eligible_student_id;
  RETURN jsonb_build_object('ok', true);
END; $$;

CREATE OR REPLACE FUNCTION public.izf_admin_list(_token text)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  PERFORM izf_check_admin(_token);
  RETURN jsonb_build_object(
    'eligible', coalesce((SELECT jsonb_agg(to_jsonb(s) || jsonb_build_object('registration',
        (SELECT to_jsonb(r) FROM registrations r WHERE r.eligible_student_id = s.id LIMIT 1))
        ORDER BY s.sn NULLS LAST, s.full_name) FROM eligible_students s), '[]'::jsonb),
    'not_yet_eligible', coalesce((SELECT jsonb_agg(jsonb_build_object(
        'id', r.id, 'eligible_student_id', NULL, 'sn', NULL,
        'full_name', concat_ws(' ', r.first_name, r.middle_name, r.surname),
        'reg_number', r.reg_number, 'programme', r.programme, 'institution', 'UNIMA',
        'created_at', r.created_at, 'updated_at', r.created_at,
        'registration', to_jsonb(r), 'not_yet_eligible', true) ORDER BY r.created_at DESC)
      FROM registrations r WHERE r.eligible_student_id IS NULL), '[]'::jsonb));
END; $$;

GRANT EXECUTE ON FUNCTION public.izf_submit_registration(uuid, text, text, text, text, text, text, text, text, text, text) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.izf_update_bank_details(uuid, text, text, text) TO anon, authenticated;
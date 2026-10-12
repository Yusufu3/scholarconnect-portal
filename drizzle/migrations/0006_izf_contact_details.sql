ALTER TABLE public.registrations
  ADD COLUMN IF NOT EXISTS contact_phone text,
  ADD COLUMN IF NOT EXISTS contact_email text,
  ADD COLUMN IF NOT EXISTS national_id text,
  ADD COLUMN IF NOT EXISTS father_national_id text,
  ADD COLUMN IF NOT EXISTS mother_national_id text,
  ADD COLUMN IF NOT EXISTS gender text;

CREATE OR REPLACE FUNCTION public.izf_update_contact_details(
  _eligible_student_id uuid, _phone text, _email text, _national_id text,
  _father_id text, _mother_id text, _gender text)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE n int;
BEGIN
  IF coalesce(trim(_phone),'') !~ '^\+?[0-9 ]{7,20}$' THEN RETURN jsonb_build_object('ok',false,'error','Enter a valid contact number.'); END IF;
  IF coalesce(trim(_email),'') !~ '^[^@\s]+@[^@\s]+\.[^@\s]+$' OR length(_email) > 255 THEN RETURN jsonb_build_object('ok',false,'error','Enter a valid email address.'); END IF;
  IF coalesce(trim(_national_id),'') = '' OR coalesce(trim(_father_id),'') = '' OR coalesce(trim(_mother_id),'') = '' THEN RETURN jsonb_build_object('ok',false,'error','All National ID fields are required.'); END IF;
  IF length(_national_id) > 30 OR length(_father_id) > 30 OR length(_mother_id) > 30 THEN RETURN jsonb_build_object('ok',false,'error','National ID is too long.'); END IF;
  IF _gender NOT IN ('F','M') THEN RETURN jsonb_build_object('ok',false,'error','Select gender F or M.'); END IF;
  UPDATE registrations SET contact_phone = trim(_phone), contact_email = lower(trim(_email)),
    national_id = upper(trim(_national_id)), father_national_id = upper(trim(_father_id)),
    mother_national_id = upper(trim(_mother_id)), gender = _gender
  WHERE eligible_student_id = _eligible_student_id;
  GET DIAGNOSTICS n = ROW_COUNT;
  IF n = 0 THEN RETURN jsonb_build_object('ok',false,'error','Only students who have already submitted can update these details.'); END IF;
  RETURN jsonb_build_object('ok',true);
END $$;
REVOKE ALL ON FUNCTION public.izf_update_contact_details(uuid,text,text,text,text,text,text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.izf_update_contact_details(uuid,text,text,text,text,text,text) TO anon, authenticated;
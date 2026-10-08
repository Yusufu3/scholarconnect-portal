-- Allow an administrator to promote a submitted Not Yet Eligible application into the official eligible list.

CREATE OR REPLACE FUNCTION public.izf_promote_not_yet_eligible(
  _token text,
  _registration_id uuid,
  _eligible_student_id uuid
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  r registrations%ROWTYPE;
  s eligible_students%ROWTYPE;
BEGIN
  PERFORM izf_check_admin(_token);

  SELECT * INTO r
  FROM registrations
  WHERE id = _registration_id
    AND eligible_student_id IS NULL
    AND eligibility_status = 'not_yet_eligible';

  IF NOT FOUND THEN
    RETURN jsonb_build_object('ok', false, 'error', 'Not Yet Eligible application not found.');
  END IF;

  SELECT * INTO s FROM eligible_students WHERE id = _eligible_student_id;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('ok', false, 'error', 'Eligible student record not found.');
  END IF;

  IF EXISTS (SELECT 1 FROM registrations WHERE eligible_student_id = s.id) THEN
    RETURN jsonb_build_object('ok', false, 'error', 'That eligible student already has a submitted application.');
  END IF;

  IF s.reg_number IS NOT NULL
     AND trim(s.reg_number) <> ''
     AND upper(regexp_replace(s.reg_number, '\s+', '', 'g'))
         <> upper(regexp_replace(r.reg_number, '\s+', '', 'g')) THEN
    RETURN jsonb_build_object('ok', false, 'error', 'Registration Number does not match the selected eligible record.');
  END IF;

  UPDATE registrations
  SET eligible_student_id = s.id,
      eligibility_status = 'eligible',
      programme = coalesce(nullif(s.programme, ''), programme)
  WHERE id = r.id;

  RETURN jsonb_build_object('ok', true);
EXCEPTION
  WHEN unique_violation THEN
    RETURN jsonb_build_object('ok', false, 'error', 'That eligible student already has a submitted application.');
END;
$$;

GRANT EXECUTE ON FUNCTION public.izf_promote_not_yet_eligible(text, uuid, uuid) TO anon, authenticated;

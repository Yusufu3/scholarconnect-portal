CREATE OR REPLACE FUNCTION public.izf_promote_not_yet_eligible(_token text, _registration_id uuid, _eligible_student_id uuid)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE r registrations%ROWTYPE; s eligible_students%ROWTYPE; new_sn integer;
BEGIN
  PERFORM izf_check_admin(_token);
  SELECT * INTO r FROM registrations WHERE id = _registration_id AND eligible_student_id IS NULL;
  IF NOT FOUND THEN RETURN jsonb_build_object('ok', false, 'error', 'Not Yet Eligible application not found.'); END IF;
  IF _eligible_student_id IS NULL THEN
    SELECT coalesce(max(sn), 0) + 1 INTO new_sn FROM eligible_students;
    INSERT INTO eligible_students (sn, full_name, reg_number, programme, institution)
    VALUES (new_sn, concat_ws(' ', r.first_name, r.middle_name, r.surname), r.reg_number, r.programme, 'UNIMA')
    RETURNING * INTO s;
  ELSE
    SELECT * INTO s FROM eligible_students WHERE id = _eligible_student_id;
    IF NOT FOUND THEN RETURN jsonb_build_object('ok', false, 'error', 'Eligible student record not found.'); END IF;
    IF EXISTS (SELECT 1 FROM registrations WHERE eligible_student_id = s.id) THEN
      RETURN jsonb_build_object('ok', false, 'error', 'That eligible student already has a submitted application.');
    END IF;
  END IF;
  UPDATE registrations SET eligible_student_id = s.id, eligibility_status = 'eligible',
    programme = coalesce(nullif(s.programme, ''), programme)
  WHERE id = r.id;
  RETURN jsonb_build_object('ok', true);
EXCEPTION WHEN unique_violation THEN
  RETURN jsonb_build_object('ok', false, 'error', 'That eligible student already has a submitted application.');
END; $$;
GRANT EXECUTE ON FUNCTION public.izf_promote_not_yet_eligible(text, uuid, uuid) TO anon, authenticated;
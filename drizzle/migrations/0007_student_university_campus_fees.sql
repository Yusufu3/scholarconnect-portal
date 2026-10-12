ALTER TABLE public.eligible_students
  ADD COLUMN IF NOT EXISTS university text NOT NULL DEFAULT 'UNIMA',
  ADD COLUMN IF NOT EXISTS campus text NOT NULL DEFAULT 'Zomba Main Campus',
  ADD COLUMN IF NOT EXISTS semester integer NOT NULL DEFAULT 1,
  ADD COLUMN IF NOT EXISTS required_fees_mwk numeric(14,2) NOT NULL DEFAULT 1300000,
  ADD COLUMN IF NOT EXISTS expected_finish_year integer,
  ADD COLUMN IF NOT EXISTS status text NOT NULL DEFAULT 'Active';
UPDATE public.eligible_students SET university = institution WHERE institution IS NOT NULL;
COMMENT ON COLUMN public.eligible_students.institution IS 'DEPRECATED: replaced by university (kept in sync)';

CREATE OR REPLACE FUNCTION public.izf_admin_save_student(_token text, _id uuid, _sn int, _full_name text,
  _reg_number text, _programme text, _university text, _campus text, _semester int,
  _required_fees numeric, _expected_finish_year int, _status text) RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE u text := coalesce(nullif(trim(_university), ''), 'UNIMA');
BEGIN
  PERFORM izf_check_admin(_token);
  IF _id IS NULL THEN
    INSERT INTO eligible_students (sn, full_name, reg_number, programme, institution, university, campus, semester, required_fees_mwk, expected_finish_year, status)
    VALUES (_sn, _full_name, nullif(_reg_number, ''), nullif(_programme, ''), u, u,
      coalesce(nullif(trim(_campus), ''), 'Zomba Main Campus'), coalesce(_semester, 1),
      coalesce(_required_fees, 1300000), _expected_finish_year, coalesce(nullif(trim(_status), ''), 'Active'));
  ELSE
    UPDATE eligible_students SET sn = _sn, full_name = _full_name, reg_number = nullif(_reg_number, ''),
      programme = nullif(_programme, ''), institution = u, university = u,
      campus = coalesce(nullif(trim(_campus), ''), 'Zomba Main Campus'), semester = coalesce(_semester, 1),
      required_fees_mwk = coalesce(_required_fees, 1300000), expected_finish_year = _expected_finish_year,
      status = coalesce(nullif(trim(_status), ''), 'Active'), updated_at = now()
    WHERE id = _id;
  END IF;
END $$;
GRANT EXECUTE ON FUNCTION public.izf_admin_save_student(text, uuid, int, text, text, text, text, text, int, numeric, int, text) TO anon, authenticated;
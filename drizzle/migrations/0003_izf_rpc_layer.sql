CREATE EXTENSION IF NOT EXISTS pgcrypto WITH SCHEMA extensions;

CREATE TABLE public.admin_config (
  id int PRIMARY KEY DEFAULT 1 CHECK (id = 1),
  password_hash text NOT NULL
);
GRANT ALL ON public.admin_config TO service_role;
ALTER TABLE public.admin_config ENABLE ROW LEVEL SECURITY;

CREATE TABLE public.admin_sessions (
  token_hash text PRIMARY KEY,
  expires_at timestamptz NOT NULL
);
GRANT ALL ON public.admin_sessions TO service_role;
ALTER TABLE public.admin_sessions ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.izf_check_admin(_token text) RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, extensions AS $$
BEGIN
  IF _token IS NULL OR NOT EXISTS (
    SELECT 1 FROM admin_sessions
    WHERE token_hash = encode(digest(_token, 'sha256'), 'hex') AND expires_at > now()
  ) THEN
    RAISE EXCEPTION 'Unauthorized';
  END IF;
END $$;
REVOKE ALL ON FUNCTION public.izf_check_admin(text) FROM PUBLIC, anon, authenticated;

CREATE OR REPLACE FUNCTION public.izf_candidates()
RETURNS TABLE(id uuid, full_name text, programme text, registered boolean)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT s.id, s.full_name, s.programme,
         EXISTS (SELECT 1 FROM registrations r WHERE r.eligible_student_id = s.id)
  FROM eligible_students s;
$$;

CREATE OR REPLACE FUNCTION public.izf_submit_registration(
  _eligible_student_id uuid, _first_name text, _middle_name text, _surname text,
  _pan text, _reg_number text, _year text, _programme text)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE st eligible_students%ROWTYPE; nreg text;
BEGIN
  nreg := upper(regexp_replace(coalesce(_reg_number, ''), '\s+', '', 'g'));
  IF coalesce(trim(_first_name), '') = '' OR coalesce(trim(_surname), '') = ''
     OR length(nreg) < 3 OR coalesce(trim(_year), '') = '' OR length(trim(coalesce(_programme, ''))) < 2 THEN
    RETURN jsonb_build_object('ok', false, 'error', 'Please fill in all required fields.');
  END IF;
  IF trim(coalesce(_pan, '')) !~ '^\d{12}$' THEN
    RETURN jsonb_build_object('ok', false, 'error', 'Personal Account Number must be exactly 12 digits (numbers only).');
  END IF;
  SELECT * INTO st FROM eligible_students WHERE id = _eligible_student_id;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('ok', false, 'error', 'Student is not on the eligible list.');
  END IF;
  IF st.reg_number IS NOT NULL AND upper(regexp_replace(st.reg_number, '\s+', '', 'g')) <> nreg THEN
    RETURN jsonb_build_object('ok', false, 'error', 'Registration Number does not match our records.');
  END IF;
  IF EXISTS (SELECT 1 FROM registrations WHERE eligible_student_id = st.id) THEN
    RETURN jsonb_build_object('ok', false, 'error', 'This student has already submitted.');
  END IF;
  INSERT INTO registrations (eligible_student_id, first_name, middle_name, surname,
    personal_account_number, reg_number, year_of_study, programme)
  VALUES (st.id, trim(_first_name), nullif(trim(coalesce(_middle_name, '')), ''), trim(_surname),
    trim(_pan), nreg, trim(_year), coalesce(nullif(st.programme, ''), trim(_programme)));
  RETURN jsonb_build_object('ok', true);
EXCEPTION WHEN unique_violation THEN
  RETURN jsonb_build_object('ok', false, 'error', 'This student has already submitted.');
END $$;

CREATE OR REPLACE FUNCTION public.izf_admin_login(_password text) RETURNS text
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, extensions AS $$
DECLARE h text; t text;
BEGIN
  SELECT password_hash INTO h FROM admin_config WHERE id = 1;
  IF h IS NULL OR crypt(trim(coalesce(_password, '')), h) <> h THEN
    RETURN NULL;
  END IF;
  DELETE FROM admin_sessions WHERE expires_at < now();
  t := encode(gen_random_bytes(32), 'hex');
  INSERT INTO admin_sessions VALUES (encode(digest(t, 'sha256'), 'hex'), now() + interval '8 hours');
  RETURN t;
END $$;

CREATE OR REPLACE FUNCTION public.izf_admin_status(_token text) RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public, extensions AS $$
  SELECT EXISTS (SELECT 1 FROM admin_sessions
    WHERE token_hash = encode(digest(coalesce(_token, ''), 'sha256'), 'hex') AND expires_at > now());
$$;

CREATE OR REPLACE FUNCTION public.izf_admin_list(_token text) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  PERFORM izf_check_admin(_token);
  RETURN coalesce((
    SELECT jsonb_agg(to_jsonb(s) || jsonb_build_object('registration',
      (SELECT to_jsonb(r) FROM registrations r WHERE r.eligible_student_id = s.id LIMIT 1))
      ORDER BY s.sn NULLS LAST, s.full_name)
    FROM eligible_students s), '[]'::jsonb);
END $$;

CREATE OR REPLACE FUNCTION public.izf_admin_create_student(_token text, _sn int, _full_name text,
  _reg_number text, _programme text, _institution text) RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  PERFORM izf_check_admin(_token);
  INSERT INTO eligible_students (sn, full_name, reg_number, programme, institution)
  VALUES (_sn, _full_name, nullif(_reg_number, ''), nullif(_programme, ''), coalesce(nullif(_institution, ''), 'UNIMA'));
END $$;

CREATE OR REPLACE FUNCTION public.izf_admin_update_student(_token text, _id uuid, _sn int, _full_name text,
  _reg_number text, _programme text, _institution text) RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  PERFORM izf_check_admin(_token);
  UPDATE eligible_students SET sn = _sn, full_name = _full_name, reg_number = nullif(_reg_number, ''),
    programme = nullif(_programme, ''), institution = coalesce(nullif(_institution, ''), 'UNIMA'), updated_at = now()
  WHERE id = _id;
END $$;

CREATE OR REPLACE FUNCTION public.izf_admin_delete_student(_token text, _id uuid) RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  PERFORM izf_check_admin(_token);
  DELETE FROM eligible_students WHERE id = _id;
END $$;

CREATE OR REPLACE FUNCTION public.izf_admin_delete_registration(_token text, _id uuid) RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  PERFORM izf_check_admin(_token);
  DELETE FROM registrations WHERE id = _id;
END $$;

GRANT EXECUTE ON FUNCTION public.izf_candidates() TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.izf_submit_registration(uuid, text, text, text, text, text, text, text) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.izf_admin_login(text) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.izf_admin_status(text) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.izf_admin_list(text) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.izf_admin_create_student(text, int, text, text, text, text) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.izf_admin_update_student(text, uuid, int, text, text, text, text) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.izf_admin_delete_student(text, uuid) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.izf_admin_delete_registration(text, uuid) TO anon, authenticated;
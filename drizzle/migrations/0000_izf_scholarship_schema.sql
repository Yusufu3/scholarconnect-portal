CREATE TABLE public.eligible_students (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  sn integer,
  full_name text NOT NULL,
  reg_number text,
  programme text,
  institution text NOT NULL DEFAULT 'UNIMA',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT ALL ON public.eligible_students TO service_role;
ALTER TABLE public.eligible_students ENABLE ROW LEVEL SECURITY;

CREATE TABLE public.registrations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  eligible_student_id uuid NOT NULL UNIQUE REFERENCES public.eligible_students(id) ON DELETE CASCADE,
  first_name text NOT NULL,
  middle_name text,
  surname text NOT NULL,
  personal_account_number text NOT NULL,
  reg_number text NOT NULL,
  year_of_study text NOT NULL,
  programme text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT ALL ON public.registrations TO service_role;
ALTER TABLE public.registrations ENABLE ROW LEVEL SECURITY;

INSERT INTO public.eligible_students (sn, full_name) VALUES
(352,'Abdulatif Adam'),(353,'Aisha Jiya'),(354,'Aisha Mine'),(355,'Aisha Shuga'),(356,'Anisa Chikwanje'),
(357,'Ashraf Ahmad'),(358,'Ashraf Boyd'),(359,'Bright Chabwera'),(360,'Bushiri Adini'),(361,'Daniel Maluwasha'),
(362,'Davie Chiwamba'),(363,'Effort Chindungwa'),(364,'Emma Mdala'),(365,'Faisal Matenje Alie'),(366,'Fareeha Mapoya'),
(367,'Fazilah Mataka'),(368,'Hafeeza Foloko'),(369,'Hajeerah Mbemba'),(370,'Hajrah Jaffar'),(371,'Hamida Mulenga'),
(372,'Hamidah Awazie'),(373,'Haneefah Kwaitana'),(374,'Hanifah Ajawa'),(375,'Hawa Mkwinda'),(376,'James Mwanyali'),
(377,'Jamira Adini'),(378,'Jerald Issa Bakali'),(379,'Joyce Alick'),(380,'Kaizer Chiwale'),(381,'Latifa Umali'),
(382,'Lloyd Kamfutso'),(383,'Lydia Tepani'),(384,'Manuel John'),(385,'Mavuto Raufu Asidi'),(386,'Natasha Rehema Phiri'),
(387,'Patuma Alubi'),(388,'Pauline Banda'),(389,'Rabson Manda'),(390,'Rafick Binusu'),(391,'Rafick Iweni'),
(392,'Rashika Manda'),(393,'Samiyatu Adam'),(394,'Saudah Abdulkareem Stenala'),(395,'Sautso Issah'),(396,'Shahida Thom'),
(397,'Shania Kara'),(398,'Sherrif Abdul Salam'),(399,'Sifat Kalera'),(400,'Sumayyah maulid'),(401,'Swifat Amana'),
(402,'Travor Gulani'),(403,'Trinity Uganda'),(404,'Yackroona London'),(405,'Yasin Saleem'),(406,'Yassin Nkhoma'),
(407,'Yusuf James'),(408,'Yvonne Yasin Issah'),(409,'Zaheer Asufi'),(410,'Zainab Muhammad'),(411,'Zainabu Mussah'),
(412,'Zione Adini');
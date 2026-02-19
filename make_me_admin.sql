-- PROMOTE USER TO ADMIN
-- Replace 'tu_email_aqui@gmail.com' with your actual login email.

UPDATE public.profiles
SET role = 'admin'
WHERE email = 'PON_TU_EMAIL_AQUI';

-- Verify the change
SELECT * FROM public.profiles WHERE role = 'admin';

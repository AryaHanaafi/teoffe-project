-- ==============================================================================
-- TEOFFE ADMIN: Buat Akun Admin Otomatis Langsung Terkonfirmasi
-- Email: admin@teoffe.com
-- Password: teoffegoods
-- ==============================================================================

DO $$
DECLARE
  new_user_id UUID := gen_random_uuid();
  user_email TEXT := 'admin@teoffe.com';
  user_password TEXT := 'teoffegoods';
BEGIN
  -- 1. Jika user sudah pernah terdaftar, update password & langsung konfirmasi
  IF EXISTS (SELECT 1 FROM auth.users WHERE email = user_email) THEN
    UPDATE auth.users 
    SET 
      encrypted_password = crypt(user_password, gen_salt('bf')),
      email_confirmed_at = COALESCE(email_confirmed_at, now()),
      updated_at = now()
    WHERE email = user_email;
    
    RAISE NOTICE 'User % sudah ada, password telah diperbarui menjadi %', user_email, user_password;
  ELSE
    -- 2. Buat akun baru di auth.users dengan status email langsung terkonfirmasi (email_confirmed_at = now())
    INSERT INTO auth.users (
      instance_id,
      id,
      aud,
      role,
      email,
      encrypted_password,
      email_confirmed_at,
      recovery_sent_at,
      last_sign_in_at,
      raw_app_meta_data,
      raw_user_meta_data,
      created_at,
      updated_at,
      confirmation_token,
      email_change,
      email_change_token_new,
      recovery_token
    ) VALUES (
      '00000000-0000-0000-0000-000000000000',
      new_user_id,
      'authenticated',
      'authenticated',
      user_email,
      crypt(user_password, gen_salt('bf')),
      now(),
      now(),
      now(),
      '{"provider":"email","providers":["email"]}'::jsonb,
      '{"name":"Admin TEOFFE"}'::jsonb,
      now(),
      now(),
      '',
      '',
      '',
      ''
    );

    -- 3. Daftarkan identity provider email agar Supabase Auth mengizinkan login
    INSERT INTO auth.identities (
      id,
      user_id,
      identity_data,
      provider,
      provider_id,
      last_sign_in_at,
      created_at,
      updated_at
    ) VALUES (
      new_user_id,
      new_user_id,
      format('{"sub":"%s","email":"%s"}', new_user_id, user_email)::jsonb,
      'email',
      user_email,
      now(),
      now(),
      now()
    );

    RAISE NOTICE 'User % berhasil dibuat dengan password %', user_email, user_password;
  END IF;
END $$;

-- Create a test publisher account
INSERT INTO publishers (
  email,
  password_hash,
  name,
  company_name,
  status,
  created_at,
  updated_at
) VALUES (
  'testpublisher@example.com',
  '$2a$10$YourHashedPasswordHere', -- This needs to be a proper bcrypt hash
  'Test Publisher',
  'Test Publishing Co',
  'active',
  NOW(),
  NOW()
) ON CONFLICT (email) DO NOTHING;

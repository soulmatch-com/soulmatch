-- Seed initial admin users
-- Run this AFTER creating the admins table
-- Password hashes are for: 'admin123' and 'moderator123'
-- Generated using bcrypt with salt rounds 10

-- Note: Replace these with your actual password hashes
-- You can generate them using: bcrypt.hash('yourpassword', 10)

-- Super Admin (email: admin@soulmatch.com, password: admin123)
INSERT INTO admins (email, password_hash, name, role)
VALUES (
  'admin@soulmatch.com',
  '$2a$10$XYZ...', -- Replace with actual bcrypt hash
  'Super Admin',
  'super_admin'
)
ON CONFLICT (email) DO NOTHING;

-- Moderator (email: moderator@soulmatch.com, password: moderator123)
INSERT INTO admins (email, password_hash, name, role)
VALUES (
  'moderator@soulmatch.com',
  '$2a$10$ABC...', -- Replace with actual bcrypt hash
  'Moderator',
  'moderator'
)
ON CONFLICT (email) DO NOTHING;

-- Regular Admin (email: john@soulmatch.com, password: admin123)
INSERT INTO admins (email, password_hash, name, role)
VALUES (
  'john@soulmatch.com',
  '$2a$10$XYZ...', -- Replace with actual bcrypt hash
  'John Doe',
  'admin'
)
ON CONFLICT (email) DO NOTHING;

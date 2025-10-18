-- Add professional and salary information fields
ALTER TABLE profiles
ADD COLUMN IF NOT EXISTS education TEXT,
ADD COLUMN IF NOT EXISTS occupation TEXT,
ADD COLUMN IF NOT EXISTS company_name TEXT,
ADD COLUMN IF NOT EXISTS annual_income DECIMAL(12, 2),
ADD COLUMN IF NOT EXISTS income_currency VARCHAR(3) DEFAULT 'INR',
ADD COLUMN IF NOT EXISTS employment_type VARCHAR(50),
ADD COLUMN IF NOT EXISTS work_location TEXT;

-- Add family information fields
ALTER TABLE profiles
ADD COLUMN IF NOT EXISTS father_name TEXT,
ADD COLUMN IF NOT EXISTS father_occupation TEXT,
ADD COLUMN IF NOT EXISTS mother_name TEXT,
ADD COLUMN IF NOT EXISTS mother_occupation TEXT,
ADD COLUMN IF NOT EXISTS family_type VARCHAR(20),
ADD COLUMN IF NOT EXISTS family_status VARCHAR(20),
ADD COLUMN IF NOT EXISTS family_values VARCHAR(20);

-- Add sibling information fields
ALTER TABLE profiles
ADD COLUMN IF NOT EXISTS total_siblings INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS brothers_married INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS brothers_unmarried INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS sisters_married INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS sisters_unmarried INTEGER DEFAULT 0;

-- Add comment for documentation
COMMENT ON COLUMN profiles.education IS 'Highest education qualification';
COMMENT ON COLUMN profiles.occupation IS 'Current occupation/profession';
COMMENT ON COLUMN profiles.annual_income IS 'Annual income in specified currency';
COMMENT ON COLUMN profiles.employment_type IS 'Type of employment (full-time, part-time, self-employed, business, etc.)';
COMMENT ON COLUMN profiles.family_type IS 'Type of family (nuclear, joint, extended)';
COMMENT ON COLUMN profiles.family_status IS 'Economic status of family (lower_middle, middle, upper_middle, rich)';
COMMENT ON COLUMN profiles.family_values IS 'Family values (traditional, moderate, liberal)';

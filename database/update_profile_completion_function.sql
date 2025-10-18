-- Update function to calculate profile completion percentage with new fields
CREATE OR REPLACE FUNCTION calculate_profile_completion(profile_row profiles)
RETURNS INTEGER AS $$
DECLARE
  total_fields INTEGER := 30;  -- Updated total field count
  filled_fields INTEGER := 0;
BEGIN
  -- Required/Basic fields (8 fields)
  IF profile_row.first_name IS NOT NULL THEN filled_fields := filled_fields + 1; END IF;
  IF profile_row.last_name IS NOT NULL THEN filled_fields := filled_fields + 1; END IF;
  IF profile_row.date_of_birth IS NOT NULL THEN filled_fields := filled_fields + 1; END IF;
  IF profile_row.gender IS NOT NULL THEN filled_fields := filled_fields + 1; END IF;
  IF profile_row.marital_status IS NOT NULL THEN filled_fields := filled_fields + 1; END IF;
  IF profile_row.city IS NOT NULL THEN filled_fields := filled_fields + 1; END IF;
  IF profile_row.state IS NOT NULL THEN filled_fields := filled_fields + 1; END IF;
  IF profile_row.profile_photo_url IS NOT NULL THEN filled_fields := filled_fields + 1; END IF;

  -- Cultural fields (3 fields)
  IF profile_row.religion IS NOT NULL THEN filled_fields := filled_fields + 1; END IF;
  IF profile_row.caste IS NOT NULL THEN filled_fields := filled_fields + 1; END IF;
  IF profile_row.mother_tongue IS NOT NULL THEN filled_fields := filled_fields + 1; END IF;

  -- Physical attributes (3 fields)
  IF profile_row.height_cm IS NOT NULL THEN filled_fields := filled_fields + 1; END IF;
  IF profile_row.weight_kg IS NOT NULL THEN filled_fields := filled_fields + 1; END IF;
  IF profile_row.complexion IS NOT NULL THEN filled_fields := filled_fields + 1; END IF;

  -- Professional information (5 fields)
  IF profile_row.education IS NOT NULL THEN filled_fields := filled_fields + 1; END IF;
  IF profile_row.occupation IS NOT NULL THEN filled_fields := filled_fields + 1; END IF;
  IF profile_row.company_name IS NOT NULL THEN filled_fields := filled_fields + 1; END IF;
  IF profile_row.annual_income IS NOT NULL THEN filled_fields := filled_fields + 1; END IF;
  IF profile_row.employment_type IS NOT NULL THEN filled_fields := filled_fields + 1; END IF;

  -- Family information (6 fields)
  IF profile_row.father_name IS NOT NULL THEN filled_fields := filled_fields + 1; END IF;
  IF profile_row.father_occupation IS NOT NULL THEN filled_fields := filled_fields + 1; END IF;
  IF profile_row.mother_name IS NOT NULL THEN filled_fields := filled_fields + 1; END IF;
  IF profile_row.mother_occupation IS NOT NULL THEN filled_fields := filled_fields + 1; END IF;
  IF profile_row.family_type IS NOT NULL THEN filled_fields := filled_fields + 1; END IF;
  IF profile_row.family_values IS NOT NULL THEN filled_fields := filled_fields + 1; END IF;

  -- Sibling information (1 field - just check if total_siblings is set)
  IF profile_row.total_siblings IS NOT NULL THEN filled_fields := filled_fields + 1; END IF;

  -- Other optional fields (3 fields)
  IF profile_row.about_me IS NOT NULL THEN filled_fields := filled_fields + 1; END IF;
  IF profile_row.hobbies IS NOT NULL AND array_length(profile_row.hobbies, 1) > 0 THEN filled_fields := filled_fields + 1; END IF;
  IF profile_row.blood_group IS NOT NULL THEN filled_fields := filled_fields + 1; END IF;

  RETURN (filled_fields * 100) / total_fields;
END;
$$ LANGUAGE plpgsql;

-- The trigger will automatically use this updated function
-- No need to recreate the trigger as it references the function by name

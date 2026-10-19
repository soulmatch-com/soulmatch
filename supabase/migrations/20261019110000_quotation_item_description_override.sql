ALTER TABLE public.quotation_items
  ADD COLUMN IF NOT EXISTS description_override TEXT
    CHECK (description_override IS NULL OR char_length(description_override) <= 1000);

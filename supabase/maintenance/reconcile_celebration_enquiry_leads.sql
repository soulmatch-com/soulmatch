-- Safe, repeatable maintenance script for enquiries created before Phase 1.
-- Review the SELECT below first, then run the INSERT in an approved environment.

SELECT enquiry.id, enquiry.enquiry_reference, enquiry.created_at
FROM public.celebration_enquiries AS enquiry
LEFT JOIN public.leads AS lead ON lead.celebration_enquiry_id = enquiry.id
WHERE lead.id IS NULL
ORDER BY enquiry.created_at;

INSERT INTO public.leads (
  celebration_enquiry_id, source, status, contact_name, mobile, email,
  requirement_summary, event_date, event_type, event_session, total_members
)
SELECT
  enquiry.id, 'website', 'new', enquiry.contact_name, enquiry.mobile, enquiry.email,
  COALESCE(NULLIF(enquiry.other_service_details, ''), NULLIF(enquiry.special_requirements, ''), NULLIF(enquiry.notes, '')),
  enquiry.preferred_date,
  CASE WHEN enquiry.celebration_type IN ('60th-marriage', '70th-marriage', '80th-marriage') THEN enquiry.celebration_type ELSE NULL END,
  enquiry.ceremony_duration, enquiry.expected_guest_count
FROM public.celebration_enquiries AS enquiry
LEFT JOIN public.leads AS lead ON lead.celebration_enquiry_id = enquiry.id
WHERE lead.id IS NULL
ON CONFLICT (celebration_enquiry_id) DO NOTHING;

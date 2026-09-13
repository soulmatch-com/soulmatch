const fakeNumberPatterns = [/1234567890/, /9999999999/, /0000000000/]
const e164Pattern = /^\+[1-9]\d{7,14}$/
const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

function clean(value: string | undefined) {
  const trimmed = value?.trim()
  return trimmed || undefined
}

function validE164(value: string | undefined) {
  const normalized = clean(value)
  if (!normalized || !e164Pattern.test(normalized)) return undefined
  return fakeNumberPatterns.some((pattern) => pattern.test(normalized)) ? undefined : normalized
}

function validEmail(value: string | undefined) {
  const normalized = clean(value)
  return normalized && emailPattern.test(normalized) ? normalized : undefined
}

function displayPhone(value: string | undefined) {
  return value?.replace(/^\+91(\d{5})(\d{5})$/, '+91 $1 $2')
}

export const businessContact = {
  phoneE164: validE164(process.env.NEXT_PUBLIC_MYTHIRUMANAM_PHONE_E164),
  whatsappE164: validE164(process.env.NEXT_PUBLIC_MYTHIRUMANAM_WHATSAPP_E164),
  bookingsEmail: validEmail(process.env.NEXT_PUBLIC_MYTHIRUMANAM_CONTACT_EMAIL),
}

export const businessContactLinks = {
  phoneDisplay: displayPhone(businessContact.phoneE164),
  callHref: businessContact.phoneE164 ? `tel:${businessContact.phoneE164}` : undefined,
  whatsappHref: businessContact.whatsappE164
    ? `https://wa.me/${businessContact.whatsappE164.replace('+', '')}?text=${encodeURIComponent('Hello MyThirumanam, I would like help planning a Thirukadaiyur celebration.')}`
    : undefined,
}

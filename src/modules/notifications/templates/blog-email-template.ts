type BlogEmailSnapshot = { locale: 'en' | 'ta'; subject: string; preheader: string | null; headline: string; summary: string | null; targetUrl: string }

const escapeHtml = (value: string) => value.replace(/[&<>'"]/g, (character) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' })[character]!)

export function renderBlogPublicationEmail(snapshot: BlogEmailSnapshot, unsubscribeUrl: string) {
  if (!unsubscribeUrl) throw new Error('An unsubscribe URL is required for campaign delivery.')
  const tamil = snapshot.locale === 'ta'
  const copy = tamil
    ? { label: 'புதிய வழிகாட்டி', read: 'முழு வழிகாட்டியை படிக்கவும்', planning: 'உங்கள் திருக்கடையூர் விழாவை திட்டமிடுங்கள்', prompt: 'உங்கள் விழாவை திட்டமிடுகிறீர்களா?', footer: 'சுயாதீன விழா திட்டமிடல் மற்றும் ஒருங்கிணைப்பு சேவை.', unsubscribe: 'மின்னஞ்சல் அறிவிப்புகளை நிறுத்த' }
    : { label: 'New Guide', read: 'Read the Full Guide', planning: 'Plan Your Thirukadaiyur Celebration', prompt: 'Planning your celebration?', footer: 'Independent celebration planning and coordination service.', unsubscribe: 'Unsubscribe' }
  const summary = snapshot.summary ? `<p>${escapeHtml(snapshot.summary)}</p>` : ''
  const preheader = snapshot.preheader ? `<span style="display:none;max-height:0;overflow:hidden">${escapeHtml(snapshot.preheader)}</span>` : ''
  const html = `${preheader}<main><p><strong>MyThirumanam</strong></p><p>${copy.label}</p><h1>${escapeHtml(snapshot.headline)}</h1>${summary}<p><a href="${escapeHtml(snapshot.targetUrl)}">${copy.read}</a></p><hr><p><strong>${copy.prompt}</strong></p><p><a href="https://mythirumanam.in/plan">${copy.planning}</a></p><footer><p>MyThirumanam</p><p>${copy.footer}</p><p><a href="${escapeHtml(unsubscribeUrl)}">${copy.unsubscribe}</a></p></footer></main>`
  const text = ['MyThirumanam', copy.label, snapshot.headline, snapshot.summary ?? '', `${copy.read}: ${snapshot.targetUrl}`, copy.prompt, `${copy.planning}: https://mythirumanam.in/plan`, copy.footer, `${copy.unsubscribe}: ${unsubscribeUrl}`].filter(Boolean).join('\n\n')
  return { subject: snapshot.subject, html, text }
}

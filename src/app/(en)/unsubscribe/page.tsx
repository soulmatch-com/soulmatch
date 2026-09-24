import { UnsubscribeConfirmation } from '@/components/notifications/UnsubscribeConfirmation'
import { verifyUnsubscribeToken } from '@/modules/notifications/unsubscribe/unsubscribe-token'

export default async function UnsubscribePage({
  searchParams,
}: {
  searchParams: Promise<{ token?: string }>
}) {
  const { token = '' } = await searchParams
  const valid = verifyUnsubscribeToken(token)

  return (
    <main className="min-h-screen bg-[#fffaf3] px-4 py-20 text-stone-900">
      <section className="mx-auto max-w-xl rounded-2xl border border-amber-200 bg-white p-6 shadow-sm sm:p-8">
        <p className="font-serif text-xl font-bold text-[#681c24]">MyThirumanam</p>
        {valid ? (
          <>
            <h1 className="mt-6 text-3xl font-bold">Unsubscribe from MyThirumanam updates?</h1>
            <p className="mt-4 leading-7 text-stone-700">
              You will stop receiving new celebration guides and blog updates by email.
            </p>
            <UnsubscribeConfirmation token={token} />
            <p className="mt-5 text-sm text-stone-600">
              Changed your mind? You can simply close this page.
            </p>
          </>
        ) : (
          <>
            <h1 className="mt-6 text-3xl font-bold">
              This unsubscribe link is invalid or no longer available.
            </h1>
            <p className="mt-4 leading-7 text-stone-700">
              Please return to the MyThirumanam blog if you would like to manage future subscriptions.
            </p>
          </>
        )}
      </section>
    </main>
  )
}

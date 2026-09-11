import type { Metadata } from "next";
import { Toaster } from "sonner";
import ConditionalHeader from "@/components/ConditionalHeader";
import ConditionalFooter from "@/components/ConditionalFooter";
import { AuthProvider } from "@/components/providers/AuthProvider";
import { QueryProvider } from "@/components/providers/QueryProvider";
import "./globals.css";

export const metadata: Metadata = {
  metadataBase: new URL("https://mythirumanam.in"),
  title: "Thirukadaiyur Marriage Celebrations | MyThirumanam",
  description: "Plan traditional 60th, 70th and 80th marriage celebrations in Thirukadaiyur, with Matrimony available as a dedicated secondary service.",
  // Next.js file metadata supplies favicon.ico, icon.png, apple-icon.png and manifest.ts.
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className="antialiased"
        suppressHydrationWarning
      >
        <QueryProvider>
          <AuthProvider>
            <ConditionalHeader />
            {children}
            <ConditionalFooter />
            <Toaster position="top-center" richColors />
          </AuthProvider>
        </QueryProvider>
      </body>
    </html>
  );
}

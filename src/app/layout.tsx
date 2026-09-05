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
  icons: {
    icon: [
      { url: "/favicon.ico?v=2" },
      { url: "/icon.png?v=2", type: "image/png", sizes: "500x500" },
    ],
    apple: [{ url: "/apple-icon.png?v=2", sizes: "180x180", type: "image/png" }],
  },
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

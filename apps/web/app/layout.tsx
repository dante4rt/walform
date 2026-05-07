import type { Metadata, Viewport } from "next";
import { JetBrains_Mono, Plus_Jakarta_Sans } from "next/font/google";
import { Providers } from "@/components/providers";
import "./globals.css";

const plusJakartaSans = Plus_Jakarta_Sans({
  variable: "--font-plus-jakarta",
  subsets: ["latin"],
});

const jetBrainsMono = JetBrains_Mono({
  variable: "--font-jetbrains-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Walform — Forms with proof",
  description:
    "Walrus-native feedback forms with private, verifiable responses.",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "Walform",
  },
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#F0FDFA" },
    { media: "(prefers-color-scheme: dark)", color: "#0F1F1D" },
  ],
};

/**
 * Inline script runs before React hydrates to set the `dark` class on <html>.
 * This prevents a flash of the wrong theme (FOUC) on page load.
 */
const themeInitScript = `
(function(){
  try{
    var t=localStorage.getItem("walform:theme");
    var d=t==="dark"||(t!=="light"&&matchMedia("(prefers-color-scheme:dark)").matches);
    if(d)document.documentElement.classList.add("dark");
  }catch(e){}
})()
`;

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${plusJakartaSans.variable} ${jetBrainsMono.variable} h-full antialiased`}
      suppressHydrationWarning
    >
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeInitScript }} />
      </head>
      <body className="min-h-full flex flex-col">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}

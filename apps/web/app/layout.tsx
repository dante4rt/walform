import type { Metadata, Viewport } from "next"
import { Instrument_Serif, JetBrains_Mono, Plus_Jakarta_Sans } from "next/font/google"
import Script from "next/script"
import { Navbar } from "@/components/navbar"
import { Providers } from "@/components/providers"
import "./globals.css"

const plusJakartaSans = Plus_Jakarta_Sans({
  variable: "--font-plus-jakarta",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
})

const instrumentSerif = Instrument_Serif({
  variable: "--font-instrument-serif",
  subsets: ["latin"],
  weight: ["400"],
  style: ["normal", "italic"],
})

const jetBrainsMono = JetBrains_Mono({
  variable: "--font-jetbrains-mono",
  subsets: ["latin"],
  weight: ["400", "500"],
})

export const metadata: Metadata = {
  title: "Walform — Forms with proof",
  description: "Walrus-native feedback forms with private, verifiable responses.",
  manifest: "/pwa/manifest.json",
  icons: {
    icon: [
      { url: "/favicon/favicon.ico", sizes: "any" },
      { url: "/favicon/favicon-16x16.png", sizes: "16x16", type: "image/png" },
      { url: "/favicon/favicon-32x32.png", sizes: "32x32", type: "image/png" },
      { url: "/pwa/icons/icon-192.png", sizes: "192x192", type: "image/png" },
      { url: "/pwa/icons/icon-512.png", sizes: "512x512", type: "image/png" },
    ],
    apple: [
      { url: "/pwa/icons/apple-touch-icon.png", sizes: "180x180", type: "image/png" },
      { url: "/favicon/apple-touch-icon.png", sizes: "180x180", type: "image/png" },
    ],
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "Walform",
  },
}

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#F7F6F3" },
    { media: "(prefers-color-scheme: dark)", color: "#111111" },
  ],
}

const themeInitScript = `
(function(){
  try{
    var t=localStorage.getItem("walform:theme");
    if(t==="light"){document.documentElement.classList.add("light");return}
    if(t==="dark"){document.documentElement.classList.add("dark");return}
    if(matchMedia("(prefers-color-scheme:dark)").matches)document.documentElement.classList.add("dark");
  }catch(e){}
})()
`

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html
      lang="en"
      className={`${plusJakartaSans.variable} ${instrumentSerif.variable} ${jetBrainsMono.variable} h-full antialiased`}
      suppressHydrationWarning
    >
      <body className="min-h-full flex flex-col">
        <Script id="walform-theme-init" strategy="beforeInteractive">
          {themeInitScript}
        </Script>
        <Providers>
          <Navbar />
          {children}
        </Providers>
      </body>
    </html>
  )
}

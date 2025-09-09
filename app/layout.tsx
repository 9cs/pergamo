import type React from "react"
import "@/app/globals.css"
import { Inter, Poppins } from "next/font/google"
import { ThemeProvider } from "next-themes"
import { Suspense } from "react"

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
})

const poppins = Poppins({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-poppins",
  display: "swap",
})

export const metadata = {
  title: "Pergamo",
  description: "Site para estudantes responderem questões do vestibular do ENEM de forma totalmente gratuita e com feedback imediato",
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="pt-BR" suppressHydrationWarning className={`${inter.variable} ${poppins.variable}`}>
      <body
        className={`${inter.className} bg-neutral-50 dark:bg-neutral-900 text-neutral-900 dark:text-neutral-50 antialiased`}
      >
        <Suspense fallback={null}>
          <ThemeProvider attribute="class">
            {children}
          </ThemeProvider>
        </Suspense>
      </body>
    </html>
  )
}

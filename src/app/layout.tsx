
import "./globals.css";
import { ThemeProvider } from "@/components/theme-provider"
import { GeistSans } from "geist/font/sans";


export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning  className={`${GeistSans.className} antialiased dark:bg-gray-950`}>
      <body>
        <ThemeProvider
            attribute="class"
            defaultTheme="dark"
            enableSystem
            disableTransitionOnChange
          >
            {children}
          </ThemeProvider>
      </body>
    </html>
  );
}

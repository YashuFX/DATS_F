import type { Metadata } from "next";
import { Inter } from "next/font/google";
import { SETTINGS_INIT_SCRIPT } from "@/features/settings/lib/apply";
import { SettingsRuntime } from "@/features/settings/components/SettingsRuntime";
import { SectionNav } from "@/features/shell/SectionNav";
import { THEME_INIT_SCRIPT } from "@/lib/theme";
import "./globals.css";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "DATS — Frontend Components",
  description: "Component library and screens for the DATS ground segment.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      className={`${inter.variable} h-full antialiased`}
      suppressHydrationWarning
    >
      <head>
        {/* Sets data-theme before first paint. See lib/theme.ts. */}
        <script dangerouslySetInnerHTML={{ __html: THEME_INIT_SCRIPT }} />
        {/* Restores the operator's accent, scale and type before first paint.
            Must follow the theme script: half of what it writes depends on
            which theme the board resolved to. See features/settings/lib/apply.ts. */}
        <script dangerouslySetInnerHTML={{ __html: SETTINGS_INIT_SCRIPT }} />
      </head>
      <body className="min-h-full">
        {children}
        {/* Floats over every console; hides itself on the auth screens. */}
        <SectionNav />
        {/* Applies the stored settings and hosts every notification. */}
        <SettingsRuntime />
      </body>
    </html>
  );
}

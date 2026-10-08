import type { Config } from "tailwindcss";

// Exact Cairo brand palette and typography, loaded into Tailwind v4 via the
// `@config` directive in src/app/globals.css. Keep these token names stable
// (cairo-primary, cairo-bg, cairo-text, cairo-accent-yellow, cairo-accent-blue)
// since they are referenced throughout the UI.
const config: Config = {
  content: ["./src/**/*.{js,ts,jsx,tsx,mdx}"],
  theme: {
    extend: {
      colors: {
        "cairo-primary": "#5b0015",
        "cairo-bg": "#fffcfa",
        "cairo-text": "#2f2b2c",
        "cairo-accent-yellow": "#fff5ed",
        "cairo-accent-blue": "#bcc8e0",
      },
      fontFamily: {
        // Heading typeface: Bagdoll, loaded via next/font/local (src/lib/fonts.ts).
        heading: ["var(--font-bagdoll)", "serif"],
        // Body typeface: Headline Sans, loaded via next/font/local (src/lib/fonts.ts).
        sans: ["var(--font-headline-sans)", "sans-serif"],
      },
    },
  },
};

export default config;

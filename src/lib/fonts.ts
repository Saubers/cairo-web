import localFont from "next/font/local";

/** Heading typeface, used for titles via the `font-heading` utility class. */
export const bagdoll = localFont({
  src: "../fonts/BagdollDisplay-Regular.otf",
  variable: "--font-bagdoll",
  weight: "400",
  display: "swap",
});

/** Body typeface, used as the default `font-sans` utility class. */
export const headlineSans = localFont({
  src: "../fonts/StackSansHeadline-Regular.ttf",
  variable: "--font-headline-sans",
  weight: "400",
  display: "swap",
});

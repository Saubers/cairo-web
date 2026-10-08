import type { NextConfig } from "next";

// Ngrok domains used to test the app (signup, Mercado Pago webhooks, etc.)
// from outside localhost. Without these, Next.js' dev server rejects
// cross-origin requests from the tunnel outright — Server Actions like
// `signup` would never run server-side, so no profile row gets created and
// no redirect happens, even though the action code itself is correct.
const NGROK_ORIGINS = ["*.ngrok-free.app", "*.ngrok-free.dev", "*.ngrok.app", "*.ngrok.io"];

const nextConfig: NextConfig = {
  // Lets the dev server accept page/asset requests from the ngrok tunnel.
  allowedDevOrigins: NGROK_ORIGINS,
  experimental: {
    serverActions: {
      // Lets Server Actions (login/signup/logout, admin mutations) pass
      // their CSRF Origin-vs-Host check when invoked through the tunnel.
      allowedOrigins: NGROK_ORIGINS,
    },
  },
  images: {
    remotePatterns: [
      {
        // Product images are stored in the Supabase Storage "product-media"
        // bucket and served as public URLs from this hostname pattern.
        protocol: "https",
        hostname: "**.supabase.co",
        pathname: "/storage/v1/object/public/**",
      },
      {
        // Picsum placeholder images, used by supabase/seed.sql test products
        // until real product photography is uploaded.
        protocol: "https",
        hostname: "picsum.photos",
      },
    ],
  },
};

export default nextConfig;

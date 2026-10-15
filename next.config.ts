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
  // [SECURITY] Applied to every route. `X-Frame-Options`/`frame-ancestors`
  // stop the storefront (and, critically, /admin) from being iframed for
  // clickjacking; `Referrer-Policy` strips the full URL (including the
  // order id query param on `/carrito/exito`'s capability link) from the
  // `Referer` header sent to any third-party resource; `X-Content-Type-Options`
  // blocks MIME-sniffing; `Permissions-Policy` disables APIs this app never
  // uses. No `Content-Security-Policy` yet — introducing one retroactively
  // needs an audit of every inline script/style this app relies on first,
  // to avoid silently breaking the site.
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          { key: "X-Frame-Options", value: "DENY" },
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
        ],
      },
    ];
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

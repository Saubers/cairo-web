import Link from "next/link";
import { AtSign, Mail, MessageCircle } from "lucide-react";

// `lucide-react` dropped brand/social glyphs (e.g. a literal Instagram icon)
// starting from this major version; `AtSign` stands in as a generic handle icon.

// WhatsApp Business "click to chat" API — opens a chat with this number
// prefilled with the greeting message below.
const WHATSAPP_NUMBER = "543329661758";
const WHATSAPP_MESSAGE = encodeURIComponent(
  "Hola! Quería consultar sobre un producto de Cairo.",
);
const WHATSAPP_URL = `https://wa.me/${WHATSAPP_NUMBER}?text=${WHATSAPP_MESSAGE}`;

const INSTAGRAM_HANDLE = "cairo.sanpedro";
const INSTAGRAM_URL = `https://instagram.com/${INSTAGRAM_HANDLE}`;

const CONTACT_EMAIL = "cairo.bagsyaccesorios@gmail.com";

/**
 * Footer/contact section anchored at `#contacto`, linked from the Navbar and
 * the mobile drawer. Uses the inverted brand palette (cairo-primary
 * background, cairo-bg text) to visually close out the page.
 */
export function ContactSection() {
  return (
    <section id="contacto" className="bg-cairo-primary py-16 text-cairo-bg">
      <div className="mx-auto max-w-7xl px-4 text-center sm:px-6 lg:px-8">
        <h2 className="font-heading text-3xl">Hablemos</h2>
        <p className="mx-auto mt-3 max-w-md text-sm text-cairo-bg/80">
          ¿Tenés dudas sobre un producto, un pedido o simplemente querés
          saludar? Estamos a un mensaje de distancia.
        </p>

        <div className="mt-10 flex flex-col items-center justify-center gap-6 sm:flex-row sm:gap-10">
          <Link
            href={WHATSAPP_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2 text-sm font-medium transition-opacity hover:opacity-80"
          >
            <MessageCircle className="h-5 w-5" />
            WhatsApp
          </Link>

          <Link
            href={INSTAGRAM_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2 text-sm font-medium transition-opacity hover:opacity-80"
          >
            <AtSign className="h-5 w-5" />@{INSTAGRAM_HANDLE}
          </Link>

          <Link
            href={`mailto:${CONTACT_EMAIL}`}
            className="flex items-center gap-2 text-sm font-medium transition-opacity hover:opacity-80"
          >
            <Mail className="h-5 w-5" />
            {CONTACT_EMAIL}
          </Link>
        </div>

        <p className="mt-12 text-xs text-cairo-bg/60">
          © {new Date().getFullYear()} Cairo. Hecho con cariño en Argentina.
        </p>
      </div>
    </section>
  );
}

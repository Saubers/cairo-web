import {
  Body,
  Container,
  Head,
  Heading,
  Html,
  Preview,
  Section,
  Text,
} from "@react-email/components";

/** Everything the "order shipped" email needs to render. */
export interface ShippingNotificationEmailProps {
  /** Customer's display name; falls back to a generic greeting when absent (guest checkout with no name on file). */
  customerName: string | null;
  /** Full order id (uuid) — only the first 8 characters are ever shown, matching the rest of the app's order-id display convention. */
  orderId: string;
  /** Carrier name, e.g. "Correo Argentino", "Andreani". */
  shippingProvider: string;
  /** Carrier-issued tracking number/code. */
  trackingNumber: string;
}

// Brand colors, kept in sync with `tailwind.config.ts`'s `cairo-*` palette.
// Inlined here (not imported) since this file compiles independently of the
// Tailwind pipeline when rendered by `@react-email/render`.
const COLORS = {
  bg: "#fffcfa",
  card: "#ffffff",
  primary: "#5b0015",
  text: "#2f2b2c",
  textMuted: "#2f2b2c80",
  border: "#2f2b2c1a",
  accentBlue: "#bcc8e0",
};

/**
 * Transactional email sent when an admin marks an order as "shipped".
 * Minimalist, single-column layout — matches the inline-styled approach
 * already used by `renderOrderConfirmationHtml` in `src/lib/email.ts`, just
 * authored as JSX instead of a template string. Rendered server-side only
 * (via `resend`'s `react` field, backed by `@react-email/render`) and never
 * shipped to the browser bundle.
 */
export function ShippingNotificationEmail({
  customerName,
  orderId,
  shippingProvider,
  trackingNumber,
}: ShippingNotificationEmailProps) {
  const shortOrderId = orderId.slice(0, 8).toUpperCase();
  const greeting = customerName ? `¡Hola, ${customerName}!` : "¡Hola!";

  return (
    <Html>
      <Head />
      <Preview>Tu pedido #{shortOrderId} ya está en camino.</Preview>
      <Body
        style={{
          backgroundColor: COLORS.bg,
          fontFamily: "'Helvetica Neue', Arial, sans-serif",
          padding: "32px 16px",
          margin: 0,
        }}
      >
        <Container
          style={{
            maxWidth: "480px",
            margin: "0 auto",
            backgroundColor: COLORS.card,
            borderRadius: "12px",
            padding: "32px",
          }}
        >
          <Heading
            as="h1"
            style={{ margin: "0 0 8px", color: COLORS.primary, fontSize: "22px" }}
          >
            {greeting}
          </Heading>

          <Text style={{ margin: "0 0 24px", color: COLORS.textMuted, fontSize: "14px" }}>
            Tu pedido <strong>#{shortOrderId}</strong> ya salió de nuestro depósito y está en
            camino a tu domicilio.
          </Text>

          <Section
            style={{
              backgroundColor: COLORS.accentBlue + "33",
              border: `1px solid ${COLORS.accentBlue}`,
              borderRadius: "10px",
              padding: "20px",
              marginBottom: "24px",
            }}
          >
            <Text
              style={{
                margin: "0 0 4px",
                color: COLORS.textMuted,
                fontSize: "12px",
                textTransform: "uppercase",
                letterSpacing: "0.04em",
              }}
            >
              Empresa de envío
            </Text>
            <Text style={{ margin: "0 0 16px", color: COLORS.text, fontSize: "16px", fontWeight: 600 }}>
              {shippingProvider}
            </Text>

            <Text
              style={{
                margin: "0 0 4px",
                color: COLORS.textMuted,
                fontSize: "12px",
                textTransform: "uppercase",
                letterSpacing: "0.04em",
              }}
            >
              Número de seguimiento
            </Text>
            <Text
              style={{
                margin: 0,
                color: COLORS.primary,
                fontSize: "18px",
                fontWeight: 700,
                fontFamily: "'Courier New', monospace",
                letterSpacing: "0.03em",
              }}
            >
              {trackingNumber}
            </Text>
          </Section>

          <Text style={{ margin: "0 0 24px", color: COLORS.text, fontSize: "14px", lineHeight: "22px" }}>
            Gracias por confiar en Cairo Accesorios. Esperamos que disfrutes tu compra tanto como
            nosotros disfrutamos prepararla para ti.
          </Text>

          <Text
            style={{
              margin: "32px 0 0",
              paddingTop: "16px",
              borderTop: `1px solid ${COLORS.border}`,
              color: COLORS.textMuted,
              fontSize: "12px",
            }}
          >
            Cairo Accesorios — Accesorios para mujer
          </Text>
        </Container>
      </Body>
    </Html>
  );
}

export default ShippingNotificationEmail;

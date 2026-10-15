import "server-only";
import { Resend } from "resend";
import { ShippingNotificationEmail } from "@/components/emails/ShippingNotificationEmail";

const PRICE_FORMATTER = new Intl.NumberFormat("es-AR", {
  style: "currency",
  currency: "ARS",
  maximumFractionDigits: 0,
});

/** A single purchased line item, with its discount (if any) already applied. */
export interface OrderConfirmationItem {
  productName: string;
  quantity: number;
  unitPrice: number;
  subtotal: number;
}

/** Everything the confirmation email needs to render, beyond the recipient address. */
export interface OrderConfirmationDetails {
  orderId: string;
  items: OrderConfirmationItem[];
  total: number;
}

function getResendClient(): Resend {
  return new Resend(process.env.RESEND_API_KEY!);
}

/**
 * Escapes the five HTML-significant characters before interpolating
 * user-controlled strings (e.g. `guest_name`, `product_name`) into the raw
 * HTML templates below. Without this, a crafted name at checkout (e.g.
 * `<img src=x onerror=...>`) would be injected verbatim into the email body
 * sent via Resend — most webmail clients sandbox/strip `<script>`, but HTML
 * injection (broken layout, spoofed links/content) is still a real risk.
 */
function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

/**
 * Renders the order confirmation email as plain inline-styled HTML (no
 * `react-email` dependency) so the markup stays self-contained and renders
 * predictably across email clients, which strip `<style>` blocks and
 * webfonts unreliably. `Helvetica Neue`/Arial is used as the closest
 * web-safe stand-in for Cairo's Headline Sans body typeface.
 */
function renderOrderConfirmationHtml(
  recipientName: string | null,
  { orderId, items, total }: OrderConfirmationDetails,
): string {
  const itemRows = items
    .map(
      (item) => `
        <tr>
          <td style="padding: 12px 0; border-bottom: 1px solid #2f2b2c1a; color: #2f2b2c; font-size: 14px;">
            ${escapeHtml(item.productName)} <span style="color: #2f2b2c80;">x${item.quantity}</span>
          </td>
          <td style="padding: 12px 0; border-bottom: 1px solid #2f2b2c1a; color: #2f2b2c; font-size: 14px; text-align: right;">
            ${PRICE_FORMATTER.format(item.subtotal)}
          </td>
        </tr>`,
    )
    .join("");

  // `recipientName` comes from `profiles.full_name` (registered customers)
  // or `orders.guest_name` (guest checkout) — both user-controlled, so they
  // must be escaped before interpolation, same as `item.productName` above.
  const greeting = recipientName
    ? `¡Gracias por tu compra, ${escapeHtml(recipientName)}!`
    : "¡Gracias por tu compra!";

  return `
    <div style="background-color: #fffcfa; padding: 32px 16px; font-family: 'Helvetica Neue', Arial, sans-serif;">
      <div style="max-width: 480px; margin: 0 auto; background-color: #ffffff; border-radius: 12px; padding: 32px;">
        <h1 style="margin: 0 0 8px; color: #5b0015; font-size: 22px;">${greeting}</h1>
        <p style="margin: 0 0 24px; color: #2f2b2c80; font-size: 14px;">
          Pedido #${orderId.slice(0, 8)} confirmado y pagado.
        </p>

        <table style="width: 100%; border-collapse: collapse;">
          ${itemRows}
        </table>

        <table style="width: 100%; margin-top: 16px;">
          <tr>
            <td style="color: #2f2b2c; font-size: 16px; font-weight: bold;">Total</td>
            <td style="color: #5b0015; font-size: 16px; font-weight: bold; text-align: right;">
              ${PRICE_FORMATTER.format(total)}
            </td>
          </tr>
        </table>

        <p style="margin: 32px 0 0; color: #2f2b2c80; font-size: 12px;">
          Cairo — Accesorios para mujer
        </p>
      </div>
    </div>`;
}

/**
 * Sends the order confirmation email via Resend.
 *
 * `recipientName` is optional and purely cosmetic (used for the email
 * greeting only) — pass `null` when no name is available for either a
 * registered customer or a guest checkout.
 *
 * Callers (the Mercado Pago webhook) must wrap this in a `try/catch`: a
 * failure here must never fail the webhook response itself, since Mercado
 * Pago retries non-2xx responses, which would needlessly re-run order
 * reconciliation.
 */
export async function sendOrderConfirmationEmail(
  recipientEmail: string,
  recipientName: string | null,
  orderDetails: OrderConfirmationDetails,
): Promise<void> {
  const resend = getResendClient();

  const { error } = await resend.emails.send({
    from: process.env.RESEND_FROM_EMAIL!,
    to: recipientEmail,
    subject: `Cairo — Confirmación de tu pedido #${orderDetails.orderId.slice(0, 8)}`,
    html: renderOrderConfirmationHtml(recipientName, orderDetails),
  });

  if (error) {
    throw new Error(`Failed to send order confirmation email: ${error.message}`);
  }
}

// [TEMPORARY] Resend requires sending from a domain you've verified before
// using your own address. `onboarding@resend.dev` is Resend's own sandbox
// sender, usable with no domain setup, but Resend's test mode only ever
// delivers mail sent `from` this sandbox address to the Resend ACCOUNT
// OWNER's own inbox — any other `to` recipient is silently accepted by the
// API (no `error` in the response) and then dropped, which looks exactly
// like "the email never arrived" with nothing to debug. This is the
// fallback only; once a domain is verified in the Resend dashboard, set
// `RESEND_FROM_EMAIL` (shared with `sendOrderConfirmationEmail` above,
// e.g. "Cairo <pedidos@cairo.com.ar>") to send to real customers.
const SHIPPING_EMAIL_FALLBACK_FROM = "onboarding@resend.dev";

/**
 * Sends the "your order has shipped" notification via Resend, rendering
 * `ShippingNotificationEmail` (a React Email component) to the message body.
 *
 * Passing `react: <ShippingNotificationEmail .../>` instead of a hand-built
 * `html` string, as `renderOrderConfirmationHtml` above does, means
 * `customerName`/`provider`/`trackingNumber` go through JSX's automatic text
 * escaping rather than needing a manual `escapeHtml` pass — React never
 * interprets string children as markup.
 *
 * [EDGE SAFETY] This function itself never throws — every failure path is
 * caught and logged here instead. On Cloudflare's Workers runtime, a Route
 * Handler / Server Action that returns (or whose promise settles) before an
 * in-flight `fetch` to a third-party API resolves gets that request aborted
 * mid-flight ("Workers runtime cancelled the request") — so the ONE thing
 * that matters for this function is that every await in this call chain is
 * explicit, all the way down to the final `resend.emails.send()`, and that
 * the caller (`updateOrderStatus` in `src/app/admin/orders/actions.ts`)
 * also `await`s this function rather than firing it off and returning
 * immediately. A failed delivery is a logged failure, not an unhandled
 * promise rejection racing against worker shutdown.
 */
export async function sendShippingEmail(
  orderId: string,
  customerEmail: string,
  trackingNumber: string,
  provider: string,
  customerName: string | null = null,
): Promise<void> {
  const resend = getResendClient();
  const from = process.env.RESEND_FROM_EMAIL ?? SHIPPING_EMAIL_FALLBACK_FROM;

  console.log(`[RESEND] Sending shipping notification for order ${orderId} to ${customerEmail} from "${from}"...`);

  const { data, error } = await resend.emails.send({
    from,
    to: customerEmail,
    subject: `Cairo — Tu pedido #${orderId.slice(0, 8).toUpperCase()} está en camino`,
    react: (
      <ShippingNotificationEmail
        customerName={customerName}
        orderId={orderId}
        shippingProvider={provider}
        trackingNumber={trackingNumber}
      />
    ),
  });

  // Never throw: a notification failure must not roll back or block the
  // order-status update that already succeeded in the caller. Logging is
  // the only diagnostic signal available here (visible in Cloudflare
  // Pages' function logs) — this is the detail needed to tell "Resend
  // rejected the request" (bad API key, unverified sender, sandbox-mode
  // recipient restriction, etc.) apart from "the request never completed".
  if (error) {
    console.error(`[RESEND ERROR] Failed to send shipping notification for order ${orderId}:`, error);
  } else {
    console.log(`[RESEND SUCCESS] Shipping notification sent to ${customerEmail}. Resend id: ${data?.id}`);
  }
}

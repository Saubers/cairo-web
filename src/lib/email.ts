import "server-only";
import { Resend } from "resend";

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

/** Everything the "order shipped" email needs to render, beyond the recipient address. */
export interface ShippingNotificationDetails {
  customerName: string | null;
  orderId: string;
  shippingProvider: string;
  trackingNumber: string;
}

/**
 * Renders the "order shipped" email as plain inline-styled HTML — a template
 * literal, not a React Email component.
 *
 * [CLOUDFLARE 1102 FIX] `@react-email/components` previously rendered this
 * email (see the now-removed `src/components/emails/ShippingNotificationEmail.tsx`).
 * React Email renders by mounting a full React tree server-side and then
 * serializing it to static HTML on every single send — on Cloudflare's
 * Workers runtime, that CPU burst during a Server Action's execution window
 * was enough to trip `Error 1102: Worker exceeded resource limits`. A plain
 * template literal has no render pass at all: it is string concatenation,
 * with the same cost as `renderOrderConfirmationHtml` above (which has
 * never caused this error).
 *
 * `customerName`/`shippingProvider`/`trackingNumber` are escaped before
 * interpolation for the same reason `renderOrderConfirmationHtml` escapes
 * `recipientName`/`item.productName`: JSX auto-escaped these previously,
 * but a plain string template does not, and `shippingProvider`/
 * `trackingNumber` are admin-entered free text.
 */
export function renderShippingNotificationHtml({
  customerName,
  orderId,
  shippingProvider,
  trackingNumber,
}: ShippingNotificationDetails): string {
  const shortOrderId = orderId.slice(0, 8).toUpperCase();
  const greeting = customerName ? `¡Hola, ${escapeHtml(customerName)}!` : "¡Hola!";

  return `
    <div style="background-color: #fffcfa; padding: 32px 16px; font-family: 'Helvetica Neue', Arial, sans-serif;">
      <div style="max-width: 480px; margin: 0 auto; background-color: #ffffff; border-radius: 12px; padding: 32px;">
        <h1 style="margin: 0 0 8px; color: #5b0015; font-size: 22px;">${greeting}</h1>
        <p style="margin: 0 0 24px; color: #2f2b2c80; font-size: 14px;">
          Tu pedido <strong>#${shortOrderId}</strong> ya salió de nuestro depósito y está en camino a tu domicilio.
        </p>

        <div style="background-color: #bcc8e033; border: 1px solid #bcc8e0; border-radius: 10px; padding: 20px; margin-bottom: 24px;">
          <p style="margin: 0 0 4px; color: #2f2b2c80; font-size: 12px; text-transform: uppercase; letter-spacing: 0.04em;">
            Empresa de envío
          </p>
          <p style="margin: 0 0 16px; color: #2f2b2c; font-size: 16px; font-weight: 600;">
            ${escapeHtml(shippingProvider)}
          </p>

          <p style="margin: 0 0 4px; color: #2f2b2c80; font-size: 12px; text-transform: uppercase; letter-spacing: 0.04em;">
            Número de seguimiento
          </p>
          <p style="margin: 0; color: #5b0015; font-size: 18px; font-weight: 700; font-family: 'Courier New', monospace; letter-spacing: 0.03em;">
            ${escapeHtml(trackingNumber)}
          </p>
        </div>

        <p style="margin: 0 0 24px; color: #2f2b2c; font-size: 14px; line-height: 22px;">
          Gracias por confiar en Cairo Accesorios. Esperamos que disfrutes tu compra tanto como nosotros disfrutamos
          prepararla para ti.
        </p>

        <p style="margin: 32px 0 0; padding-top: 16px; border-top: 1px solid #2f2b2c1a; color: #2f2b2c80; font-size: 12px;">
          Cairo Accesorios — Accesorios para mujer
        </p>
      </div>
    </div>`;
}

/**
 * Sends the "your order has shipped" notification.
 *
 * [CLOUDFLARE 1102 FIX] Uses a native `fetch` call to Resend's HTTP API
 * instead of the `resend` SDK (`getResendClient()`, used by
 * `sendOrderConfirmationEmail` above). The SDK pulls in its own HTTP client
 * and request/response plumbing; a bare `fetch` with a hand-built JSON body
 * has effectively zero import/initialization cost, which matters here
 * because this call runs inside the same Worker invocation as the
 * `updateOrderStatus` Server Action that triggered it (see that action's
 * own `[EDGE SAFETY]` comment on why its `await` is mandatory) rather than
 * in a separate webhook invocation with a full execution budget to itself.
 *
 * Never throws: every failure path (network failure, a non-2xx response)
 * is caught and logged here instead, so a failed notification can never
 * roll back or block the order-status update that already succeeded in the
 * caller — the same contract `sendOrderConfirmationEmail` documents for its
 * own callers.
 */
export async function sendShippingEmail(
  orderId: string,
  customerEmail: string,
  trackingNumber: string,
  provider: string,
  customerName: string | null = null,
): Promise<void> {
  const from = process.env.RESEND_FROM_EMAIL ?? SHIPPING_EMAIL_FALLBACK_FROM;
  const html = renderShippingNotificationHtml({
    customerName,
    orderId,
    shippingProvider: provider,
    trackingNumber,
  });

  console.log(`[RESEND] Sending shipping notification for order ${orderId} to ${customerEmail} from "${from}"...`);

  try {
    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
      },
      body: JSON.stringify({
        from,
        to: customerEmail,
        subject: `Cairo — Tu pedido #${orderId.slice(0, 8).toUpperCase()} está en camino`,
        html,
      }),
    });

    // Resend's HTTP API returns a JSON body on both success (`{ id }`) and
    // failure (`{ message, name, ... }`) — read it once, regardless of
    // status, so a failure's detail is never discarded.
    const body: unknown = await response.json().catch(() => null);

    if (!response.ok) {
      console.error(`[RESEND ERROR] Failed to send shipping notification for order ${orderId}:`, body);
      return;
    }

    const resendId =
      typeof body === "object" && body !== null && typeof (body as { id?: unknown }).id === "string"
        ? (body as { id: string }).id
        : undefined;
    console.log(`[RESEND SUCCESS] Shipping notification sent to ${customerEmail}. Resend id: ${resendId}`);
  } catch (networkError) {
    // The `fetch` itself failed (e.g. a transient network error reaching
    // Resend) before any HTTP response was received.
    console.error(`[RESEND ERROR] Network failure sending shipping notification for order ${orderId}:`, networkError);
  }
}

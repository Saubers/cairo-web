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

/**
 * [STUB] Notifies a customer that their order has shipped.
 *
 * This is intentionally a no-op placeholder (just a `console.log`) rather
 * than a real Resend call. To wire it up for real:
 *
 * 1. Write a `renderOrderShippedHtml(...)` function, following the exact
 *    pattern of `renderOrderConfirmationHtml` above (inline-styled HTML,
 *    no `react-email` dependency), that renders `trackingNumber` and
 *    `provider` into a branded template. Pass both through `escapeHtml`
 *    before interpolating them, same as `renderOrderConfirmationHtml` does
 *    for `recipientName`/`productName` — `provider` is admin-entered but
 *    still free text, so it must not be trusted as pre-sanitized HTML.
 * 2. Replace the `console.log` below with:
 *    ```ts
 *    const resend = getResendClient();
 *    const { error } = await resend.emails.send({
 *      from: process.env.RESEND_FROM_EMAIL!,
 *      to: customerEmail,
 *      subject: `Cairo — Tu pedido #${orderId.slice(0, 8)} está en camino`,
 *      html: renderOrderShippedHtml(trackingNumber, provider),
 *    });
 *    if (error) {
 *      throw new Error(`Failed to send shipping notification email: ${error.message}`);
 *    }
 *    ```
 *
 * Callers must wrap this in a `try/catch`, same as `sendOrderConfirmationEmail`
 * — a failed notification must never roll back or block the admin's status
 * update that triggered it.
 */
export async function sendShippingEmail(
  orderId: string,
  customerEmail: string,
  trackingNumber: string,
  provider: string,
): Promise<void> {
  console.log(
    `[STUB] sendShippingEmail: would notify ${customerEmail} that order ${orderId} shipped via ${provider} (tracking: ${trackingNumber}).`,
  );
}

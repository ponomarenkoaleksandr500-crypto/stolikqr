import type { Metadata, Viewport } from "next";
import { Manrope } from "next/font/google";
import { LocaleProvider } from "@/i18n/LocaleProvider";
import { CartProvider } from "@/cart/CartProvider";
import { TableSessionProvider } from "@/table/TableSessionProvider";
import { ThemeProvider } from "@/theme/ThemeProvider";
import { THEME_INIT_SCRIPT } from "@/theme/themeScript";
import "./globals.css";

/**
 * One family for the whole product (design-contract.md §1). Bitter, the
 * previous display serif, was removed: it is a slab serif designed for
 * body text, it was reached for because "restaurant = warm serif", and
 * dropping it removes a render-blocking webfont on the guest's mobile
 * connection. Display type is now Manrope at 700/800.
 */
const sansUi = Manrope({
  variable: "--font-sans-ui",
  subsets: ["latin", "cyrillic"],
  weight: ["400", "500", "600", "700", "800"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "stolikqr — QR-меню",
  description: "Interactive restaurant QR menu",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  // No maximumScale: a guest must be able to pinch-zoom a menu they
  // cannot read (WCAG 2.1 SC 1.4.4). The previous `maximumScale: 1`
  // blocked that on every screen of the product.
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="uk" className={`${sansUi.variable} h-full antialiased`} suppressHydrationWarning>
      <head>
        {/* Applies the stored/system mode before first paint, so the guest
            never sees a flash of the wrong theme. Must stay inline and
            before the body for that to hold. */}
        <script dangerouslySetInnerHTML={{ __html: THEME_INIT_SCRIPT }} />
      </head>
      <body className="min-h-full flex flex-col">
        <ThemeProvider>
          <LocaleProvider>
            <TableSessionProvider>
              <CartProvider>{children}</CartProvider>
            </TableSessionProvider>
          </LocaleProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}

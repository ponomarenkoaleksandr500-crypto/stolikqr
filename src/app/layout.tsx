import type { Metadata, Viewport } from "next";
import { Bitter, Manrope } from "next/font/google";
import { LocaleProvider } from "@/i18n/LocaleProvider";
import { CartProvider } from "@/cart/CartProvider";
import { TableSessionProvider } from "@/table/TableSessionProvider";
import "./globals.css";

const sansUi = Manrope({
  variable: "--font-sans-ui",
  subsets: ["latin", "cyrillic"],
  weight: ["400", "500", "600", "700", "800"],
});

const displaySerif = Bitter({
  variable: "--font-display-serif",
  subsets: ["latin", "cyrillic"],
  weight: ["500", "600", "700"],
});

export const metadata: Metadata = {
  title: "stolikqr — QR-меню",
  description: "Interactive restaurant QR menu",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="uk"
      className={`${sansUi.variable} ${displaySerif.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        <LocaleProvider>
          <TableSessionProvider>
            <CartProvider>{children}</CartProvider>
          </TableSessionProvider>
        </LocaleProvider>
      </body>
    </html>
  );
}

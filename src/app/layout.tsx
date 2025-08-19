import type { Metadata } from "next";
import ThemeRegistry from "./theme-registry";

export const metadata: Metadata = {
  title: "Enescena",
  description: "Book artists on demand.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <ThemeRegistry>{children}</ThemeRegistry>
      </body>
    </html>
  );
}
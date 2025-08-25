import type { Metadata } from "next";
import ThemeRegistry from "./theme-registry";
import NavBar from "@/components/NavBar";

export const metadata: Metadata = {
  title: "Enescena",
  description: "Book artists on demand.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <NavBar />
        <ThemeRegistry>{children}</ThemeRegistry>
      </body>
    </html>
  );
}
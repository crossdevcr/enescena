import type { Metadata } from "next";
import ThemeRegistry from "./theme-registry";
import Box from "@mui/material/Box";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Enescena",
  description: "Book artists on demand.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <ThemeRegistry>
          <Box sx={{ p: 2, display: "flex", gap: 2 }}>
            <Link href="/api/auth/login">Login</Link>
            <Link href="/api/auth/logout">Logout</Link>
            <Link href="/dashboard">Dashboard</Link>
          </Box>
          {children}
        </ThemeRegistry>
      </body>
    </html>
  );
}
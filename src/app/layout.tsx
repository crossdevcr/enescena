import type { Metadata } from "next";
import ThemeRegistry from "./theme-registry";
import NavBar from "@/components/NavBar";
import QueryProvider from "@/providers/QueryProvider";
import AuthInitializer from "@/components/AuthInitializer";

export const metadata: Metadata = {
  title: "Enescena",
  description: "Book artists on demand.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body 
        style={{
          margin: 0,
          padding: 0,
          background: "linear-gradient(135deg, #1F2937 0%, #374151 50%, #4B5563 100%)",
          minHeight: "100vh"
        }}
      >
        <QueryProvider>
          <AuthInitializer>
            <NavBar />
            <ThemeRegistry>{children}</ThemeRegistry>
          </AuthInitializer>
        </QueryProvider>
      </body>
    </html>
  );
}
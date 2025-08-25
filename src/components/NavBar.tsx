import Link from "next/link";

export default function NavBar() {
  return (
    <nav style={{ padding: "16px", display: "flex", gap: "8px" }}>
      <Link href="/api/auth/login">Login</Link>
      <Link href="/api/auth/logout">Logout</Link>
      <Link href="/dashboard">Dashboard</Link>
    </nav>
  );
}
"use client";

import Link from "next/link";

export default function NavBar() {
  const handleLogout = async () => {
    try {
      const response = await fetch('/api/auth/signout', {
        method: 'POST',
      });
      
      if (response.ok) {
        // Redirect to home page after successful logout
        window.location.href = '/';
      }
    } catch (error) {
      console.error('Logout error:', error);
      // Redirect anyway as a fallback
      window.location.href = '/';
    }
  };

  return (
    <nav style={{ padding: "16px", display: "flex", gap: "8px" }}>
      <Link href="/auth/signin">Sign In</Link>
      <button onClick={handleLogout} style={{ background: 'none', border: 'none', color: 'blue', textDecoration: 'underline', cursor: 'pointer' }}>
        Logout
      </button>
      <Link href="/dashboard">Dashboard</Link>
    </nav>
  );
}
"use client";

export default function GlobalError({ error }: { error: Error & { digest?: string } }) {
  return (
    <div style={{ padding: 24 }}>
      <h1 style={{ margin: 0 }}>Something went wrong</h1>
      <p>{error.message}</p>
      {error.digest && <code>digest: {error.digest}</code>}
      <p style={{ marginTop: 16 }}>
        <a href="/" style={{ textDecoration: "underline" }}>Reload</a>
      </p>
    </div>
  );
}
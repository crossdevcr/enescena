import Link from 'next/link';

export default function NotFound() {
  return (
    <div style={{ padding: 24 }}>
      <h1 style={{ margin: 0 }}>Not found</h1>
      <p>The page you&apos;re looking for doesn&apos;t exist.</p>
      <Link href="/" style={{ textDecoration: "underline" }}>Go home</Link>
    </div>
  );
}
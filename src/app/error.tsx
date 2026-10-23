"use client";
export default function ErrorPage({ reset }: { reset: () => void }) {
  return (
    <main className="setup-card">
      <h1>A small detour.</h1>
      <p>We couldn’t load this page. Please try again.</p>
      <button onClick={reset}>Try again</button>
      <a href="/">Back to the map</a>
    </main>
  );
}

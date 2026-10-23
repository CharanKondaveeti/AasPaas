import type { Metadata } from "next";
import "@/styles/app.css";
import "maplibre-gl/dist/maplibre-gl.css";
export const metadata: Metadata = {
  title: "AasPaas — A little closer to Hyderabad",
  description:
    "Find a new favourite corner of Hyderabad. Explore food, historic places and quiet green escapes on a beautiful, real map.",
};
export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}

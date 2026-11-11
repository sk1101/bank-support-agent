import "./globals.css";
import type { ReactNode } from "react";

export const metadata = {
  title: "Demo Bank – AI Support Agent",
  description: "An agentic banking assistant built with Next.js and Gemini tool calling.",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}

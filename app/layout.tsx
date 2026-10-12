import "./style.css";
import "./globals.css";

import Navbar from "@/components/layout/Navbar";

export const metadata = {
  title: "Asu Guitar Lab",
  description: "Guitar melody and chord practice",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>
        <Navbar />
        {children}
      </body>
    </html>
  );
}
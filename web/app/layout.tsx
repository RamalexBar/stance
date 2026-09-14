import Image from "next/image";
import "./globals.css";
import { AuthProvider } from "../context/AuthContext";

export const metadata = {
  title: "Easy Kite",
  description: "Análisis biomecánico para Kitesurf y Wing Foil",
  icons: { icon: "/icon.png" },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es">
      <body>
        <AuthProvider>
          <Image src="/icon.png" alt="Easy Kite" width={36} height={36} className="app-icon-badge" priority />
          {children}
        </AuthProvider>
      </body>
    </html>
  );
}

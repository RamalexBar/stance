import "./globals.css";
import { AuthProvider } from "../context/AuthContext";
import AppIconBadge from "../components/AppIconBadge";

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
          <AppIconBadge />
          {children}
        </AuthProvider>
      </body>
    </html>
  );
}

"use client";

import Image from "next/image";
import { usePathname } from "next/navigation";

// La pantalla de splash ("/") ya muestra el ícono grande como protagonista;
// mostrar también la insignia fija ahí duplicaría el ícono en la misma vista.
export default function AppIconBadge() {
  const pathname = usePathname();
  if (pathname === "/") return null;

  return <Image src="/icon.png" alt="Easy Kite" width={36} height={36} className="app-icon-badge" priority />;
}

import "./globals.css";
import Sidebar from "@/components/Sidebar";
import SplashScreen from "@/components/SplashScreen";

export const metadata = {
  title: "Cueramaro Prime - Sistema de Gestión",
  description: "Sistema de gestión de ventas para carnicería",
  icons: {
    icon: '/logo.png',
    apple: '/logo.png',
  },
};

export default function RootLayout({ children }) {
  return (
    <html lang="es">
      <body>
        <SplashScreen />
        <div className="app-container">
          <Sidebar />
          {children}
        </div>
      </body>
    </html>
  );
}

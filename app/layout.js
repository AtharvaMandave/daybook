import "./globals.css";
import { Toaster } from "sonner";

export const metadata = {
  title: "Daybook — Know where your money goes",
  description: "A premium, editorial personal expense tracker and financial calculation engine.",
  icons: {
    icon: "/favicon.ico",
  },
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-background text-foreground antialiased selection:bg-forest-100 selection:text-forest-900">
        {children}
        <Toaster
          position="bottom-right"
          toastOptions={{
            style: {
              background: "#FFFFFF",
              color: "#242820",
              border: "1px solid #E6E3DB",
              boxShadow: "0 4px 12px -2px rgba(36, 40, 32, 0.08)",
              borderRadius: "8px",
              fontFamily: "inherit",
              fontSize: "13px",
            },
          }}
        />
      </body>
    </html>
  );
}

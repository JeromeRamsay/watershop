import type { Metadata } from "next";
import { Poppins } from "next/font/google";
import "./globals.css";
import { ThemeProvider } from "@/lib/theme-provider";
import { ReactQueryProvider } from "@/lib/react-query-provider";
import { employeeAppMetadata } from "@/lib/metadata";
import { EmployeeAppErrorCenter } from "@/components/layout/employee-app-error-center";

const poppins = Poppins({
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700"],
  display: "swap",
});

export const metadata: Metadata = employeeAppMetadata;

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="overflow-x-hidden">
      <body className={`${poppins.className} antialiased overflow-x-hidden`}>
        <ThemeProvider>
          <ReactQueryProvider>
            <EmployeeAppErrorCenter />
            {children}
          </ReactQueryProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
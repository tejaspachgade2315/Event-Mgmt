"use client";
import { Geist, Geist_Mono } from "next/font/google";
import { Provider } from "react-redux";
import { Toaster } from "sonner";
import "./globals.css";
import { store } from "./store";
const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <Provider store={store}>
          <main>{children}</main>
          <Toaster />
        </Provider>
      </body>
    </html>
  );
}

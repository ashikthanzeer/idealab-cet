import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "AICTE IDEA Lab - CET",
  description: "Official site of AICTE IDEA LAB - CET",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <head>
        <link
          rel="stylesheet"
          type="text/css"
          href="https://cdn.jsdelivr.net/npm/@phosphor-icons/web@2.1.1/src/regular/style.css"
        />
        <link
          rel="stylesheet"
          type="text/css"
          href="https://cdn.jsdelivr.net/npm/@phosphor-icons/web@2.1.1/src/bold/style.css"
        />
        <link
          rel="stylesheet"
          type="text/css"
          href="https://cdn.jsdelivr.net/npm/@phosphor-icons/web@2.1.1/src/fill/style.css"
        />
      </head>
      <body className="min-h-full flex flex-col">
        <div>
        {children}
        </div>

        
        <section
          id="footer"
          className="px-6 py-10 md:px-10 md:py-10 bg-secondary text-white"
        >
          <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-6">
            <div className="flex flex-row gap-4">
              <img
                src="/icon.png"
                className="block size-20"
                alt="AICTE IDEA LAB, CET Icon"
              />
              <a className="block" href="https://cet.ac.in">
                <img src="/cet.png" className="block size-20" alt="CET Icon" />
              </a>
            </div>

            <div>
              <p className="font-semibold mb-2">AICTE IDEA Lab CET</p>
              <p className="text-neutral-300">
                Empowering innovators of today to build a better tomorrow.
              </p>
            </div>

            <div>
              <p className="font-semibold mb-2">Quick Links</p>
              <div className="grid grid-cols-2 gap-y-1 gap-x-4 text-neutral-300 [&>p]:hover:underline">
                <a href="/">Home</a>
                <a href="/#about">About</a>
                <a href="/components">Components</a>
                <a href="/tools">Tools</a>
                <a href="/#facilities">Facliities</a>
                <a href="/gallery">Gallery</a>
                <a href="/#footer">Contact</a>
              </div>
            </div>

            <div>
              <p className="font-semibold mb-2">Contact Us</p>

              <div className="flex flex-col gap-1 text-neutral-300">
                <div className="inline-flex item-center gap-1.5">
                  <i className="ph ph-map-pin text-lg pt-1"></i>
                  <a href="https://share.google/uXFEpax5F4q5XBuM0">
                    College Of Engineering Trivandrum Thiruvananthapuram,
                    Kerala, India
                  </a>
                </div>
                <div className="inline-flex item-center gap-1.5">
                  <i className="ph ph-envelope text-lg pt-1"></i>
                  <a href="mailto:iic@cet.ac.in">iic@cet.ac.in</a>
                </div>
                <div className="inline-flex item-center gap-1.5">
                  <i className="ph ph-phone text-lg pt-1"></i>
                  <a href="tel:9447525215">9447525215</a>
                </div>
              </div>
            </div>
          </div>

          <p className="text-xs text-neutral-300 mt-6">
            Copyright <i className="ph ph-copyright inline-block"></i>{" "}
            {new Date().getFullYear()} IIC Developers Team, College Of
            Engineering Trivandrum
          </p>
        </section>
        </body>
    </html>
  );
}

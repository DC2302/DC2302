import "./globals.css";

export const metadata = {
  title: "OSO Content Design (OCD)",
  description:
    "Brand intake for the OSO agentic content pipeline — upload your brand, we produce your videos.",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}

import './globals.css';

export const metadata = {
  title: 'Racing Picks',
  description: "Today's race cards at every track, with model picks you can audit.",
};

export const viewport = { width: 'device-width', initialScale: 1 };

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}

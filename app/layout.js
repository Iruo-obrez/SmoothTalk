import { ClerkProvider } from '@clerk/nextjs';

export const metadata = {
  title: 'SmoothTalk',
  description: 'Effortless, natural texting assistant',
};

export default function RootLayout({ children }) {
  return (
    <ClerkProvider>
      <html lang="en">
        <body className="bg-black text-white antialiased">{children}</body>
      </html>
    </ClerkProvider>
  );
}

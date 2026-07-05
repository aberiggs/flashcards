'use client';

import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { PageLoader } from '@/components/ui/PageLoader';
import { Footer } from '@/components/layout/Footer';

export default function ProtectedLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { status } = useSession();
  const router = useRouter();

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.replace('/');
    }
  }, [status, router]);

  if (status === 'loading' || status === 'unauthenticated') {
    return <PageLoader fullScreen />;
  }

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col">
      {children}
      <Footer />
    </div>
  );
}
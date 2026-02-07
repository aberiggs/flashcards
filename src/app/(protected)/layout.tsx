'use client';

import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { Authenticated, Unauthenticated, AuthLoading } from 'convex/react';
import { PageLoader } from '@/components/ui/PageLoader';

function RedirectToHome() {
  const router = useRouter();
  useEffect(() => {
    router.replace('/');
  }, [router]);
  return <PageLoader fullScreen />;
}

export default function ProtectedLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <>
      <AuthLoading>
        <PageLoader fullScreen />
      </AuthLoading>
      <Unauthenticated>
        <RedirectToHome />
      </Unauthenticated>
      <Authenticated>{children}</Authenticated>
    </>
  );
}

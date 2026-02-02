'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { isLoggedIn, getUserRole } from '@/lib/auth';

export default function HomePage() {
  const router = useRouter();

  useEffect(() => {
    // Check authentication and redirect accordingly
    if (!isLoggedIn()) {
      router.push('/login');
      return;
    }

    const role = getUserRole();
    if (role === 'ADMIN') {
      router.push('/admin/jobs');
    } else if (role === 'STUDENT') {
      router.push('/student/dashboard');
    } else {
      router.push('/login');
    }
  }, [router]);

  return (
    <div style={{
      display: 'flex',
      justifyContent: 'center',
      alignItems: 'center',
      height: '100vh'
    }}>
      <p>Redirecting...</p>
    </div>
  );
}

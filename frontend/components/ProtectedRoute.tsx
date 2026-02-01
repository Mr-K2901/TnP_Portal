'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { isLoggedIn, getUserRole } from '@/lib/auth';

interface ProtectedRouteProps {
    children: React.ReactNode;
    allowedRoles?: ('STUDENT' | 'ADMIN')[];
}

/**
 * Protects routes based on authentication and role
 * 
 * Usage:
 *   <ProtectedRoute allowedRoles={['STUDENT']}>
 *     <StudentDashboard />
 *   </ProtectedRoute>
 */
export default function ProtectedRoute({
    children,
    allowedRoles,
}: ProtectedRouteProps) {
    const router = useRouter();

    useEffect(() => {
        // Check if logged in
        if (!isLoggedIn()) {
            router.push('/login');
            return;
        }

        // Check role if specified
        if (allowedRoles && allowedRoles.length > 0) {
            const userRole = getUserRole();
            if (!userRole || !allowedRoles.includes(userRole)) {
                // Redirect to appropriate dashboard
                if (userRole === 'STUDENT') {
                    router.push('/student/dashboard');
                } else if (userRole === 'ADMIN') {
                    router.push('/admin/jobs');
                } else {
                    router.push('/login');
                }
            }
        }
    }, [router, allowedRoles]);

    // Don't render until auth check is complete
    if (typeof window !== 'undefined' && !isLoggedIn()) {
        return null;
    }

    return <>{children}</>;
}

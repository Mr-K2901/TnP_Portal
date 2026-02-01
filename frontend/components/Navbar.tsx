'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { getUserRole, removeToken, isLoggedIn } from '@/lib/auth';

export default function Navbar() {
    const router = useRouter();
    const role = getUserRole();
    const loggedIn = isLoggedIn();

    const handleLogout = () => {
        removeToken();
        router.push('/login');
    };

    return (
        <nav className="navbar">
            <div className="navbar-brand">
                <Link href="/">TnP Portal</Link>
            </div>

            <div className="navbar-links">
                {!loggedIn ? (
                    <Link href="/login">Login</Link>
                ) : (
                    <>
                        {role === 'STUDENT' && (
                            <>
                                <Link href="/student/dashboard">Dashboard</Link>
                                <Link href="/student/applications">My Applications</Link>
                            </>
                        )}

                        {role === 'ADMIN' && (
                            <>
                                <Link href="/admin/jobs">Jobs</Link>
                                <Link href="/admin/applications">Applications</Link>
                            </>
                        )}

                        <button onClick={handleLogout} className="logout-btn">
                            Logout
                        </button>
                    </>
                )}
            </div>
        </nav>
    );
}

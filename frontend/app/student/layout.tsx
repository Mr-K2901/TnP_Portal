'use client';

import SidebarLayout from '@/components/SidebarLayout';

export default function StudentLayout({ children }: { children: React.ReactNode }) {
    return (
        <SidebarLayout>
            {children}
        </SidebarLayout>
    );
}

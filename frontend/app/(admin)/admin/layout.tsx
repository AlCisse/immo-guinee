'use client';

import { AdminRoute } from '@/lib/auth/AuthContext';
import AdminSidebar from '@/components/layout/AdminSidebar';

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <AdminRoute>
      <div className="min-h-screen bg-neutral-50 dark:bg-dark-bg flex">
        {/* Sidebar */}
        <AdminSidebar />

        {/* Main content area */}
        <main className="flex-1 min-h-screen transition-all duration-300">
          <div className="p-4 sm:p-6 lg:p-8">
            {children}
          </div>
        </main>
      </div>
    </AdminRoute>
  );
}

import Sidebar from '@/components/layout/Sidebar';
import MobileBottomNav from '@/components/layout/MobileBottomNav';
import RightSidebar from '@/components/layout/RightSidebar'; // Import the new right sidebar
import I18nProvider from './I18nProvider';

export default function MainLayout({ children }: { children: React.ReactNode }) {
  return (
    <I18nProvider>
    {/* Main wrapper centering the app on huge screens */}
      <div className="max-w-7xl mx-auto flex min-h-screen justify-center relative">

        {/* Left Navigation (Desktop) */}
        <Sidebar />

        {/* Center Feed Column */}
        {/* On mobile, w-full. 
        On desktop, max-width matches the mockup's central feed width.
        pb-20 adds padding to the bottom on mobile so the bottom nav doesn't cover posts.
      */}
        <main className="flex-1 w-full sm:max-w-150 pb-20 md:pb-0">
          {children}
        </main>

        {/* Right Sidebar (Desktop) */}
        <RightSidebar />

        {/* Bottom Navigation (Mobile) */}
        <MobileBottomNav />

      </div>
    </I18nProvider>
  );
}
import Link from 'next/link';

export default function MobileBottomNav() {
  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 py-3 px-6 z-50 md:hidden">
      <div className="flex items-center justify-between max-w-md mx-auto">
        <Link href="/" className="text-gray-500 hover:text-teal-600 transition-colors">
          <span className="text-2xl">🏠</span>
        </Link>
        <Link href="/explore" className="text-gray-500 hover:text-teal-600 transition-colors">
          <span className="text-2xl">🔍</span>
        </Link>
        
        {/* Floating Action Button for Post */}
        <Link href="/compose" className="bg-teal-600 text-white rounded-full p-2 hover:bg-teal-700 transition-colors">
          <span className="text-2xl leading-none block w-6 h-6 text-center">+</span>
        </Link>
        
        <Link href="/notifications" className="text-gray-500 hover:text-teal-600 transition-colors">
          <span className="text-2xl">🔔</span>
        </Link>
        <Link href="/profile" className="text-gray-500 hover:text-teal-600 transition-colors">
          <span className="text-2xl">👤</span>
        </Link>
      </div>
    </nav>
  );
}
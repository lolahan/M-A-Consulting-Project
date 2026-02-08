import Link from 'next/link';
import { usePathname } from 'next/navigation';

export default function Header() {
    const pathname = usePathname();

    return (
        <header className="border-b border-gray-200 bg-white/80 backdrop-blur-md sticky top-0 z-50">
            <div className="container mx-auto px-6 py-4 flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="flex items-center gap-8">
                    <div>
                        <h1 className="text-xl font-bold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
                            License Renegotiation Decision Tool
                        </h1>
                        <p className="text-gray-400 text-xs mt-0.5">
                            Evaluating Strategic Licensing Scenarios
                        </p>
                    </div>

                    {/* Navigation */}
                    <nav className="hidden md:flex bg-gray-100/50 p-1 rounded-lg border border-gray-200">
                        <Link
                            href="/"
                            className={`px-4 py-1.5 text-xs font-bold rounded-md transition-all ${pathname === '/'
                                ? 'bg-white text-blue-600 shadow-sm ring-1 ring-black/5'
                                : 'text-gray-500 hover:text-gray-700 hover:bg-white/50'
                                }`}
                        >
                            Modeler
                        </Link>
                        <Link
                            href="/dashboard"
                            className={`px-4 py-1.5 text-xs font-bold rounded-md transition-all ${pathname === '/dashboard'
                                ? 'bg-white text-blue-600 shadow-sm ring-1 ring-black/5'
                                : 'text-gray-500 hover:text-gray-700 hover:bg-white/50'
                                }`}
                        >
                            Decision Dashboard
                        </Link>
                        <Link
                            href="/production"
                            className={`px-4 py-1.5 text-xs font-bold rounded-md transition-all ${pathname === '/production'
                                ? 'bg-white text-emerald-600 shadow-sm ring-1 ring-black/5'
                                : 'text-gray-500 hover:text-gray-700 hover:bg-white/50'
                                }`}
                        >
                            Production Optimiser
                        </Link>
                    </nav>
                </div>

                <div className="flex gap-4">

                </div>
            </div>
        </header>
    );
}

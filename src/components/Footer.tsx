import React from 'react';

export default function Footer() {
    return (
        <footer className="border-t border-gray-200 bg-white/50 py-8 mt-12">
            <div className="container mx-auto px-6 text-center">
                <p className="text-gray-500 text-sm">
                    &copy; {new Date().getFullYear()} True Clarity Consulting Ltd. All rights reserved. Confidential Property.
                </p>
                <div className="flex justify-center gap-6 mt-4">
                    <span className="text-xs text-gray-600 hover:text-gray-400 cursor-help transition-colors">Data Privacy</span>
                    <span className="text-xs text-gray-600 hover:text-gray-400 cursor-help transition-colors">Term Definitions</span>
                    <span className="text-xs text-gray-600 hover:text-gray-400 cursor-help transition-colors">Contact us</span>
                </div>
            </div>
        </footer>
    );
}

'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAccount, useConnect, useDisconnect } from 'wagmi';
import { useTheme } from './ThemeProvider';
import type { User } from '@/lib/types';

export default function Navbar() {
  const [user, setUser] = useState<User | null>(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const [avatarError, setAvatarError] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [walletError, setWalletError] = useState('');
  const pathname = usePathname();
  const { address, isConnected } = useAccount();
  const { connectAsync, connectors, isPending: walletConnecting } = useConnect();
  const { disconnect } = useDisconnect();
  const { theme, toggle } = useTheme();

  useEffect(() => { setMounted(true); }, []);

  useEffect(() => {
    setAvatarError(false);
    fetch('/api/auth/me')
      .then(res => res.json())
      .then(data => setUser(data.user))
      .catch(() => {});
  }, [pathname]);

  useEffect(() => {
    if (address && user) {
      fetch(`/api/users/${user.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ wallet_address: address }),
      }).catch(() => {});
    }
  }, [address, user]);

  const logout = async () => {
    await fetch('/api/auth/logout', { method: 'POST' });
    setUser(null);
    window.location.href = '/';
  };

  const handleConnect = async () => {
    setWalletError('');
    try {
      await connectAsync({ connector: connectors[0] });
    } catch {
      if (!(window as any).ethereum) {
        setWalletError('MetaMask not installed');
      } else {
        setWalletError('Connection cancelled or failed');
      }
    }
  };

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 bg-[var(--bg-surface)]/80 backdrop-blur-md border-b border-[var(--border-color)]">
      <div className="flex items-center justify-between px-4 h-14">
        <Link href="/" className="flex items-center gap-0">
          <span className="text-[var(--text-primary)] font-bold text-xl tracking-wider">V</span>
          <span className="relative inline-flex flex-col items-center justify-center w-[14px] h-[22px] mx-px" style={{ gap: '3px' }}>
            <span className="w-full h-[3px] bg-[var(--text-primary)] rounded-sm" />
            <span className="w-full h-[3px] bg-[var(--text-primary)] rounded-sm" />
            <span className="w-full h-[3px] bg-[var(--text-primary)] rounded-sm" />
          </span>
          <span className="text-[var(--text-primary)] font-bold text-xl tracking-wider">LO</span>
        </Link>

        <div className="flex items-center gap-3">
          {mounted && isConnected ? (
            <button
              onClick={() => disconnect()}
              className="text-xs text-green-400 bg-green-400/10 px-2 py-1 rounded-full border border-green-400/30"
            >
              {address?.slice(0, 6)}...{address?.slice(-4)}
            </button>
          ) : (
            <div className="relative">
              <button
                onClick={handleConnect}
                disabled={walletConnecting}
                className="text-xs text-purple-400 bg-purple-400/10 px-2 py-1 rounded-full border border-purple-400/30 disabled:opacity-50"
              >
                {walletConnecting ? 'Connecting...' : 'Connect Wallet'}
              </button>
              {walletError && (
                <div className="absolute right-0 top-8 bg-red-900 text-red-200 text-[10px] px-2 py-1 rounded whitespace-nowrap z-50 shadow-lg">
                  {walletError}
                </div>
              )}
            </div>
          )}

          <button onClick={toggle} className="text-sm text-[var(--text-secondary)] hover:text-[var(--text-primary)]">
            {theme === 'dark' ? (
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
              </svg>
            ) : (
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
              </svg>
            )}
          </button>

          {user ? (
            <div className="relative">
              <button onClick={() => setMenuOpen(!menuOpen)} className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-full bg-purple-500 overflow-hidden">
                  {user.avatar && !avatarError ? (
                    <img src={user.avatar} className="w-full h-full object-cover" onError={() => setAvatarError(true)} />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-white text-sm font-bold">
                      {user.display_name?.[0]?.toUpperCase() || 'U'}
                    </div>
                  )}
                </div>
              </button>
              {menuOpen && (
                <div className="absolute right-0 top-10 bg-gray-900 rounded-xl shadow-xl border border-white/10 py-2 min-w-[180px]">
                  <div className="px-4 py-2 border-b border-white/10">
                    <p className="text-white font-semibold text-sm">{user.display_name}</p>
                    <p className="text-white/50 text-xs">@{user.username}</p>
                  </div>
                  <Link href={`/profile/${user.id}`} className="block px-4 py-2 text-white/80 hover:text-white text-sm" onClick={() => setMenuOpen(false)}>
                    Profile
                  </Link>
                  <Link href="/edit-profile" className="block px-4 py-2 text-white/80 hover:text-white text-sm" onClick={() => setMenuOpen(false)}>
                    Edit Profile
                  </Link>
                  <button onClick={logout} className="w-full text-left px-4 py-2 text-red-400 hover:text-red-300 text-sm">
                    Logout
                  </button>
                </div>
              )}
            </div>
          ) : (
            <Link href="/login" className="bg-red-500 text-white px-4 py-1.5 rounded-full text-sm font-semibold">
              Login
            </Link>
          )}
        </div>
      </div>
    </nav>
  );
}

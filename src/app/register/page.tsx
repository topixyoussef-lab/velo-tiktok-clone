'use client';

import { useEffect, useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { countries } from '@/lib/countries';

export default function RegisterPage() {
  const [username, setUsername] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [password, setPassword] = useState('');
  const [age, setAge] = useState('');
  const [gender, setGender] = useState('');
  const [country, setCountry] = useState('');
  const [countryCode, setCountryCode] = useState('');
  const [detecting, setDetecting] = useState(true);
  const [search, setSearch] = useState('');
  const [open, setOpen] = useState(false);
  const [error, setError] = useState('');
  const dropdownRef = useRef<HTMLDivElement>(null);
  const router = useRouter();

  useEffect(() => {
    fetch('http://ip-api.com/json?fields=country,countryCode', { signal: AbortSignal.timeout(4000) })
      .then(r => r.json())
      .then(d => { if (d.country) { setCountry(d.country); setCountryCode(d.countryCode); setDetecting(false); } else { throw new Error(); } })
      .catch(() => {
        fetch('/api/country')
          .then(r => r.json())
          .then(d => { setCountry(d.country || ''); setCountryCode(d.countryCode || ''); setDetecting(false); })
          .catch(() => setDetecting(false));
      });
  }, []);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const filtered = countries.filter(c => c.name.toLowerCase().includes(search.toLowerCase())).slice(0, 50);
  const flag = (code: string) => {
    if (!code || code.length !== 2) return '';
    return String.fromCodePoint(0x1F1E6 + code.charCodeAt(0) - 65, 0x1F1E6 + code.charCodeAt(1) - 65);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!age || parseInt(age) < 1 || parseInt(age) > 150) {
      setError('Please enter a valid age');
      return;
    }

    try {
      const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, display_name: displayName, password, age, gender, country }),
      });

      if (res.ok) {
        router.push('/');
        router.refresh();
      } else {
        const data = await res.json();
        setError(data.error || 'Registration failed');
      }
    } catch {
      setError('Server error');
    }
  };

  return (
    <div className="h-full flex items-center justify-center px-4">
      <div className="w-full max-w-sm">
        <h1 className="text-3xl font-bold text-center mb-8">Sign up</h1>

        <form onSubmit={handleSubmit} className="space-y-4">
          <input
            type="text"
            placeholder="Username"
            value={username}
            onChange={e => setUsername(e.target.value)}
            className="w-full bg-white/10 text-white px-4 py-3 rounded-lg outline-none focus:ring-2 focus:ring-purple-500"
            required
          />
          <input
            type="text"
            placeholder="Display Name"
            value={displayName}
            onChange={e => setDisplayName(e.target.value)}
            className="w-full bg-white/10 text-white px-4 py-3 rounded-lg outline-none focus:ring-2 focus:ring-purple-500"
            required
          />
          <input
            type="number"
            placeholder="Age"
            value={age}
            onChange={e => setAge(e.target.value)}
            min="1"
            max="150"
            className="w-full bg-white/10 text-white px-4 py-3 rounded-lg outline-none focus:ring-2 focus:ring-purple-500"
            required
          />
          <select
            value={gender}
            onChange={e => setGender(e.target.value)}
            className="w-full bg-white/10 text-white px-4 py-3 rounded-lg outline-none focus:ring-2 focus:ring-purple-500"
            required
          >
            <option value="" disabled>Select Gender</option>
            <option value="male">Male</option>
            <option value="female">Female</option>
          </select>
          <div className="relative flex items-center w-full bg-white/10 rounded-lg" ref={dropdownRef}>
            {countryCode && <span className="text-xl pl-3">{flag(countryCode)}</span>}
            <input
              type="text"
              placeholder={detecting ? 'Detecting country...' : 'Select country'}
              value={open ? search : country}
              onFocus={() => { setOpen(true); setSearch(''); }}
              onChange={e => { setSearch(e.target.value); setOpen(true); }}
              className="flex-1 bg-transparent text-white px-3 py-3 rounded-lg outline-none"
            />
            {detecting ? (
              <div className="absolute right-3 top-1/2 -translate-y-1/2">
                <div className="w-4 h-4 border-2 border-purple-500 border-t-transparent rounded-full animate-spin" />
              </div>
            ) : (
              <svg className={`w-4 h-4 mr-3 text-white/50 transition-transform ${open ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            )}
            {open && (
              <div className="absolute top-full left-0 right-0 mt-1 bg-gray-800 border border-white/10 rounded-lg max-h-48 overflow-y-auto z-50 shadow-xl">
                {filtered.map(c => (
                  <button
                    key={c.code}
                    type="button"
                    onClick={() => { setCountry(c.name); setCountryCode(c.code); setOpen(false); setSearch(''); }}
                    className={`w-full flex items-center gap-2 px-3 py-2 text-left text-sm hover:bg-white/10 ${country === c.name ? 'bg-white/5 text-purple-400' : 'text-white'}`}
                  >
                    <span>{flag(c.code)}</span>
                    <span>{c.name}</span>
                  </button>
                ))}
                {filtered.length === 0 && <p className="px-3 py-2 text-white/40 text-sm">No countries found</p>}
              </div>
            )}
          </div>
          <input
            type="password"
            placeholder="Password"
            value={password}
            onChange={e => setPassword(e.target.value)}
            className="w-full bg-white/10 text-white px-4 py-3 rounded-lg outline-none focus:ring-2 focus:ring-purple-500"
            required
          />

          {error && <p className="text-red-400 text-sm">{error}</p>}

          <button type="submit" className="w-full bg-red-500 text-white py-3 rounded-lg font-semibold text-lg">
            Sign up
          </button>
        </form>

        <p className="text-center text-white/50 mt-6">
          Already have an account?{' '}
          <Link href="/login" className="text-purple-400 font-semibold">Log in</Link>
        </p>
      </div>
    </div>
  );
}

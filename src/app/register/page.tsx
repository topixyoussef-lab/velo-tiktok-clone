'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

export default function RegisterPage() {
  const [username, setUsername] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [password, setPassword] = useState('');
  const [age, setAge] = useState('');
  const [gender, setGender] = useState('');
  const [country, setCountry] = useState('');
  const [countryCode, setCountryCode] = useState('');
  const [detecting, setDetecting] = useState(true);
  const [error, setError] = useState('');
  const router = useRouter();

  const flag = (code: string) => {
    if (!code || code.length !== 2) return '';
    return String.fromCodePoint(0x1F1E6 + code.charCodeAt(0) - 65, 0x1F1E6 + code.charCodeAt(1) - 65);
  };

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
          <div className="relative flex items-center w-full bg-white/10 rounded-lg">
            {country && <span className="text-xl pl-3">{flag(countryCode)}</span>}
            <input
              type="text"
              placeholder="Country"
              value={country}
              readOnly
              className="flex-1 bg-transparent text-white/60 px-3 py-3 rounded-lg outline-none cursor-default"
            />
            {detecting && (
              <div className="absolute right-3 top-1/2 -translate-y-1/2">
                <div className="w-4 h-4 border-2 border-purple-500 border-t-transparent rounded-full animate-spin" />
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

'use client'

import React, { useState } from 'react';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [needsActivation, setNeedsActivation] = useState(false);

  const [success, setSuccess] = useState(false);

  // Mock data to simulate different user states
  const mockUsers = [
    { email: 'occupant@example.com', password: 'password123', role: 'occupant', isActivated: true, hasPassword: true },
    { email: 'admin@example.com', password: 'password123', role: 'admin', isActivated: true, hasPassword: true },
    { email: 'notactivated@example.com', password: 'password123', role: 'occupant', isActivated: false, hasPassword: true },
    { email: 'newoccupant@example.com', password: '', role: 'occupant', isActivated: false, hasPassword: false },
  ];

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setNeedsActivation(false);

    setSuccess(false);

    const user = mockUsers.find(u => u.email === email);

    if (!user) {
      setError('Email atau password salah.');
      return;
    }

    if (user.role !== 'occupant') {
      setError('Akses ditolak. Hanya user dengan role occupant yang dapat login.');
      return;
    }

    if (!user.isActivated) {
      setNeedsActivation(true);
      if (!user.hasPassword) {

        setError('Akun belum diaktivasi. Karena Anda belum membuat password, saat aktivasi Anda akan diarahkan untuk membuat password.');
      } else {
        setError('Akun belum diaktivasi. Silakan cek email Anda untuk aktivasi.');
      }
      return;
    }

    if (user.password !== password) {
      setError('Email atau password salah.');
      return;
    }

    setSuccess(true);
  };

  const handleResendActivation = () => {
    alert('Email aktivasi telah dikirim ulang ke ' + email);
  };

  return (
    <div className="min-h-screen bg-slate-100 flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8 bg-white p-8 rounded-xl shadow-md">
        <div>
          <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
            Login Occupant
          </h2>
          <p className="mt-2 text-center text-sm text-gray-600">
            Gunakan mock data berikut untuk testing:
            <br />
            - <span className="font-semibold">occupant@example.com</span> (Berhasil)
            <br />
            - <span className="font-semibold">admin@example.com</span> (Akses Ditolak)
            <br />
            - <span className="font-semibold">notactivated@example.com</span> (Belum Aktivasi)
            <br />
            - <span className="font-semibold">newoccupant@example.com</span> (Belum Aktivasi + Belum Ada Password)
          </p>
        </div>
        <form className="mt-8 space-y-6" onSubmit={handleLogin}>
          <div className="rounded-md shadow-sm -space-y-px">
            <div>
              <label htmlFor="email-address" className="sr-only">
                Email address
              </label>
              <input
                id="email-address"
                name="email"
                type="email"
                autoComplete="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="appearance-none rounded-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-t-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 focus:z-10 sm:text-sm"
                placeholder="Email address"
              />
            </div>
            <div>
              <label htmlFor="password" className="sr-only">
                Password
              </label>
              <input
                id="password"
                name="password"
                type="password"
                autoComplete="current-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="appearance-none rounded-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-b-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 focus:z-10 sm:text-sm"
                placeholder="Password"
              />
            </div>
          </div>

          {error && (
            <div className="rounded-md bg-red-50 p-4">
              <div className="flex">
                <div className="ml-3">
                  <h3 className="text-sm font-medium text-red-800">Error</h3>
                  <div className="mt-2 text-sm text-red-700">
                    <p>{error}</p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {success && (
            <div className="rounded-md bg-green-50 p-4">
              <div className="flex">
                <div className="ml-3">
                  <h3 className="text-sm font-medium text-green-800">Sukses</h3>
                  <div className="mt-2 text-sm text-green-700">
                    <p>Berhasil login sebagai occupant!</p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {needsActivation && (
            <div className="mt-4">
              <button
                type="button"
                onClick={handleResendActivation}
                className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-indigo-700 bg-indigo-100 hover:bg-indigo-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
              >
                Kirim ulang email aktivasi
              </button>
            </div>
          )}

          <div>
            <button
              type="submit"
              className="group relative w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
            >
              Sign in
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

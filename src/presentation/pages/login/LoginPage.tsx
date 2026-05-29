import React, { useState } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Card } from '../../components/ui/Card';
import { UtensilsCrossed } from 'lucide-react';
import toast from 'react-hot-toast';

export const LoginPage: React.FC = () => {
  const { signIn, signUp } = useAuth();
  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      if (mode === 'login') {
        await signIn(email, password);
        toast.success('Welcome back!');
      } else {
        await signUp(email, password, fullName);
        toast.success('Account created! Check your email to confirm.');
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Something went wrong';
      toast.error(message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-blue-100 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="w-20 h-20 bg-blue-600 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg">
            <UtensilsCrossed size={40} className="text-white" />
          </div>
          <h1 className="text-3xl font-bold text-gray-800">SIGC</h1>
          <p className="text-gray-600 mt-2">Integral Management System</p>
          <p className="text-xs text-gray-500 mt-1">By: Beronica Rosado</p>
        </div>

        <Card>
          {/* Tabs */}
          <div className="flex mb-6 bg-gray-100 rounded-lg p-1">
            <button
              onClick={() => setMode('login')}
              className={`flex-1 py-2 text-sm font-medium rounded-md transition-colors ${mode === 'login'
                  ? 'bg-white text-blue-600 shadow-sm'
                  : 'text-gray-500 hover:text-gray-700'
                }`}
            >
              Sign In
            </button>
            <button
              onClick={() => setMode('register')}
              className={`flex-1 py-2 text-sm font-medium rounded-md transition-colors ${mode === 'register'
                  ? 'bg-white text-blue-600 shadow-sm'
                  : 'text-gray-500 hover:text-gray-700'
                }`}
            >
              Register
            </button>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            {mode === 'register' && (
              <Input
                label="Full Name"
                type="text"
                placeholder="Beronica Rosado"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                required
              />
            )}
            <Input
              label="Email address"
              type="email"
              placeholder="admin@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
            <Input
              label="Password"
              type="password"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength={6}
            />
            <Button type="submit" loading={loading} className="w-full">
              {mode === 'login' ? 'Sign In' : 'Create Account'}
            </Button>
          </form>
        </Card>
      </div>
    </div>
  );
};
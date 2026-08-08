import React from 'react';
import { generatePageMetadata } from '@/lib/metadata';
import LoginForm from '@/components/admin/LoginForm';

export const metadata = generatePageMetadata({
  title: 'Staff Sign In',
  description: 'Restaurant operations console.',
  path: '/admin/login',
  noIndex: true,
});

export default function AdminLoginPage() {
  return (
    <div
      style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '1.5rem',
        background: 'radial-gradient(ellipse at top, rgba(200,155,60,0.08), transparent 60%)',
      }}
    >
      <LoginForm />
    </div>
  );
}

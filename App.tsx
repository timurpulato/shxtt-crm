import React, { useState } from 'react';
import { AuthProvider, useAuth } from './lib/AuthProvider';
import { Layout } from './components/Layout';
import { Dashboard } from './components/Dashboard';
import { StaffManagement } from './components/StaffManagement';
import { SalesManagement } from './components/SalesManagement';
import { Login } from './components/Login';
import { Onboarding } from './components/Onboarding';
import { ProfileView } from './components/ProfileView';
import { ChatSystem } from './components/ChatSystem';
import { Integrations } from './components/Integrations';
import { Toaster } from 'sonner';

const AppContent = () => {
  const { user, profile, loading } = useAuth();
  const [activeTab, setActiveTab] = useState('dashboard');

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin"></div>
          <p className="text-slate-500 font-medium">Loading MedCRM...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return <Login />;
  }

  if (!profile) {
    return <Onboarding />;
  }

  const renderContent = () => {
    switch (activeTab) {
      case 'dashboard': return <Dashboard />;
      case 'staff': return <StaffManagement />;
      case 'sales': return <SalesManagement />;
      case 'chat': return <ChatSystem />;
      case 'integrations': return <Integrations />;
      case 'profile': return <ProfileView />;
      default: return <Dashboard />;
    }
  };

  return (
    <Layout activeTab={activeTab} setActiveTab={setActiveTab}>
      {renderContent()}
    </Layout>
  );
};

export default function App() {
  return (
    <AuthProvider>
      <AppContent />
      <Toaster position="top-right" />
    </AuthProvider>
  );
}

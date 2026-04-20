import React from 'react';
import { useAuth } from '../lib/AuthProvider';
import { db } from '../lib/firebase';
import { collection, query, where, onSnapshot } from 'firebase/firestore';
import { 
  LayoutDashboard, 
  Users, 
  UserSquare2, 
  TrendingUp,
  GraduationCap, 
  Calendar, 
  CreditCard, 
  MessageSquare,
  Settings,
  LogOut,
  Menu,
  Bell,
  Search,
  Zap
} from 'lucide-react';
import { Button } from './ui/button';
import { ScrollArea } from './ui/scroll-area';
import { Avatar, AvatarFallback, AvatarImage } from './ui/avatar';
import { auth } from '../lib/firebase';
import { signOut } from 'firebase/auth';
import { motion } from 'motion/react';

const navItems = [
  { icon: LayoutDashboard, label: 'Dashboard', id: 'dashboard' },
  { icon: Users, label: 'Staff', id: 'staff' },
  { icon: TrendingUp, label: 'Sales', id: 'sales' },
  { icon: MessageSquare, label: 'Chat', id: 'chat' },
  { icon: Zap, label: 'Integratsiyalar', id: 'integrations' },
];

export const Layout: React.FC<{ children: React.ReactNode, activeTab: string, setActiveTab: (tab: string) => void }> = ({ children, activeTab, setActiveTab }) => {
  const { profile } = useAuth();
  const [hasUnread, setHasUnread] = React.useState(false);

  React.useEffect(() => {
    if (!profile?.uid) return;
    const q = query(
      collection(db, 'messages'),
      where('receiverId', '==', profile.uid),
      where('read', '==', false)
    );
    const unsubscribe = onSnapshot(q, (snapshot) => {
      setHasUnread(!snapshot.empty);
    });
    return () => unsubscribe();
  }, [profile?.uid]);

  const handleLogout = () => {
    signOut(auth);
  };

  const filteredNavItems = navItems.filter(item => {
    const role = profile?.role || '';
    const isAdminUser = profile?.email === 'magicalfx426@gmail.com' || role === 'admin';
    
    if (isAdminUser) return true;
    
    switch (item.id) {
      case 'dashboard': return true;
      case 'staff': return ['manager', 'HR'].includes(role);
      case 'sales': return ['manager', 'operator', 'HR'].includes(role);
      case 'chat': return true;
      case 'integrations': return isAdminUser;
      default: return true;
    }
  });

  return (
    <div className="flex h-screen bg-slate-50 overflow-hidden">
      {/* Sidebar */}
      <aside className="w-64 bg-white border-r border-slate-200 flex flex-col">
        <div className="p-6 flex items-center gap-3">
          <div className="w-10 h-10 bg-indigo-600 rounded-xl flex items-center justify-center text-white">
            <GraduationCap size={24} />
          </div>
          <h1 className="font-bold text-xl text-slate-900">MedCRM</h1>
        </div>

        <ScrollArea className="flex-1 px-4">
          <nav className="space-y-1 py-4">
            {filteredNavItems.map((item) => (
              <Button
                key={item.id}
                variant={activeTab === item.id ? 'secondary' : 'ghost'}
                className={`w-full justify-start gap-3 h-11 ${activeTab === item.id ? 'bg-indigo-50 text-indigo-700 hover:bg-indigo-100 hover:text-indigo-800' : 'text-slate-600'}`}
                onClick={() => setActiveTab(item.id)}
              >
                <item.icon size={20} />
                <span className="font-medium">{item.label}</span>
                {item.id === 'chat' && hasUnread && (
                  <span className="ml-auto w-2 h-2 rounded-full bg-indigo-600 shadow-[0_0_8px_rgba(79,70,229,0.6)]" />
                )}
              </Button>
            ))}
          </nav>
        </ScrollArea>

        <div className="p-4 border-t border-slate-200">
          <button 
            className={`w-full flex items-center gap-3 p-2 mb-2 rounded-lg transition-colors text-left ${activeTab === 'profile' ? 'bg-indigo-50 border border-indigo-100' : 'hover:bg-slate-50'}`}
            onClick={() => setActiveTab('profile')}
          >
            <Avatar>
              <AvatarImage src={profile?.photoURL} />
              <AvatarFallback>{profile?.fullName?.charAt(0) || 'U'}</AvatarFallback>
            </Avatar>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-slate-900 truncate">{profile?.fullName || 'User'}</p>
              <p className="text-xs text-slate-500 truncate capitalize">{profile?.role || 'Role'}</p>
            </div>
          </button>
          <Button variant="ghost" className="w-full justify-start gap-3 text-red-600 hover:text-red-700 hover:bg-red-50" onClick={handleLogout}>
            <LogOut size={20} />
            <span className="font-medium">Logout</span>
          </Button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col overflow-hidden">
        {/* Header */}
        <header className="h-16 bg-white border-bottom border-slate-200 flex items-center justify-between px-8 shrink-0">
          <div className="flex items-center gap-4 flex-1">
            <div className="relative w-96">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
              <input 
                type="text" 
                placeholder="Search staff, sales, or messages..." 
                className="w-full pl-10 pr-4 py-2 bg-slate-100 border-none rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
              />
            </div>
          </div>
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon" className="text-slate-500">
              <Bell size={20} />
            </Button>
            <Button variant="ghost" size="icon" className="text-slate-500">
              <Settings size={20} />
            </Button>
          </div>
        </header>

        {/* Content Area */}
        <ScrollArea className="flex-1 p-8">
          <motion.div
            key={activeTab}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.2 }}
          >
            {children}
          </motion.div>
        </ScrollArea>
      </main>
    </div>
  );
};

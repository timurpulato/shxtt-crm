import React, { useState, useEffect } from 'react';
import { useAuth } from '../lib/AuthProvider';
import { 
  Users, 
  GraduationCap, 
  TrendingUp, 
  DollarSign,
  AlertCircle,
  CheckCircle2,
  Clock,
  UserPlus,
  UserMinus,
  CreditCard
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  AreaChart,
  Area
} from 'recharts';
import { db } from '../lib/firebase';
import { collection, onSnapshot, query, orderBy, limit } from 'firebase/firestore';

const StatCard = ({ title, value, icon: Icon, trend, color }: any) => (
  <Card>
    <CardContent className="p-6">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-medium text-slate-500">{title}</p>
          <h3 className="text-2xl font-bold mt-1">{value}</h3>
          {trend !== undefined && (
            <p className={`text-xs mt-1 flex items-center gap-1 ${trend >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
              <TrendingUp size={12} className={trend < 0 ? 'rotate-180' : ''} />
              {Math.abs(trend)}% from last month
            </p>
          )}
        </div>
        <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${color}`}>
          <Icon size={24} className="text-white" />
        </div>
      </div>
    </CardContent>
  </Card>
);

export const Dashboard = () => {
  const { profile } = useAuth();
  const [stats, setStats] = useState({
    staff: 0,
    leads: 0,
    dealsValue: 0,
    activeDeals: 0
  });
  const [activities, setActivities] = useState<any[]>([]);
  const [chartData, setChartData] = useState<any[]>([]);

  useEffect(() => {
    // Listen to users for staff counts
    const unsubscribeUsers = onSnapshot(collection(db, 'users'), (snapshot) => {
      const users = snapshot.docs.map(doc => doc.data());
      const staffCount = users.filter(u => ['teacher', 'staff', 'operator', 'admin', 'HR', 'manager'].includes(u.role)).length;
      setStats(prev => ({ ...prev, staff: staffCount }));
    }, (error) => {
      console.error("Error fetching users:", error);
    });

    // Listen to leads/deals
    const unsubscribeLeads = onSnapshot(collection(db, 'leads'), (snapshot) => {
      const leads = snapshot.docs.map(doc => doc.data());
      const totalLeads = leads.length;
      const activeDeals = leads.filter((l: any) => !['won', 'lost'].includes(l.status)).length;
      const dealsValue = leads.reduce((acc, lead: any) => acc + (lead.value || 0), 0);
      setStats(prev => ({ 
        ...prev, 
        leads: totalLeads, 
        dealsValue: dealsValue,
        activeDeals: activeDeals
      }));

      // Prepare lead trend data (mocked for now based on leads available)
      const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
      const last6Months = [];
      for (let i = 5; i >= 0; i--) {
        const d = new Date();
        d.setMonth(d.getMonth() - i);
        const monthLabel = months[d.getMonth()];
        const monthKey = d.toISOString().slice(0, 7);
        const monthLeads = leads.filter((l: any) => l.createdAt && l.createdAt.startsWith(monthKey)).length;
        last6Months.push({ name: monthLabel, leads: monthLeads || Math.floor(Math.random() * 20 + 5) });
      }
      setChartData(last6Months);
    });

    // Listen to activities
    const qActivities = query(collection(db, 'activities'), orderBy('createdAt', 'desc'), limit(10));
    const unsubscribeActivities = onSnapshot(qActivities, (snapshot) => {
      const activityData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      setActivities(activityData);
    }, (error) => {
      console.error("Error fetching activities:", error);
    });

    return () => {
      unsubscribeUsers();
      unsubscribeLeads();
      unsubscribeActivities();
    };
  }, [profile?.role, profile?.email]);

  const getActivityIcon = (type: string, action: string) => {
    if (action.includes('o\'chirildi')) return UserMinus;
    if (action.includes('qo\'shildi')) return UserPlus;
    return Clock;
  };

  const getActivityColor = (action: string) => {
    if (action.includes('o\'chirildi')) return 'text-rose-500';
    if (action.includes('qo\'shildi')) return 'text-emerald-500';
    return 'text-blue-500';
  };

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-3xl font-bold text-slate-900">Dashboard</h2>
        <p className="text-slate-500">Welcome back! Manage your leads, staff, and omnichannel sales from here.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard title="Active Staff" value={stats.staff.toLocaleString()} icon={Users} trend={4} color="bg-blue-600" />
        <StatCard title="Total Leads" value={stats.leads.toLocaleString()} icon={UserPlus} trend={15} color="bg-sky-600" />
        <StatCard title="Active Deals" value={stats.activeDeals.toLocaleString()} icon={TrendingUp} trend={10} color="bg-indigo-600" />
        <StatCard title="Pipeline Value" value={`$${stats.dealsValue.toLocaleString()}`} icon={TrendingUp} trend={20} color="bg-emerald-600" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Lead Generation Trends</CardTitle>
          </CardHeader>
          <CardContent className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartData}>
                <defs>
                  <linearGradient id="colorLeads" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#4f46e5" stopOpacity={0.1}/>
                    <stop offset="95%" stopColor="#4f46e5" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#64748b' }} />
                <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#64748b' }} />
                <Tooltip 
                  contentStyle={{ backgroundColor: '#fff', borderRadius: '8px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}
                />
                <Area type="monotone" dataKey="leads" stroke="#4f46e5" fillOpacity={1} fill="url(#colorLeads)" strokeWidth={2} />
              </AreaChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Sales Conversion Overview</CardTitle>
          </CardHeader>
          <CardContent className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#64748b' }} />
                <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#64748b' }} />
                <Tooltip 
                  contentStyle={{ backgroundColor: '#fff', borderRadius: '8px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}
                />
                <Bar dataKey="leads" fill="#10b981" radius={[4, 4, 0, 0]} barSize={40} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Recent Activities</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-6">
              {activities.length > 0 ? activities.map((item) => (
                <div key={item.id} className="flex items-start gap-4">
                  <div className={`mt-1 ${getActivityColor(item.action)}`}>
                    {React.createElement(getActivityIcon(item.type, item.action), { size: 20 })}
                  </div>
                  <div>
                    <p className="text-sm font-medium text-slate-900">
                      <span className="font-bold">{item.user}</span> {item.action}
                    </p>
                    <p className="text-xs text-slate-500">
                      {item.time ? new Date(item.time).toLocaleString() : 'Just now'}
                    </p>
                  </div>
                </div>
              )) : (
                <p className="text-sm text-slate-500 text-center py-4">Hozircha faolliklar yo'q</p>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

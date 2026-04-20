import React, { useState, useEffect } from 'react';
import { useAuth } from '../lib/AuthProvider';
import { db } from '../lib/firebase';
import { 
  collection, 
  addDoc, 
  onSnapshot, 
  query, 
  orderBy, 
  serverTimestamp,
  where,
  doc,
  updateDoc,
  deleteDoc
} from 'firebase/firestore';
import { 
  UserPlus, 
  Search, 
  Filter, 
  TrendingUp, 
  CheckCircle2, 
  XCircle, 
  Clock,
  Phone,
  Calendar,
  User,
  MoreVertical,
  BarChart3,
  Users as UsersIcon,
  LayoutGrid,
  List,
  Plus,
  ArrowRight,
  ShieldCheck,
  Instagram,
  Send as TelegramIcon,
  Globe,
  MoreHorizontal
} from 'lucide-react';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogTrigger,
  DialogFooter
} from './ui/dialog';
import { Label } from './ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Badge } from './ui/badge';
import { toast } from 'sonner';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuTrigger 
} from './ui/dropdown-menu';
import { motion, Reorder } from 'motion/react';

interface Deal {
  id: string;
  fullName: string;
  phoneNumber: string;
  email?: string;
  status: 'new' | 'contacted' | 'qualified' | 'proposal' | 'negotiation' | 'won' | 'lost';
  value: number;
  source: 'website' | 'telegram' | 'instagram' | 'manual' | 'call';
  assignedManagerId: string;
  assignedManagerName: string;
  createdAt: any;
  notes?: string[];
}

const STAGES = [
  { id: 'new', label: 'Yangi', color: 'bg-indigo-500' },
  { id: 'contacted', label: 'Bog\'lanildi', color: 'bg-blue-500' },
  { id: 'qualified', label: 'Saralandi', color: 'bg-sky-500' },
  { id: 'proposal', label: 'Taklif', color: 'bg-amber-500' },
  { id: 'negotiation', label: 'Muzokara', color: 'bg-orange-500' },
  { id: 'won', label: 'Yutildi', color: 'bg-emerald-500' },
  { id: 'lost', label: 'Yutqazildi', color: 'bg-rose-500' }
];

export const SalesManagement = () => {
  const { profile } = useAuth();
  const [deals, setDeals] = useState<Deal[]>([]);
  const [integrations, setIntegrations] = useState<any[]>([]);
  const [viewMode, setViewMode] = useState<'kanban' | 'list'>('kanban');
  const [searchTerm, setSearchTerm] = useState('');
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [formData, setFormData] = useState({
    fullName: '',
    phoneNumber: '',
    email: '',
    value: 0,
    source: 'manual' as Deal['source'],
    status: 'new' as Deal['status']
  });

  useEffect(() => {
    const q = query(collection(db, 'leads'), orderBy('createdAt', 'desc'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as Deal[];
      setDeals(data);
    });

    const unsubscribeIntegrations = onSnapshot(collection(db, 'integrations'), (snapshot) => {
      setIntegrations(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    });

    return () => {
      unsubscribe();
      unsubscribeIntegrations();
    };
  }, []);

  const handleUpdateDealStatus = async (dealId: string, newStatus: Deal['status']) => {
    try {
      await updateDoc(doc(db, 'leads', dealId), {
        status: newStatus,
        updatedAt: serverTimestamp()
      });
      toast.success(`Deal status updated to ${newStatus}`);
    } catch (error) {
      toast.error('Failed to update deal');
    }
  };

  const handleCreateDeal = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profile) return;
    try {
      await addDoc(collection(db, 'leads'), {
        ...formData,
        assignedManagerId: profile.uid,
        assignedManagerName: profile.fullName,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      });
      setIsAddDialogOpen(false);
      setFormData({ fullName: '', phoneNumber: '', email: '', value: 0, source: 'manual', status: 'new' });
      toast.success('Yangi bitim yaratildi');
    } catch (err) {
      toast.error('Xatolik yuz berdi');
    }
  };

  const getSourceIcon = (source: string) => {
    switch (source) {
      case 'telegram': return <TelegramIcon size={14} className="text-sky-500" />;
      case 'instagram': return <Instagram size={14} className="text-pink-500" />;
      case 'website': return <Globe size={14} className="text-indigo-500" />;
      default: return <User size={14} className="text-slate-400" />;
    }
  };

  const stats = {
    total: deals.length,
    active: deals.filter(d => !['won', 'lost'].includes(d.status)).length,
    revenue: deals.filter(d => d.status === 'won').reduce((acc, d) => acc + (d.value || 0), 0),
    pipeline: deals.filter(d => !['won', 'lost'].includes(d.status)).reduce((acc, d) => acc + (d.value || 0), 0)
  };

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h2 className="text-3xl font-bold text-slate-900">Pipeline Management</h2>
          <p className="text-slate-500 italic">Maximize your sales performance with Bitrix-style CRM</p>
        </div>
        <div className="flex items-center gap-3">
          <Tabs value={viewMode} onValueChange={(v: any) => setViewMode(v)} className="bg-slate-100 p-1 rounded-lg">
            <TabsList>
              <TabsTrigger value="kanban" className="gap-2"><LayoutGrid size={16} /> Kanban</TabsTrigger>
              <TabsTrigger value="list" className="gap-2"><List size={16} /> List</TabsTrigger>
            </TabsList>
          </Tabs>
          <Button onClick={() => setIsAddDialogOpen(true)} className="bg-indigo-600 hover:bg-indigo-700 shadow-indigo-200 shadow-lg">
            <Plus size={18} className="mr-2" /> Add Deal
          </Button>
        </div>
      </div>

      {/* Stats Overview */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card className="bg-white border-none shadow-sm overflow-hidden group">
          <CardContent className="p-6 relative">
            <div className="flex justify-between items-center mb-2">
              <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">Active Pipeline</span>
              <TrendingUp size={20} className="text-indigo-500" />
            </div>
            <h4 className="text-2xl font-black text-slate-900">${stats.pipeline.toLocaleString()}</h4>
            <div className="absolute bottom-0 left-0 w-full h-1 bg-indigo-500 transform scale-x-0 group-hover:scale-x-100 transition-transform origin-left duration-500" />
          </CardContent>
        </Card>
        <Card className="bg-white border-none shadow-sm overflow-hidden group">
          <CardContent className="p-6 relative">
            <div className="flex justify-between items-center mb-2">
              <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">Total Won</span>
              <CheckCircle2 size={20} className="text-emerald-500" />
            </div>
            <h4 className="text-2xl font-black text-slate-900">${stats.revenue.toLocaleString()}</h4>
            <div className="absolute bottom-0 left-0 w-full h-1 bg-emerald-500 transform scale-x-0 group-hover:scale-x-100 transition-transform origin-left duration-500" />
          </CardContent>
        </Card>
        <Card className="bg-white border-none shadow-sm overflow-hidden group">
          <CardContent className="p-6 relative">
            <div className="flex justify-between items-center mb-2">
              <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">Open Deals</span>
              <Clock size={20} className="text-amber-500" />
            </div>
            <h4 className="text-2xl font-black text-slate-900">{stats.active}</h4>
            <div className="absolute bottom-0 left-0 w-full h-1 bg-amber-500 transform scale-x-0 group-hover:scale-x-100 transition-transform origin-left duration-500" />
          </CardContent>
        </Card>
        <Card className="bg-white border-none shadow-sm overflow-hidden group">
          <CardContent className="p-6 relative">
            <div className="flex justify-between items-center mb-2">
              <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">Conv. Rate</span>
              <ShieldCheck size={20} className="text-blue-500" />
            </div>
            <h4 className="text-2xl font-black text-slate-900">
              {Math.round((deals.filter(d => d.status === 'won').length / (deals.length || 1)) * 100)}%
            </h4>
            <div className="absolute bottom-0 left-0 w-full h-1 bg-blue-500 transform scale-x-0 group-hover:scale-x-100 transition-transform origin-left duration-500" />
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="pipeline" className="space-y-6">
        <TabsList className="bg-white p-1 border-b rounded-none w-full justify-start overflow-x-auto">
          <TabsTrigger value="pipeline" className="rounded-none border-b-2 border-transparent data-[state=active]:border-indigo-600 data-[state=active]:bg-transparent">Pipeline</TabsTrigger>
          <TabsTrigger value="stats" className="rounded-none border-b-2 border-transparent data-[state=active]:border-indigo-600 data-[state=active]:bg-transparent">Analytics</TabsTrigger>
          <TabsTrigger value="integrations" className="rounded-none border-b-2 border-transparent data-[state=active]:border-indigo-600 data-[state=active]:bg-transparent">Integrations</TabsTrigger>
        </TabsList>

        <TabsContent value="pipeline">
          {viewMode === 'kanban' ? (
            <div className="flex gap-6 overflow-x-auto pb-8 min-h-[600px] -mx-8 px-8">
              {STAGES.map((stage) => (
                <div key={stage.id} className="min-w-[280px] w-80 space-y-4">
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-2">
                      <div className={`w-2 h-2 rounded-full ${stage.color}`} />
                      <h3 className="font-black text-slate-700 uppercase text-xs tracking-widest">{stage.label}</h3>
                      <span className="text-slate-400 text-xs font-bold bg-slate-100 px-1.5 py-0.5 rounded">
                        {deals.filter(d => d.status === stage.id).length}
                      </span>
                    </div>
                    <span className="text-[10px] font-bold text-slate-400">
                      ${deals.filter(d => d.status === stage.id).reduce((acc, d) => acc + (d.value || 0), 0).toLocaleString()}
                    </span>
                  </div>

                  <div className="space-y-4">
                    {deals.filter(d => d.status === stage.id).map((deal) => (
                      <motion.div
                        key={deal.id}
                        layoutId={deal.id}
                        className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm hover:shadow-md transition-shadow cursor-grab group relative"
                      >
                        <div className="flex justify-between items-start mb-2">
                          <Badge variant="outline" className="text-[10px] px-1.5 py-0 border-slate-200">
                            {deal.source}
                          </Badge>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="icon" className="h-6 w-6 opacity-0 group-hover:opacity-100">
                                <MoreHorizontal size={14} />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem className="text-xs">Edit Deal</DropdownMenuItem>
                              <DropdownMenuItem className="text-xs text-rose-500">Delete</DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </div>
                        <h5 className="font-bold text-slate-900 mb-1">{deal.fullName}</h5>
                        <div className="flex items-center gap-2 text-xs text-slate-500 mb-3">
                          <Phone size={12} /> {deal.phoneNumber}
                        </div>
                        <div className="flex items-center justify-between pt-3 border-t border-slate-100">
                          <span className="font-black text-indigo-600">${(deal.value || 0).toLocaleString()}</span>
                          <div className="flex gap-1">
                            {STAGES.filter(s => s.id !== deal.status).slice(0, 1).map(next => (
                              <Button 
                                key={next.id}
                                size="sm" 
                                variant="ghost" 
                                className="h-6 px-1.5 text-[10px] gap-1 hover:text-indigo-600"
                                onClick={() => handleUpdateDealStatus(deal.id, next.id as any)}
                              >
                                {next.label} <ArrowRight size={10} />
                              </Button>
                            ))}
                          </div>
                        </div>
                      </motion.div>
                    ))}
                    {deals.filter(d => d.status === stage.id).length === 0 && (
                      <div className="h-32 rounded-xl border-2 border-dashed border-slate-200 flex items-center justify-center text-slate-300 text-xs italic">
                        No deals here
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <Card className="border-none shadow-sm overflow-hidden">
              <table className="w-full text-left">
                <thead className="bg-slate-50 border-b border-slate-200">
                  <tr>
                    <th className="p-4 text-[10px] font-black uppercase text-slate-500 tracking-widest">Client</th>
                    <th className="p-4 text-[10px] font-black uppercase text-slate-500 tracking-widest">Status</th>
                    <th className="p-4 text-[10px] font-black uppercase text-slate-500 tracking-widest">Value</th>
                    <th className="p-4 text-[10px] font-black uppercase text-slate-500 tracking-widest">Source</th>
                    <th className="p-4 text-[10px] font-black uppercase text-slate-500 tracking-widest">Date</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 bg-white">
                  {deals.map(deal => (
                    <tr key={deal.id} className="hover:bg-slate-50/50">
                      <td className="p-4">
                        <div className="font-bold text-slate-900">{deal.fullName}</div>
                        <div className="text-xs text-slate-500">{deal.phoneNumber}</div>
                      </td>
                      <td className="p-4">
                        <Badge className={`${STAGES.find(s => s.id === deal.status)?.color} text-white border-none uppercase text-[10px]`}>
                          {STAGES.find(s => s.id === deal.status)?.label}
                        </Badge>
                      </td>
                      <td className="p-4 font-black">${(deal.value || 0).toLocaleString()}</td>
                      <td className="p-4 flex items-center gap-2">
                        {getSourceIcon(deal.source)}
                        <span className="text-xs capitalize">{deal.source}</span>
                      </td>
                      <td className="p-4 text-xs text-slate-500">
                        {deal.createdAt?.toDate ? deal.createdAt.toDate().toLocaleDateString() : 'N/A'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="integrations">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <Card className="bg-white border-slate-200 shadow-sm overflow-hidden border-2 border-white hover:border-sky-100 transition-colors">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-sky-50 flex items-center justify-center text-sky-500">
                    <TelegramIcon size={24} />
                  </div>
                  <CardTitle className="text-lg font-bold">Telegram</CardTitle>
                </div>
                <Badge className="bg-emerald-500">Active</Badge>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-slate-500 mb-6">Mijozlar bilan Telegram bot orqali bog'laning. Barcha xabarlar CRM'da ko'rinadi.</p>
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label className="text-xs font-bold uppercase text-slate-400">Webhook URL</Label>
                    <div className="bg-slate-50 p-2 rounded border border-slate-200 truncate text-[10px] font-mono">
                      {window.location.origin}/api/webhooks/telegram
                    </div>
                  </div>
                  <Button variant="outline" className="w-full">Configure Bot</Button>
                </div>
              </CardContent>
            </Card>

            <Card className="bg-white border-slate-200 shadow-sm overflow-hidden border-2 border-white hover:border-pink-100 transition-colors">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-pink-50 flex items-center justify-center text-pink-500">
                    <Instagram size={24} />
                  </div>
                  <CardTitle className="text-lg font-bold">Instagram</CardTitle>
                </div>
                <Badge className="bg-emerald-500">Active</Badge>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-slate-500 mb-6">Direct xabarlarni CRM orqali boshqaring. Connected to: <span className="font-bold text-pink-600">shxtt__uz</span></p>
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label className="text-xs font-bold uppercase text-slate-400">Webhook URL</Label>
                    <div className="bg-slate-50 p-2 rounded border border-slate-200 truncate text-[10px] font-mono">
                      {window.location.origin}/api/webhooks/instagram
                    </div>
                  </div>
                  <Button variant="outline" className="w-full">Configure Direct</Button>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>

      {/* Add Deal Dialog */}
      <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle className="text-2xl font-black">Yangi Bitim</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleCreateDeal} className="space-y-6 pt-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-xs font-bold uppercase">Mijoz Ismi</Label>
                <Input value={formData.fullName} onChange={e => setFormData({...formData, fullName: e.target.value})} placeholder="Ali Valiyev" required />
              </div>
              <div className="space-y-2">
                <Label className="text-xs font-bold uppercase">Telefon</Label>
                <Input value={formData.phoneNumber} onChange={e => setFormData({...formData, phoneNumber: e.target.value})} placeholder="+998..." required />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-xs font-bold uppercase">Bitim Qiymati ($)</Label>
                <Input type="number" value={formData.value} onChange={e => setFormData({...formData, value: Number(e.target.value)})} placeholder="0" />
              </div>
              <div className="space-y-2">
                <Label className="text-xs font-bold uppercase">Manba</Label>
                <Select value={formData.source} onValueChange={(v: any) => setFormData({...formData, source: v})}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="manual">Manual</SelectItem>
                    <SelectItem value="telegram">Telegram</SelectItem>
                    <SelectItem value="instagram">Instagram</SelectItem>
                    <SelectItem value="website">Website</SelectItem>
                    <SelectItem value="call">Call</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <DialogFooter>
              <Button type="button" variant="ghost" onClick={() => setIsAddDialogOpen(false)}>Bekor qilish</Button>
              <Button type="submit" className="bg-indigo-600 px-8">Saqlash</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
};

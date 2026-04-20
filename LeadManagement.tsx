import React, { useState, useEffect } from 'react';
import { 
  Plus, 
  Search, 
  MoreVertical, 
  MessageSquare,
  Phone,
  Clock,
  ArrowRight,
  UserPlus
} from 'lucide-react';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Badge } from './ui/badge';
import { ScrollArea } from './ui/scroll-area';
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogTrigger 
} from './ui/dialog';
import { Label } from './ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { db } from '../lib/firebase';
import { collection, addDoc, onSnapshot, query, orderBy } from 'firebase/firestore';
import { toast } from 'sonner';

const LeadCard = ({ lead }: any) => {
  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'new': return <Badge className="bg-blue-100 text-blue-700 hover:bg-blue-100 border-none">New</Badge>;
      case 'contacted': return <Badge className="bg-amber-100 text-amber-700 hover:bg-amber-100 border-none">Contacted</Badge>;
      case 'exam': return <Badge className="bg-indigo-100 text-indigo-700 hover:bg-indigo-100 border-none">Exam</Badge>;
      case 'enrolled': return <Badge className="bg-emerald-100 text-emerald-700 hover:bg-emerald-100 border-none">Enrolled</Badge>;
      case 'rejected': return <Badge className="bg-rose-100 text-rose-700 hover:bg-rose-100 border-none">Rejected</Badge>;
      default: return <Badge>{status}</Badge>;
    }
  };

  return (
    <Card className="hover:shadow-md transition-shadow cursor-pointer">
      <CardContent className="p-4">
        <div className="flex justify-between items-start mb-3">
          <div>
            <h4 className="font-bold text-slate-900">{lead.name}</h4>
            <p className="text-xs text-slate-500 flex items-center gap-1 mt-1">
              <Phone size={12} /> {lead.phone}
            </p>
          </div>
          {getStatusBadge(lead.status)}
        </div>
        <p className="text-sm text-slate-600 line-clamp-2 mb-4">{lead.notes}</p>
        <div className="flex items-center justify-between pt-3 border-t border-slate-100">
          <div className="flex items-center gap-1 text-xs text-slate-400">
            <Clock size={12} /> {new Date(lead.createdAt).toLocaleDateString()}
          </div>
          <div className="flex gap-2">
            <Button variant="ghost" size="icon" className="h-8 w-8 text-slate-400 hover:text-indigo-600">
              <MessageSquare size={14} />
            </Button>
            <Button variant="ghost" size="icon" className="h-8 w-8 text-slate-400 hover:text-indigo-600">
              <ArrowRight size={14} />
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export const LeadManagement = () => {
  const columns = ['new', 'contacted', 'exam', 'enrolled'];
  const [leads, setLeads] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    phone: '',
    status: 'new',
    notes: ''
  });

  useEffect(() => {
    const q = query(collection(db, 'leads'), orderBy('createdAt', 'desc'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const leadData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      setLeads(leadData);
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { id, value } = e.target;
    setFormData(prev => ({ ...prev, [id]: value }));
  };

  const handleSelectChange = (value: string) => {
    setFormData(prev => ({ ...prev, status: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await addDoc(collection(db, 'leads'), {
        ...formData,
        createdAt: new Date().toISOString()
      });
      toast.success('Lead muvaffaqiyatli qo\'shildi');
      setIsDialogOpen(false);
      setFormData({
        name: '',
        phone: '',
        status: 'new',
        notes: ''
      });
    } catch (error) {
      console.error('Error adding lead:', error);
      toast.error('Xatolik yuz berdi');
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold text-slate-900">Admission Pipeline</h2>
          <p className="text-slate-500">Track and manage prospective students through the enrollment process.</p>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger render={
            <Button className="gap-2 bg-indigo-600 hover:bg-indigo-700">
              <Plus size={18} />
              New Lead
            </Button>
          } />
          <DialogContent className="sm:max-w-[400px]">
            <DialogHeader>
              <DialogTitle>Add New Lead</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="name">Full Name</Label>
                <Input id="name" placeholder="Zafar Ikromov" value={formData.name} onChange={handleInputChange} required />
              </div>
              <div className="space-y-2">
                <Label htmlFor="phone">Phone Number</Label>
                <Input id="phone" placeholder="+998 90 123 45 67" value={formData.phone} onChange={handleInputChange} required />
              </div>
              <div className="space-y-2">
                <Label htmlFor="status">Status</Label>
                <Select value={formData.status} onValueChange={handleSelectChange}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="new">New</SelectItem>
                    <SelectItem value="contacted">Contacted</SelectItem>
                    <SelectItem value="exam">Exam</SelectItem>
                    <SelectItem value="enrolled">Enrolled</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="notes">Notes</Label>
                <textarea 
                  id="notes" 
                  className="w-full min-h-[100px] p-3 rounded-lg border border-slate-200 bg-white text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
                  placeholder="Interested in Nursing..."
                  value={formData.notes}
                  onChange={handleInputChange}
                />
              </div>
              <div className="flex justify-end gap-3 pt-4">
                <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>Cancel</Button>
                <Button type="submit" className="bg-indigo-600 hover:bg-indigo-700">Save Lead</Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 h-[calc(100vh-250px)]">
        {loading ? (
          <div className="col-span-full flex justify-center items-center">
            <div className="w-8 h-8 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin"></div>
          </div>
        ) : (
          columns.map((column) => (
            <div key={column} className="flex flex-col gap-4">
              <div className="flex items-center justify-between px-2">
                <h3 className="font-bold text-slate-700 capitalize flex items-center gap-2">
                  {column}
                  <Badge variant="secondary" className="rounded-full px-2 py-0 h-5 min-w-[20px] flex items-center justify-center">
                    {leads.filter(l => l.status === column).length}
                  </Badge>
                </h3>
                <Button variant="ghost" size="icon" className="h-8 w-8">
                  <Plus size={16} />
                </Button>
              </div>
              <ScrollArea className="flex-1 pr-4">
                <div className="space-y-4 pb-4">
                  {leads.filter(l => l.status === column).map((lead) => (
                    <LeadCard key={lead.id} lead={lead} />
                  ))}
                </div>
              </ScrollArea>
            </div>
          ))
        )}
      </div>
    </div>
  );
};

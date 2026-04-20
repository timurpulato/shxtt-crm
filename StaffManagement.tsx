import React, { useState, useEffect } from 'react';
import { useAuth } from '../lib/AuthProvider';
import { 
  Plus, 
  Search, 
  MoreVertical, 
  Mail,
  Phone,
  Briefcase,
  Star,
  DollarSign,
  Calendar as CalendarIcon,
  MapPin,
  Clock
} from 'lucide-react';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from './ui/table';
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuTrigger 
} from './ui/dropdown-menu';
import { Badge } from './ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from './ui/avatar';
import { Card, CardContent, CardHeader } from './ui/card';
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
import { collection, addDoc, onSnapshot, query, orderBy, deleteDoc, doc, serverTimestamp } from 'firebase/firestore';
import { toast } from 'sonner';

export const StaffManagement = () => {
  const { profile } = useAuth();
  const [searchTerm, setSearchTerm] = useState('');
  const [staff, setStaff] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [selectedStaff, setSelectedStaff] = useState<any>(null);
  const [isViewOpen, setIsViewOpen] = useState(false);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [staffToDelete, setStaffToDelete] = useState<any>(null);
  const [formData, setFormData] = useState({
    name: '',
    role: 'Teacher',
    email: '',
    phone: '',
    rating: '5.0',
    address: '',
    dob: ''
  });

  const logActivity = async (user: string, action: string, type: 'staff' | 'sales') => {
    try {
      await addDoc(collection(db, 'activities'), {
        user,
        action,
        type,
        time: new Date().toISOString(),
        createdAt: serverTimestamp()
      });
    } catch (error) {
      console.error('Error logging activity:', error);
    }
  };

  useEffect(() => {
    const q = query(collection(db, 'users'), orderBy('createdAt', 'desc'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const staffData = snapshot.docs
        .map(doc => {
          const data = doc.data();
          return {
            id: doc.id,
            ...data,
            name: data.fullName || data.name || 'Noma\'lum',
            email: data.email || '',
            role: data.role || 'Xodim',
            rating: data.rating || '5.0',
            phone: data.phoneNumber || data.phone || '',
            dob: data.dateOfBirth || data.dob || '',
            address: data.address || ''
          };
        })
        .filter((user: any) => ['teacher', 'staff', 'operator', 'admin', 'HR', 'manager', 'Teacher', 'Admin', 'Manager', 'Accountant'].includes(user.role));
      setStaff(staffData);
      setLoading(false);
    }, (error) => {
      console.error("Error fetching staff:", error);
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { id, value } = e.target;
    setFormData(prev => ({ ...prev, [id]: value }));
  };

  const handleSelectChange = (value: string) => {
    setFormData(prev => ({ ...prev, role: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await addDoc(collection(db, 'users'), {
        ...formData,
        fullName: formData.name,
        rating: Number(formData.rating),
        createdAt: new Date().toISOString()
      });
      await logActivity(formData.name, 'yangi xodim sifatida qo\'shildi', 'staff');
      toast.success('Xodim muvaffaqiyatli qo\'shildi');
      setIsDialogOpen(false);
      setFormData({
        name: '',
        role: 'Teacher',
        email: '',
        phone: '',
        rating: '5.0',
        dob: '',
        address: ''
      });
    } catch (error) {
      console.error('Error adding staff:', error);
      toast.error('Xatolik yuz berdi');
    }
  };

  const handleDelete = async () => {
    if (!staffToDelete) return;
    try {
      await deleteDoc(doc(db, 'users', staffToDelete.id));
      await logActivity(staffToDelete.name, 'platformadan o\'chirildi', 'staff');
      toast.success('Xodim o\'chirildi');
      setIsDeleteOpen(false);
      setStaffToDelete(null);
    } catch (error) {
      console.error('Error deleting staff:', error);
      toast.error('O\'chirishda xatolik yuz berdi');
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold text-slate-900">Staff</h2>
          <p className="text-slate-500">Manage employee profiles, roles, and performance.</p>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger render={
            <Button className="gap-2 bg-indigo-600 hover:bg-indigo-700">
              <Plus size={18} />
              Add Staff Member
            </Button>
          } />
          <DialogContent className="sm:max-w-[500px]">
            <DialogHeader>
              <DialogTitle>Add New Staff Member</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="name">Full Name</Label>
                <Input id="name" placeholder="Dr. John Doe" value={formData.name} onChange={handleInputChange} required />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <Input id="email" type="email" placeholder="john@example.com" value={formData.email} onChange={handleInputChange} required />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="phone">Phone</Label>
                  <Input id="phone" placeholder="+998 90 123 45 67" value={formData.phone} onChange={handleInputChange} required />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="role">Role</Label>
                  <Select value={formData.role} onValueChange={handleSelectChange}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select role" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Teacher">Teacher</SelectItem>
                      <SelectItem value="Admin">Admin</SelectItem>
                      <SelectItem value="HR">HR</SelectItem>
                      <SelectItem value="Accountant">Accountant</SelectItem>
                      <SelectItem value="Manager">Manager</SelectItem>
                      <SelectItem value="operator">Operator</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="dob">Date of Birth</Label>
                  <Input id="dob" type="date" value={formData.dob} onChange={handleInputChange} required />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="address">Address</Label>
                <Input id="address" placeholder="Tashkent..." value={formData.address} onChange={handleInputChange} required />
              </div>
              <div className="flex justify-end gap-3 pt-4">
                <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>Cancel</Button>
                <Button type="submit" className="bg-indigo-600 hover:bg-indigo-700">Save Member</Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <Card>
        <CardHeader className="pb-3">
          <div className="relative w-80">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
            <Input 
              placeholder="Search by name, role, or email..." 
              className="pl-10"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex justify-center py-8">
              <div className="w-8 h-8 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin"></div>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Employee</TableHead>
                  <TableHead>Role</TableHead>
                  <TableHead>Performance</TableHead>
                  <TableHead>Address</TableHead>
                  <TableHead>DOB</TableHead>
                  <TableHead>Contact</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {staff.filter(s => (s.fullName || s.name || '').toLowerCase().includes(searchTerm.toLowerCase())).map((member) => (
                  <TableRow key={member.id}>
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <Avatar className="h-9 w-9">
                          <AvatarFallback>{(member.name || 'U').charAt(0)}</AvatarFallback>
                        </Avatar>
                        <div>
                          <p className="font-medium text-slate-900">{member.name}</p>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Briefcase size={14} className="text-slate-400" />
                        <span className="text-sm font-medium text-slate-700 capitalize">{member.role}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1">
                        <Star size={14} className="text-amber-400 fill-amber-400" />
                        <span className="text-sm font-bold text-slate-700">{member.rating}</span>
                      </div>
                    </TableCell>
                    <TableCell className="text-sm text-slate-600 max-w-[150px] truncate">
                      {member.address || 'N/A'}
                    </TableCell>
                    <TableCell className="text-sm text-slate-600">
                      {member.dob || 'N/A'}
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-col gap-1">
                        <div className="flex items-center gap-2 text-sm text-slate-600">
                          <Phone size={14} className="text-slate-400" />
                          {member.phone || 'N/A'}
                        </div>
                        <div className="flex items-center gap-2 text-xs text-slate-400">
                          <Mail size={12} />
                          {member.email}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="text-right">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon">
                            <MoreVertical size={18} />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => {
                            setSelectedStaff(member);
                            setIsViewOpen(true);
                          }}>
                            View Profile
                          </DropdownMenuItem>
                          {(profile?.role === 'admin' || profile?.role === 'HR') && (
                            <DropdownMenuItem className="text-rose-600" onClick={() => {
                              setStaffToDelete(member);
                              setIsDeleteOpen(true);
                            }}>
                              Delete
                            </DropdownMenuItem>
                          )}
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Delete Confirmation Dialog */}
      <Dialog open={isDeleteOpen} onOpenChange={setIsDeleteOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Xodimni o'chirish</DialogTitle>
          </DialogHeader>
          <div className="py-4">
            <p className="text-slate-600">
              Haqiqatan ham <span className="font-bold text-slate-900">{staffToDelete?.name}</span>ni o'chirmoqchimisiz? 
              Bu amalni ortga qaytarib bo'lmaydi.
            </p>
          </div>
          <div className="flex justify-end gap-3">
            <Button variant="outline" onClick={() => setIsDeleteOpen(false)}>Bekor qilish</Button>
            <Button variant="destructive" onClick={handleDelete}>O'chirish</Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* View Profile Dialog */}
      <Dialog open={isViewOpen} onOpenChange={setIsViewOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Xodim profili</DialogTitle>
          </DialogHeader>
          {selectedStaff && (
            <div className="space-y-6 py-4">
              <div className="flex items-center gap-4">
                <Avatar className="h-16 w-16 border-2 border-indigo-100">
                  <AvatarImage src={selectedStaff.photoURL} />
                  <AvatarFallback className="text-xl bg-indigo-50 text-indigo-600">
                    {selectedStaff.name.charAt(0)}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <h3 className="text-xl font-bold text-slate-900">{selectedStaff.name}</h3>
                  <Badge className="bg-indigo-100 text-indigo-700 hover:bg-indigo-100 border-none capitalize">
                    {selectedStaff.role}
                  </Badge>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-6">
                <div className="space-y-1">
                  <p className="text-xs font-medium text-slate-400 uppercase tracking-wider">Telefon</p>
                  <div className="flex items-center gap-2 text-slate-700">
                    <Phone size={16} className="text-slate-400" />
                    <span className="font-medium">{selectedStaff.phone || 'Kiritilmagan'}</span>
                  </div>
                </div>
                <div className="space-y-1">
                  <p className="text-xs font-medium text-slate-400 uppercase tracking-wider">Email</p>
                  <div className="flex items-center gap-2 text-slate-700">
                    <Mail size={16} className="text-slate-400" />
                    <span className="font-medium">{selectedStaff.email}</span>
                  </div>
                </div>
                <div className="space-y-1">
                  <p className="text-xs font-medium text-slate-400 uppercase tracking-wider">Tug'ilgan sana</p>
                  <div className="flex items-center gap-2 text-slate-700">
                    <CalendarIcon size={16} className="text-slate-400" />
                    <span className="font-medium">{selectedStaff.dob || 'Kiritilmagan'}</span>
                  </div>
                </div>
                <div className="space-y-1">
                  <p className="text-xs font-medium text-slate-400 uppercase tracking-wider">Reyting</p>
                  <div className="flex items-center gap-2 text-slate-700">
                    <Star size={16} className="text-amber-400 fill-amber-400" />
                    <span className="font-medium">{selectedStaff.rating}</span>
                  </div>
                </div>
              </div>

              <div className="space-y-1">
                <p className="text-xs font-medium text-slate-400 uppercase tracking-wider">Yashash manzili</p>
                <div className="flex items-center gap-2 text-slate-700">
                  <MapPin size={16} className="text-slate-400" />
                  <span className="font-medium">{selectedStaff.address || 'Kiritilmagan'}</span>
                </div>
              </div>

              <div className="pt-4 border-t border-slate-100 flex items-center justify-between">
                <div className="flex items-center gap-2 text-xs text-slate-400">
                  <Clock size={14} />
                  <span>Ro'yxatdan o'tgan: {selectedStaff.createdAt ? new Date(selectedStaff.createdAt).toLocaleDateString() : 'Noma\'lum'}</span>
                </div>
                <Button variant="outline" size="sm" onClick={() => setIsViewOpen(false)}>Yopish</Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

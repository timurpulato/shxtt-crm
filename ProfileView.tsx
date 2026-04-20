import React, { useState } from 'react';
import { useAuth } from '../lib/AuthProvider';
import { db } from '../lib/firebase';
import { doc, updateDoc } from 'firebase/firestore';
import { User, Mail, Phone, MapPin, Calendar, Briefcase, Save, Shield } from 'lucide-react';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from './ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { toast } from 'sonner';

export const ProfileView = () => {
  const { profile, refreshProfile } = useAuth();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    fullName: profile?.fullName || '',
    phoneNumber: profile?.phoneNumber || '',
    address: profile?.address || '',
    dateOfBirth: profile?.dateOfBirth || '',
    role: profile?.role || 'student',
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { id, value } = e.target;
    setFormData(prev => ({ ...prev, [id]: value }));
  };

  const handleRoleChange = (value: string) => {
    setFormData(prev => ({ ...prev, role: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profile?.uid) return;

    setLoading(true);
    try {
      const userRef = doc(db, 'users', profile.uid);
      await updateDoc(userRef, {
        ...formData,
        updatedAt: new Date().toISOString()
      });
      await refreshProfile();
      toast.success('Profil muvaffaqiyatli yangilandi');
    } catch (error) {
      console.error('Error updating profile:', error);
      toast.error('Profilni yangilashda xatolik yuz berdi');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      <div>
        <h2 className="text-3xl font-bold text-slate-900">Mening profilim</h2>
        <p className="text-slate-500">Shaxsiy ma'lumotlaringizni ko'ring va tahrirlang.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        <Card className="md:col-span-1">
          <CardContent className="pt-8 flex flex-col items-center text-center">
            <div className="w-24 h-24 bg-indigo-100 rounded-full flex items-center justify-center text-indigo-600 mb-4">
              <User size={48} />
            </div>
            <h3 className="text-xl font-bold text-slate-900">{profile?.fullName}</h3>
            <p className="text-sm text-slate-500 capitalize mb-4">{profile?.role}</p>
            <div className="w-full pt-4 border-t border-slate-100 space-y-3 text-left">
              <div className="flex items-center gap-2 text-sm text-slate-600">
                <Mail size={16} />
                <span className="truncate">{profile?.email}</span>
              </div>
              <div className="flex items-center gap-2 text-sm text-slate-600">
                <Briefcase size={16} />
                <span className="capitalize">{profile?.role}</span>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="md:col-span-2">
          <CardHeader>
            <CardTitle>Ma'lumotlarni tahrirlash</CardTitle>
            <CardDescription>Barcha maydonlar to'g'ri to'ldirilganligiga ishonch hosil qiling.</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="fullName">Ism familiya</Label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                  <Input 
                    id="fullName" 
                    value={formData.fullName}
                    onChange={handleChange}
                    className="pl-10"
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="phoneNumber">Telefon raqami</Label>
                  <div className="relative">
                    <Phone className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                    <Input 
                      id="phoneNumber" 
                      value={formData.phoneNumber}
                      onChange={handleChange}
                      className="pl-10"
                      required
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="dateOfBirth">Tug'ilgan vaqti</Label>
                  <div className="relative">
                    <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                    <Input 
                      id="dateOfBirth" 
                      type="date"
                      value={formData.dateOfBirth}
                      onChange={handleChange}
                      className="pl-10"
                      required
                    />
                  </div>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="address">Yashash manzili</Label>
                <div className="relative">
                  <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                  <Input 
                    id="address" 
                    value={formData.address}
                    onChange={handleChange}
                    className="pl-10"
                    required
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label>Roli</Label>
                <Select value={formData.role} onValueChange={handleRoleChange}>
                  <SelectTrigger className="w-full">
                    <div className="flex items-center gap-2">
                      <Shield size={18} className="text-slate-400" />
                      <SelectValue placeholder="Rolni tanlang" />
                    </div>
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="student">Talaba (Student)</SelectItem>
                    <SelectItem value="teacher">O'qituvchi (Teacher)</SelectItem>
                    <SelectItem value="staff">Xodim (Staff)</SelectItem>
                    <SelectItem value="manager">Menejer (Manager)</SelectItem>
                    <SelectItem value="HR">HR</SelectItem>
                    <SelectItem value="operator">Operator</SelectItem>
                    {(profile?.role === 'admin' || profile?.email === 'magicalfx426@gmail.com') && (
                      <SelectItem value="admin">Admin</SelectItem>
                    )}
                  </SelectContent>
                </Select>
              </div>

              <div className="flex justify-end">
                <Button type="submit" className="bg-indigo-600 hover:bg-indigo-700 gap-2" disabled={loading}>
                  <Save size={18} />
                  {loading ? 'Saqlanmoqda...' : 'Saqlash'}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

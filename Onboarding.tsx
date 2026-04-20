import React, { useState } from 'react';
import { useAuth } from '../lib/AuthProvider';
import { db } from '../lib/firebase';
import { doc, setDoc } from 'firebase/firestore';
import { GraduationCap, User, Phone, MapPin, Calendar, Briefcase } from 'lucide-react';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from './ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';

export const Onboarding = () => {
  const { user, refreshProfile } = useAuth();
  const [fullName, setFullName] = useState('');
  const [dob, setDob] = useState('');
  const [address, setAddress] = useState('');
  const [phone, setPhone] = useState('');
  const [role, setRole] = useState<'student' | 'teacher' | 'staff' | 'operator' | 'admin' | 'manager' | 'HR'>('student');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    
    setLoading(true);
    try {
      await setDoc(doc(db, 'users', user.uid), {
        uid: user.uid,
        email: user.email,
        fullName,
        dateOfBirth: dob,
        address,
        phoneNumber: phone,
        role: role,
        createdAt: new Date().toISOString()
      });
      await refreshProfile();
    } catch (error) {
      console.error("Error saving profile:", error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
      <Card className="w-full max-w-lg border-none shadow-xl">
        <CardHeader className="space-y-1 text-center pb-8">
          <div className="flex justify-center mb-4">
            <div className="w-12 h-12 bg-indigo-600 rounded-xl flex items-center justify-center text-white">
              <User size={28} />
            </div>
          </div>
          <CardTitle className="text-2xl font-bold">Profilni sozlash</CardTitle>
          <CardDescription>
            Tizimdan foydalanish uchun ma'lumotlaringizni to'ldiring
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="fullName">Ism familiya</Label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                <Input 
                  id="fullName" 
                  placeholder="Masalan: Ali Valiyev" 
                  className="pl-10"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  required
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="dob">Tug'ilgan vaqti</Label>
                <div className="relative">
                  <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                  <Input 
                    id="dob" 
                    type="date" 
                    className="pl-10"
                    value={dob}
                    onChange={(e) => setDob(e.target.value)}
                    required
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="phone">Telefon raqami</Label>
                <div className="relative">
                  <Phone className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                  <Input 
                    id="phone" 
                    placeholder="+998 90 123 45 67" 
                    className="pl-10"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
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
                  placeholder="Viloyat, tuman, ko'cha, uy" 
                  className="pl-10"
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  required
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label>Roli</Label>
              <Select value={role} onValueChange={(value: any) => setRole(value)}>
                <SelectTrigger className="w-full">
                  <div className="flex items-center gap-2">
                    <Briefcase size={18} className="text-slate-400" />
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
                  {user?.email === 'magicalfx426@gmail.com' && (
                    <SelectItem value="admin">Admin</SelectItem>
                  )}
                </SelectContent>
              </Select>
            </div>

            <Button className="w-full bg-indigo-600 hover:bg-indigo-700 h-11" type="submit" disabled={loading}>
              {loading ? 'Saqlanmoqda...' : 'Profilni saqlash'}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
};

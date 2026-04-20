import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from './ui/card';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Send, CheckCircle2, AlertCircle, MessageSquare, Instagram, Bot } from 'lucide-react';
import { toast } from 'sonner';
import { db } from '../lib/firebase';
import { doc, getDoc, setDoc } from 'firebase/firestore';

export const Integrations = () => {
  const [tgToken, setTgToken] = useState('');
  const [loading, setLoading] = useState(false);
  const [tgStatus, setTgStatus] = useState<{isActive: boolean, updatedAt?: string} | null>(null);

  useEffect(() => {
    const fetchIntegration = async () => {
      const docSnap = await getDoc(doc(db, 'integrations', 'telegram'));
      if (docSnap.exists()) {
        setTgStatus(docSnap.data() as any);
      }
    };
    fetchIntegration();
  }, []);

  const handleConnectTelegram = async () => {
    if (!tgToken) {
      toast.error('Iltimos, Telegram Bot Tokenni kiriting');
      return;
    }

    setLoading(true);
    try {
      // 1. Tell server to set the webhook (Server only proxies to Telegram API)
      const response = await fetch('/api/integrations/telegram/setup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token: tgToken }),
      });

      const data = await response.json();
      if (!data.success) {
        throw new Error(data.error || "Server orqali webhook o'rnatib bo'lmadi");
      }

      const successMessage = data.message || 'Telegram muvaffaqiyatli ulandi!';

      // 2. Save the token to Firestore DIRECTLY from the client
      // Since the user is authenticated as Admin in the frontend, this bypasses server IAM issues.
      await setDoc(doc(db, 'integrations', 'telegram'), {
        channel: 'telegram',
        token: tgToken,
        isActive: true,
        updatedAt: new Date().toISOString()
      });

      toast.success(successMessage, { duration: 8000 });
      setTgStatus({ isActive: true, updatedAt: new Date().toISOString() });
    } catch (err: any) {
      console.error(err);
      toast.error('Xatolik: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-6">
      <div className="flex flex-col gap-2">
        <h1 className="text-3xl font-bold text-slate-900 tracking-tight">Integratsiyalar</h1>
        <p className="text-slate-500">Omichannel tizimini tashqi kanallarga bog'lang</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Telegram Integration */}
        <Card className="border-none shadow-sm hover:shadow-md transition-shadow">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div className="w-12 h-12 bg-sky-100 text-sky-600 rounded-xl flex items-center justify-center">
                <Send size={24} />
              </div>
              {tgStatus?.isActive ? (
                <div className="flex items-center gap-1.5 px-3 py-1 bg-emerald-50 text-emerald-600 rounded-full text-xs font-semibold">
                  <CheckCircle2 size={14} /> Aktiv
                </div>
              ) : (
                <div className="flex items-center gap-1.5 px-3 py-1 bg-slate-100 text-slate-500 rounded-full text-xs font-semibold">
                  <AlertCircle size={14} /> Ulanmagan
                </div>
              )}
            </div>
            <CardTitle className="mt-4">Telegram Bot</CardTitle>
            <CardDescription>Bot orqali keladigan xabarlarni to'g'ridan-to'g'ri CRM-da qabul qiling.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="tgToken">Bot API Token</Label>
              <Input 
                id="tgToken" 
                placeholder="Masalan: 123456:ABC-DEF1234ghIkl-zyx57" 
                className="font-mono text-sm"
                value={tgToken}
                onChange={(e) => setTgToken(e.target.value)}
              />
              <p className="text-[10px] text-slate-400">
                Tokenni @BotFather orqali olishingiz mumkin.
              </p>
            </div>
            <Button 
              className="w-full bg-sky-600 hover:bg-sky-700" 
              onClick={handleConnectTelegram}
              disabled={loading}
            >
              {loading ? 'Ulanmoqda...' : tgStatus?.isActive ? 'Qayta ulanish' : 'Ulash'}
            </Button>
          </CardContent>
        </Card>

        {/* Instagram Integration (Coming soon or info) */}
        <Card className="border-none shadow-sm bg-slate-50/50 opacity-80">
          <CardHeader>
             <div className="w-12 h-12 bg-pink-100 text-pink-600 rounded-xl flex items-center justify-center">
              <Instagram size={24} />
            </div>
            <CardTitle className="mt-4">Instagram Direct</CardTitle>
            <CardDescription>Instagram xabarlari va sharhlarini boshqarish.</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2 p-3 bg-amber-50 border border-amber-100 rounded-lg text-amber-700 text-sm">
              <AlertCircle size={16} />
              <span>Facebook App Review talab qilinadi.</span>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card className="border-none shadow-sm bg-indigo-50">
        <CardContent className="p-6 flex items-start gap-4">
          <div className="p-3 bg-white rounded-lg shadow-sm">
            <Bot className="text-indigo-600" size={24} />
          </div>
          <div>
            <h3 className="font-semibold text-indigo-900">Telegramni qanday ulash mumkin?</h3>
            <ol className="list-decimal list-inside text-sm text-indigo-700 mt-2 space-y-1">
              <li>Telegramda <b>@BotFather</b> ni qidiring.</li>
              <li>Botga <b>/newbot</b> buyrug'ini yuboring.</li>
              <li>Botga ism va username (masalan: <i>MyCrmBot</i>) bering.</li>
              <li>Sizga berilgan <b>API Token</b>ni yuqoridagi maydonga nusxalab o'tkazing.</li>
              <li>"Ulash" tugmasini bosing.</li>
            </ol>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

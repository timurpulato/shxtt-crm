import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../lib/AuthProvider';
import { db } from '../lib/firebase';
import { 
  collection, 
  addDoc, 
  onSnapshot, 
  query, 
  orderBy, 
  limit, 
  serverTimestamp,
  where,
  or,
  and,
  updateDoc,
  doc,
  writeBatch
} from 'firebase/firestore';
import { Send, User, Search, MessageSquare, ArrowLeft, Instagram, Send as TelegramIcon } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { ScrollArea } from './ui/scroll-area';
import { Avatar, AvatarFallback, AvatarImage } from './ui/avatar';
import { Badge } from './ui/badge';
import { Tabs, TabsList, TabsTrigger } from './ui/tabs';

export const ChatSystem = () => {
  const { profile } = useAuth();
  const [messages, setMessages] = useState<any[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [users, setUsers] = useState<any[]>([]);
  const [leads, setLeads] = useState<any[]>([]);
  const [activeChannel, setActiveChannel] = useState<'all' | 'internal' | 'telegram' | 'instagram'>('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedUser, setSelectedUser] = useState<any>(null);
  const [unreadCounts, setUnreadCounts] = useState<Record<string, number>>({});
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Fetch internal users
    const unsubscribeUsers = onSnapshot(collection(db, 'users'), (snapshot) => {
      const userData = snapshot.docs
        .map(doc => ({
          id: doc.id,
          type: 'internal',
          ...doc.data()
        }))
        .filter(u => u.id !== profile?.uid);
      setUsers(userData);
    }, (error) => {
      console.error("Users stream error:", error);
      toast.error("Foydalanuvchilarni yuklashda xatolik");
    });

    // Fetch leads from external channels
    const unsubscribeLeads = onSnapshot(
      query(collection(db, 'leads'), where('source', 'in', ['telegram', 'instagram'])),
      (snapshot) => {
        const leadData = snapshot.docs.map(doc => ({
          id: doc.data().externalId || doc.id,
          docId: doc.id,
          type: 'external',
          channel: doc.data().source,
          ...doc.data()
        }));
        setLeads(leadData);
      },
      (error) => {
        console.error("Leads stream error:", error);
        toast.error("Lidlarni yuklashda xatolik");
      }
    );

    // Fetch unread counts
    if (profile?.uid) {
      const qUnread = query(
        collection(db, 'messages'),
        where('receiverId', 'in', [profile.uid, 'system']),
        where('read', '==', false)
      );

      const unsubscribeUnread = onSnapshot(qUnread, (snapshot) => {
        const counts: Record<string, number> = {};
        snapshot.docs.forEach(doc => {
          const data = doc.data();
          counts[data.senderId] = (counts[data.senderId] || 0) + 1;
        });
        setUnreadCounts(counts);
      });

      return () => {
        unsubscribeUsers();
        unsubscribeLeads();
        unsubscribeUnread();
      };
    }

    return () => {
      unsubscribeUsers();
      unsubscribeLeads();
    };
  }, [profile?.uid]);

  useEffect(() => {
    if (!profile?.uid || !selectedUser?.id) {
      setMessages([]);
      return;
    }

    // Combined query for internal and external messages
    const q = selectedUser.type === 'internal' 
      ? query(
          collection(db, 'messages'),
          or(
            and(where('senderId', '==', profile.uid), where('receiverId', '==', selectedUser.id)),
            and(where('senderId', '==', selectedUser.id), where('receiverId', '==', profile.uid))
          ),
          limit(200)
        )
      : query(
          collection(db, 'messages'),
          where('externalChatId', '==', selectedUser.id),
          limit(200)
        );

    const unsubscribeMessages = onSnapshot(q, (snapshot) => {
      const messageData = snapshot.docs
        .map(doc => ({
          id: doc.id,
          ...doc.data(),
          // Ensure we have a date for sorting
          timestamp: doc.data().createdAt?.toDate ? doc.data().createdAt.toDate() : new Date(doc.data().createdAt)
        }))
        .sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());

      setMessages(messageData);

      // Mark as read
      const unreadDocs = snapshot.docs.filter(d => 
        (d.data().receiverId === profile.uid || d.data().receiverId === 'system') && !d.data().read
      );
      if (unreadDocs.length > 0) {
        const batch = writeBatch(db);
        unreadDocs.forEach(d => {
          batch.update(d.ref, { read: true });
        });
        batch.commit().catch(err => console.error("Mark as read failed:", err));
      }
    }, (error) => {
      console.error("Messages stream error:", error);
      toast.error("Xabarlarni yuklashda xatolik: " + error.message);
    });

    return () => unsubscribeMessages();
  }, [profile?.uid, selectedUser?.id]);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages]);

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim() || !profile || !selectedUser) return;

    if (selectedUser.type === 'internal') {
      try {
        await addDoc(collection(db, 'messages'), {
          text: newMessage,
          senderId: profile.uid,
          senderName: profile.fullName,
          senderPhoto: profile.photoURL || '',
          receiverId: selectedUser.id,
          channel: 'internal',
          read: false,
          createdAt: serverTimestamp()
        });
      } catch (error) {
        console.error('Error sending message:', error);
      }
    } else {
      // Send via server API for external channels
      try {
        await fetch('/api/messages/send', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            text: newMessage,
            receiverId: selectedUser.id,
            channel: selectedUser.channel,
            externalChatId: selectedUser.id
          })
        });
      } catch (error) {
        console.error('Error sending external message:', error);
      }
    }
    setNewMessage('');
  };

  const allItems = [...users, ...leads];
  const filteredItems = allItems.filter(u => {
    const matchesSearch = (u.fullName || u.name)?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesChannel = activeChannel === 'all' || 
      (activeChannel === 'internal' && u.type === 'internal') ||
      (u.type === 'external' && u.channel === activeChannel);
    return matchesSearch && matchesChannel;
  });

  const getChannelIcon = (channel: string) => {
    if (channel === 'telegram') return <TelegramIcon className="text-sky-500" size={12} />;
    if (channel === 'instagram') return <Instagram className="text-pink-500" size={12} />;
    return null;
  };

  return (
    <div className="flex h-[calc(100vh-180px)] bg-white rounded-xl border border-slate-200 overflow-hidden shadow-sm">
      {/* Sidebar */}
      <div className={`w-full md:w-80 border-r border-slate-200 flex flex-col bg-slate-50/50 ${selectedUser ? 'hidden md:flex' : 'flex'}`}>
        <div className="p-4 border-b border-slate-200 bg-white space-y-4">
          <h2 className="text-lg font-bold text-slate-900">Conversations</h2>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
            <Input 
              placeholder="Search..." 
              className="pl-10 bg-slate-50"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <Tabs value={activeChannel} onValueChange={(v: any) => setActiveChannel(v)}>
            <TabsList className="w-full grid grid-cols-4 h-8">
              <TabsTrigger value="all" className="text-[10px]">All</TabsTrigger>
              <TabsTrigger value="internal" className="text-[10px]">CRM</TabsTrigger>
              <TabsTrigger value="telegram" className="text-[10px]">TG</TabsTrigger>
              <TabsTrigger value="instagram" className="text-[10px]">IG</TabsTrigger>
            </TabsList>
          </Tabs>
        </div>

        <ScrollArea className="flex-1">
          <div className="p-2 space-y-1">
            {filteredItems.map((item) => (
              <div 
                key={item.id} 
                onClick={() => setSelectedUser(item)}
                className={`flex items-center gap-3 p-3 rounded-lg transition-all cursor-pointer group relative ${
                  selectedUser?.id === item.id ? 'bg-white shadow-sm ring-1 ring-slate-200 text-indigo-700' : 'hover:bg-white'
                }`}
              >
                <div className="relative shrink-0">
                  <Avatar className="h-10 w-10 border border-slate-200">
                    <AvatarImage src={item.photoURL} />
                    <AvatarFallback className="bg-indigo-50 text-indigo-600">
                      {(item.fullName || item.name)?.charAt(0)}
                    </AvatarFallback>
                  </Avatar>
                  <div className="absolute -bottom-1 -right-1 bg-white rounded-full p-0.5 shadow-sm border border-slate-100">
                    {getChannelIcon(item.channel || 'internal')}
                  </div>
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex justify-between items-start">
                    <p className="text-sm font-semibold truncate">{item.fullName || item.name}</p>
                    {unreadCounts[item.id] > 0 && (
                      <Badge className="bg-rose-500 h-5 min-w-[20px] p-0 flex items-center justify-center text-[10px]">
                        {unreadCounts[item.id]}
                      </Badge>
                    )}
                  </div>
                  <p className="text-xs text-slate-500 truncate capitalize">
                    {item.channel || item.role || 'External'}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </ScrollArea>
      </div>

      {/* Chat Area */}
      <div className={`flex-1 flex flex-col bg-white ${!selectedUser ? 'hidden md:flex' : 'flex'}`}>
        {selectedUser ? (
          <>
            <div className="h-16 border-b border-slate-200 flex items-center px-6 bg-white shrink-0">
              <div className="flex items-center gap-3 flex-1">
                <Button variant="ghost" size="icon" className="md:hidden" onClick={() => setSelectedUser(null)}>
                  <ArrowLeft size={20} />
                </Button>
                <Avatar className="h-10 w-10">
                  <AvatarImage src={selectedUser.photoURL} />
                  <AvatarFallback>{(selectedUser.fullName || selectedUser.name)?.charAt(0)}</AvatarFallback>
                </Avatar>
                <div>
                  <h3 className="font-bold text-slate-900 leading-tight">{selectedUser.fullName || selectedUser.name}</h3>
                  <div className="flex items-center gap-1">
                    {getChannelIcon(selectedUser.channel || 'internal')}
                    <span className="text-xs text-slate-500 capitalize">{selectedUser.channel || selectedUser.role}</span>
                  </div>
                </div>
              </div>
            </div>

            <ScrollArea className="flex-1 p-6 bg-slate-50/20">
              <div className="space-y-6">
                {messages.map((msg, idx) => {
                  const isMe = msg.senderId === profile?.uid || msg.senderId === 'system';
                  return (
                    <div key={msg.id || idx} className={`flex items-start gap-3 ${isMe ? 'flex-row-reverse' : ''}`}>
                      <div className={`flex flex-col ${isMe ? 'items-end' : 'items-start'} max-w-[75%]`}>
                        <div className={`p-3 rounded-2xl text-sm ${
                          isMe ? 'bg-indigo-600 text-white rounded-tr-none shadow-indigo-100 flex gap-2' : 'bg-white text-slate-700 border border-slate-200 rounded-tl-none shadow-sm flex gap-2'
                        }`}>
                          {msg.text}
                        </div>
                        <span className="text-[10px] text-slate-400 mt-1">
                          {msg.createdAt?.toDate 
                            ? msg.createdAt.toDate().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) 
                            : typeof msg.createdAt === 'string' 
                              ? new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                              : 'Just now'}
                        </span>
                      </div>
                    </div>
                  );
                })}
                <div ref={scrollRef} />
              </div>
            </ScrollArea>

            <div className="p-4 bg-white border-t border-slate-200">
              <form onSubmit={handleSendMessage} className="flex gap-3">
                <Input 
                  placeholder="Message..." 
                  className="flex-1 bg-slate-50"
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                />
                <Button type="submit" size="icon" className="bg-indigo-600 hover:bg-indigo-700" disabled={!newMessage.trim()}>
                  <Send size={18} />
                </Button>
              </form>
            </div>
          </>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center text-slate-400 bg-slate-50/20">
            <MessageSquare size={48} className="mb-4 opacity-20" />
            <p className="font-medium">Direct Messages & Integrations</p>
            <p className="text-sm">Select a channel to start responding</p>
          </div>
        )}
      </div>
    </div>
  );
};

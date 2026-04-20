import React, { createContext, useContext, useEffect, useState } from 'react';
import { onAuthStateChanged, User } from 'firebase/auth';
import { doc, getDoc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { auth, db } from './firebase';
import { UserProfile } from '../types';

interface AuthContextType {
  user: User | null;
  profile: UserProfile | null;
  loading: boolean;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({ 
  user: null, 
  profile: null, 
  loading: true,
  refreshProfile: async () => {}
});

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchProfile = async (uid: string) => {
    const docRef = doc(db, 'users', uid);
    const docSnap = await getDoc(docRef);
    if (docSnap.exists()) {
      setProfile(docSnap.data() as UserProfile);
    } else {
      setProfile(null);
    }
  };

  const refreshProfile = async () => {
    if (user) {
      await fetchProfile(user.uid);
    }
  };

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      try {
        setUser(user);
        if (user) {
          await fetchProfile(user.uid);
          
          // Mark user as online ONLY if they have a profile
          const userRef = doc(db, 'users', user.uid);
          const docSnap = await getDoc(userRef);
          
          if (docSnap.exists()) {
            await updateDoc(userRef, {
              isOnline: true,
              lastSeen: serverTimestamp()
            });

            // Handle offline on tab close
            const handleVisibilityChange = () => {
              if (document.visibilityState === 'hidden') {
                updateDoc(userRef, { isOnline: false, lastSeen: serverTimestamp() });
              } else {
                updateDoc(userRef, { isOnline: true, lastSeen: serverTimestamp() });
              }
            };

            window.addEventListener('visibilitychange', handleVisibilityChange);
            window.addEventListener('beforeunload', () => {
              updateDoc(userRef, { isOnline: false, lastSeen: serverTimestamp() });
            });
          }
        } else {
          setProfile(null);
        }
      } catch (error) {
        console.error("Auth state change error:", error);
      } finally {
        setLoading(false);
      }
    });

    return () => unsubscribe();
  }, []);

  return (
    <AuthContext.Provider value={{ user, profile, loading, refreshProfile }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);

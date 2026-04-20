export type UserRole = 'admin' | 'manager' | 'teacher' | 'student';

export interface UserProfile {
  uid: string;
  email: string;
  role: UserRole;
  fullName: string;
  phoneNumber?: string;
  photoURL?: string;
  dateOfBirth?: string;
  address?: string;
  createdAt: string;
}

export interface StudentProfile extends UserProfile {
  passportNumber?: string;
  address?: string;
  parentsInfo?: {
    fatherName?: string;
    fatherPhone?: string;
    motherName?: string;
    motherPhone?: string;
  };
  enrollmentStatus: 'applicant' | 'student' | 'graduated' | 'dropped';
  group?: string;
  practiceHours: number;
  labWorkCount: number;
  certifications: string[];
}

export interface StaffProfile extends UserProfile {
  staffRole: 'teacher' | 'admin' | 'accountant' | 'manager';
  salary: number;
  schedule?: any;
  performanceRating?: number;
}

export interface Lead {
  id: string;
  fullName: string;
  phoneNumber: string;
  status: 'new' | 'contacted' | 'exam' | 'enrolled' | 'rejected';
  assignedManagerId?: string;
  notes: string[];
  createdAt: string;
  updatedAt: string;
}

export interface Attendance {
  id: string;
  studentId: string;
  date: string;
  status: 'present' | 'absent' | 'late';
  lessonId: string;
}

export interface Grade {
  id: string;
  studentId: string;
  subject: string;
  score: number;
  type: 'exam' | 'test' | 'assignment';
  date: string;
}

export interface Payment {
  id: string;
  studentId: string;
  amount: number;
  date: string;
  type: 'tuition' | 'dormitory' | 'other';
  status: 'paid' | 'pending' | 'overdue';
}

export interface Schedule {
  id: string;
  subject: string;
  teacherId: string;
  groupId: string;
  roomId: string;
  startTime: string;
  endTime: string;
  dayOfWeek: number; // 0-6
}

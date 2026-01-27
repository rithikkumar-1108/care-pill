// Custom type definitions for the database

export type SessionType = 'morning' | 'afternoon' | 'night';
export type DoseStatus = 'pending' | 'taken' | 'missed' | 'skipped';
export type AppRole = 'admin' | 'user' | 'caregiver';
export type StockStatus = 'good' | 'low' | 'critical';

export interface Profile {
  id: string;
  user_id: string;
  full_name: string;
  age: number | null;
  gender: string | null;
  health_condition: string | null;
  caregiver_name: string | null;
  caregiver_email: string | null;
  caregiver_phone: string | null;
  avatar_url: string | null;
  created_at: string;
  updated_at: string;
}

export interface Medicine {
  id: string;
  user_id: string;
  name: string;
  dosage: string;
  dosage_unit: string;
  instructions: string | null;
  start_date: string;
  end_date: string | null;
  stock_quantity: number;
  low_stock_threshold: number;
  image_url: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface MedicineWithSessions extends Medicine {
  sessions: SessionType[];
}

export interface SessionSchedule {
  id: string;
  user_id: string;
  session_type: SessionType;
  scheduled_time: string;
  is_default: boolean;
  created_at: string;
  updated_at: string;
}

export interface MedicineSession {
  id: string;
  medicine_id: string;
  session_type: SessionType;
  created_at: string;
}

export interface DoseLog {
  id: string;
  user_id: string;
  medicine_id: string;
  session_type: SessionType;
  scheduled_date: string;
  status: DoseStatus;
  taken_at: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface DoseLogWithMedicine extends DoseLog {
  medicine: Medicine;
}

export interface CaregiverLink {
  id: string;
  patient_id: string;
  caregiver_id: string;
  invitation_token: string | null;
  status: string;
  created_at: string;
  accepted_at: string | null;
}

export interface StockAlert {
  id: string;
  medicine_id: string;
  user_id: string;
  alert_type: string;
  is_read: boolean;
  created_at: string;
}

export interface UserRole {
  id: string;
  user_id: string;
  role: AppRole;
}

// Helper function to determine stock status
export function getStockStatus(quantity: number, threshold: number): StockStatus {
  if (quantity <= 0) return 'critical';
  if (quantity <= threshold) return 'low';
  return 'good';
}

// Session display info
export const SESSION_INFO: Record<SessionType, { label: string; icon: string; defaultTime: string }> = {
  morning: { label: 'Morning', icon: '🌅', defaultTime: '08:00' },
  afternoon: { label: 'Afternoon', icon: '☀️', defaultTime: '14:00' },
  night: { label: 'Night', icon: '🌙', defaultTime: '20:00' },
};

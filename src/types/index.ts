// ===== ENUMS =====

export type Theme = 'dark' | 'midnight' | 'navy' | 'light' | 'contrast';

export type Severity = 'critical' | 'high' | 'medium' | 'low' | 'info';

export type IncidentStatus = 'open' | 'in_progress' | 'pending' | 'closed' | 'false_positive';

export type TaskStatus = 'todo' | 'in_progress' | 'review' | 'done';

export type TaskPriority = 'urgent' | 'high' | 'normal' | 'low';

export type ShiftType = 'morning' | 'afternoon' | 'night';

export type SystemStatus = 'online' | 'degraded' | 'offline';

export type CVEStatus = 'new' | 'investigating' | 'patching' | 'mitigated' | 'wont_fix';

export type UserRole = string;

export type SpecialEventType = 'red_team' | 'blue_team' | 'operation' | 'investigation' | 'infrastructure' | 'external';

export type SpecialEventStatus = 'planned' | 'active' | 'completed' | 'cancelled';

// ===== USER =====

export interface User {
  id?: number;
  fullName: string;
  username: string;
  passwordHash: string;
  email: string;
  phone?: string;
  role: UserRole;
  department?: string;
  avatarUrl?: string;
  isActive: boolean;
  createdAt: string;
  lastLogin?: string;
}

export interface Permission {
  id?: number;
  userId: number;
  module: string;
  canRead: boolean;
  canWrite: boolean;
  canDelete: boolean;
  canAdmin: boolean;
}

export interface ActivityLog {
  id?: number;
  userId: number;
  action: string;
  module: string;
  details?: string;
  ipAddress?: string;
  timestamp: string;
}

// ===== INCIDENTS =====

export interface Incident {
  id?: number;
  incidentNumber: string;
  title: string;
  description: string;
  severity: Severity;
  status: IncidentStatus;
  category: string;
  source: string;
  analystId?: number;
  affectedAsset?: string;
  sourceIp?: string;
  destIp?: string;
  urls?: string;
  fileHashes?: string;
  rca?: string;
  tags?: string;
  playbookId?: number;
  createdAt: string;
  updatedAt: string;
  closedAt?: string;
}

export interface IncidentAction {
  id?: number;
  incidentId: number;
  action: string;
  performedBy: string;
  timestamp: string;
  notes?: string;
}

export interface IncidentAsset {
  id?: number;
  incidentId: number;
  assetType: string;
  value: string;
}

// ===== TASKS =====

export type TaskType = 'one_time' | 'recurring';
export type RecurrenceFrequency = 'daily' | 'weekly' | 'monthly';

export interface Task {
  id?: number;
  title: string;
  description?: string;
  priority: TaskPriority;
  status: TaskStatus;
  taskType?: TaskType;
  recurrenceFrequency?: RecurrenceFrequency;
  incidentId?: number;
  assigneeId?: number;
  assignedUserIds?: number[];
  dueDate?: string;
  createdAt: string;
  updatedAt: string;
}

export const TASK_TYPE_LABELS: Record<TaskType, string> = {
  one_time: 'חד פעמית',
  recurring: 'חוזרת',
};

export const RECURRENCE_LABELS: Record<RecurrenceFrequency, string> = {
  daily: 'יומי',
  weekly: 'שבועי',
  monthly: 'חודשי',
};

export interface TaskComment {
  id?: number;
  taskId: number;
  userId: number;
  comment: string;
  createdAt: string;
}

export interface TaskChecklistItem {
  id?: number;
  taskId: number;
  item: string;
  isDone: boolean;
}

// ===== SHIFTS =====

export interface Analyst {
  id?: number;
  name: string;
  role: string;
  email: string;
  phone?: string;
  status: 'active' | 'inactive';
  avatar?: string;
}

export interface Shift {
  id?: number;
  analystId: number;
  shiftType: ShiftType;
  date: string;
  startTime: string;
  endTime: string;
  notes?: string;
}

export interface ShiftHandover {
  id?: number;
  outgoingShiftId?: number;
  incomingShiftId?: number;
  outgoingAnalyst: string;
  incomingAnalyst: string;
  createdAt: string;
  signedAt?: string;
  receivedAt?: string;
  notes?: string;
}

export interface HandoverItem {
  id?: number;
  handoverId: number;
  type: 'incident' | 'action' | 'infrastructure' | 'note';
  description: string;
  linkedIncidentId?: number;
  status: 'open' | 'acknowledged' | 'resolved';
}

// ===== SYSTEMS =====

export interface MonitoredSystem {
  id?: number;
  name: string;
  category: string;
  description?: string;
  owner?: string;
  checkFrequency: 'hourly' | 'daily' | 'weekly';
  isActive: boolean;
  currentStatus: SystemStatus;
  lastChecked?: string;
}

export interface SystemCheck {
  id?: number;
  systemId: number;
  status: SystemStatus;
  checkedBy: string;
  checkedAt: string;
  notes?: string;
}

export interface SystemDowntime {
  id?: number;
  systemId: number;
  startTime: string;
  endTime?: string;
  cause?: string;
  resolvedBy?: string;
}

// ===== CVEs =====

export interface CVE {
  id?: number;
  cveId: string;
  description: string;
  cvssScore?: number;
  cvssVector?: string;
  publishedDate?: string;
  discoveredAt: string;
  exploitAvailable: boolean;
  treatmentMethod?: string;
}

export interface CVEAsset {
  id?: number;
  cveId: number;
  assetName: string;
  assetType: string;
  status: CVEStatus;
  owner?: string;
  dueDate?: string;
  notes?: string;
}

// ===== SPECIAL EVENTS =====

export interface SpecialEvent {
  id?: number;
  name: string;
  type: SpecialEventType;
  description?: string;
  objectives?: string;
  startDate: string;
  endDate?: string;
  status: SpecialEventStatus;
  findings?: string;
  lessonsLearned?: string;
  createdBy: number;
  createdAt: string;
}

export interface EventParticipant {
  id?: number;
  eventId: number;
  userId: number;
  role?: string;
}

export interface EventChecklistItem {
  id?: number;
  eventId: number;
  playbookItemId?: number;
  item: string;
  isDone: boolean;
  doneBy?: string;
  doneAt?: string;
  order: number;
}

export interface DailyCheckSession {
  id?: number;
  date: string; // YYYY-MM-DD
  checkedBy: string;
  completedAt: string;
  totalSystems: number;
  onlineSystems: number;
  degradedSystems: number;
  offlineSystems: number;
  notes?: string;
}

// ===== SETTINGS =====

export interface SystemSetting {
  key: string;
  value: string;
}

export interface TickerMessage {
  id?: number;
  content: string;
  severity: Severity;
  order: number;
  isActive: boolean;
  createdAt: string;
}

export interface EmergencyBanner {
  id?: number;
  message: string;
  severity: 'critical' | 'high' | 'medium';
  expiresAt?: string;
  isActive: boolean;
  createdAt: string;
}

// ===== UI HELPERS =====

export interface NavItem {
  id: string;
  label: string;
  icon: string;
  path: string;
  badgeCount?: number;
  badgeSeverity?: 'danger' | 'warning' | 'info';
}

export interface Toast {
  id: string;
  message: string;
  type: 'success' | 'error' | 'warning' | 'info';
  duration?: number;
}

export interface KPIData {
  label: string;
  value: number;
  change?: number;
  changeLabel?: string;
  color?: string;
  icon?: string;
}

export const SEVERITY_LABELS: Record<Severity, string> = {
  critical: 'קריטי',
  high: 'גבוה',
  medium: 'בינוני',
  low: 'נמוך',
  info: 'מידע',
};

export const INCIDENT_STATUS_LABELS: Record<IncidentStatus, string> = {
  open: 'פתוח',
  in_progress: 'בטיפול',
  pending: 'ממתין למידע',
  closed: 'נסגר',
  false_positive: 'שגוי',
};

export const TASK_STATUS_LABELS: Record<TaskStatus, string> = {
  todo: 'לביצוע',
  in_progress: 'בתהליך',
  review: 'בבדיקה',
  done: 'הושלם',
};

export const TASK_PRIORITY_LABELS: Record<TaskPriority, string> = {
  urgent: 'דחופה',
  high: 'גבוהה',
  normal: 'רגילה',
  low: 'נמוכה',
};

export const SHIFT_LABELS: Record<ShiftType, string> = {
  morning: 'בוקר (07:00-15:00)',
  afternoon: 'צהריים (15:00-23:00)',
  night: 'לילה (23:00-07:00)',
};

export const USER_ROLE_LABELS: Record<UserRole, string> = {
  admin: 'מנהל מערכת',
  team_lead: 'ראש צוות',
  senior_analyst: 'אנליסט בכיר',
  analyst: 'אנליסט',
  viewer: 'צופה',
};

export const SYSTEM_CATEGORIES = [
  'SIEM', 'EDR', 'Firewall', 'IDS/IPS', 'SOAR', 'Backup', 'Active Directory', 'אחר'
];

export const INCIDENT_CATEGORIES = [
  'Phishing', 'Malware', 'Intrusion', 'DDoS', 'Insider Threat',
  'Data Breach', 'Ransomware', 'Vulnerability Exploit', 'Social Engineering', 'אחר'
];

export const INCIDENT_SOURCES = [
  'SIEM', 'EDR', 'Firewall', 'IDS/IPS', 'SOC Analyst', 'לקוח', 'ספק', 'אחר'
];

// ===== PLAYBOOKS =====

export interface Playbook {
  id?: number;
  name: string;
  category: string;
  description?: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface PlaybookItem {
  id?: number;
  playbookId: number;
  item: string;
  phase?: string;
  order: number;
}

export interface IncidentChecklistItem {
  id?: number;
  incidentId: number;
  playbookItemId?: number;
  item: string;
  isDone: boolean;
  doneBy?: string;
  doneAt?: string;
  order: number;
}

// ===== INVENTORY =====

export type InventoryItemType = 'drive' | 'laptop' | 'tablet' | 'usb' | 'cable' | 'other';
export type InventoryCondition = 'good' | 'fair' | 'damaged' | 'retired';
export type LoanStatus = 'active' | 'returned' | 'overdue';

export interface InventoryItem {
  id?: number;
  name: string;
  type: string;
  serialNumber?: string;
  capacity?: string;
  manufacturer?: string;
  model?: string;
  condition: InventoryCondition;
  location?: string;
  notes?: string;
  createdAt: string;
}

export interface Loan {
  id?: number;
  inventoryItemId: number;
  borrowerName: string;
  borrowerId?: string;
  purpose?: string;
  loanedAt: string;
  expectedReturn?: string;
  returnedAt?: string;
  status: LoanStatus;
  notes?: string;
  approvedBy?: string;
  createdAt: string;
  // joined fields
  itemName?: string;
  itemType?: string;
  itemSerial?: string;
}

export const INVENTORY_TYPE_LABELS: Record<InventoryItemType, string> = {
  drive: 'כונן נייד',
  laptop: 'מחשב נייד',
  tablet: 'טאבלט',
  usb: 'USB',
  cable: 'כבל',
  other: 'אחר',
};

export const INVENTORY_CONDITION_LABELS: Record<InventoryCondition, string> = {
  good: 'תקין',
  fair: 'בינוני',
  damaged: 'פגום',
  retired: 'יצא משימוש',
};

export const LOAN_STATUS_LABELS: Record<LoanStatus, string> = {
  active: 'בהשאלה',
  returned: 'הוחזר',
  overdue: 'באיחור',
};

export const SPECIAL_EVENT_TYPE_LABELS: Record<SpecialEventType, string> = {
  red_team: 'Red Team',
  blue_team: 'Blue Team',
  operation: 'מבצע אבטחה',
  investigation: 'חקירה ממוקדת',
  infrastructure: 'שינוי תשתיתי',
  external: 'אירוע חיצוני',
};

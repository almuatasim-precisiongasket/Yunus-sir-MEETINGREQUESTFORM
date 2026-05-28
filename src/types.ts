export type FieldType = 'text' | 'textarea' | 'dropdown' | 'date' | 'time' | 'phone' | 'email';

export interface FormField {
  id: string;
  label: string;
  type: FieldType;
  required: boolean;
  options?: string[]; // Used if type === 'dropdown'
  isSystem?: boolean; // If true, cannot be removed (but can be renamed/reordered)
  placeholder?: string; // Guidance for input fields
}

export interface FormTemplate {
  id: string;
  title: string;
  description: string;
  successMessage: string;
  fields: FormField[];
  createdAt: number;
}

export type RequestStatus = 'Pending' | 'Approved' | 'Declined' | 'Follow-up Needed';

export interface MeetingRequest {
  id: string;
  formId: string;
  createdAt: number;
  status: RequestStatus;
  isUrgent?: boolean; // Keep for backward compatibility / urgent highlights
  priority?: 'Normal' | 'Important' | 'Urgent'; // Request Priority level
  responses: Record<string, string | boolean>;
  calendarLink?: string;
  meetLink?: string;
}



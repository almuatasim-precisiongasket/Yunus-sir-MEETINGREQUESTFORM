import {
  getFirestore,
  collection,
  doc,
  getDocs,
  getDoc,
  setDoc,
  updateDoc,
  deleteDoc,
  query,
  orderBy,
  onSnapshot
} from 'firebase/firestore';
import { initializeApp, getApp } from 'firebase/app';
import firebaseConfig from '../../firebase-applet-config.json';
import { FormTemplate, MeetingRequest } from '../types';

let app;
try {
  app = getApp();
} catch (e) {
  app = initializeApp(firebaseConfig);
}
export const db = getFirestore(app);

const defaultForm: FormTemplate = {
  id: "form-default",
  title: "Meeting Request Form",
  description: "Welcome to PRECI FORM. Our office securely reviews and coordinates all incoming executive scheduling requests.",
  successMessage: "Your executive request has been safely cataloged and is queued for verification.",
  createdAt: Date.now(),
  fields: [
    { id: "fullName", label: "Name", type: "text", required: true, isSystem: true },
    { id: "company", label: "Company / Organization", type: "text", required: false, isSystem: true },
    { id: "category", label: "Meeting Category", type: "dropdown", required: true, isSystem: false, options: ["Business", "Legal", "Investment", "Personal", "General", "Other"] },
    { id: "phoneNumber", label: "Phone Number", type: "phone", required: false, isSystem: false },
    { id: "preferredDate", label: "Preferred Meeting Date", type: "date", required: true, isSystem: true },
    { id: "preferredTime", label: "Preferred Meeting Time", type: "time", required: true, isSystem: true },
    { id: "expectedDuration", label: "Expected Duration", type: "dropdown", required: true, isSystem: true, options: ["15 minutes", "30 minutes", "45 minutes", "1 hour", "1.5 hours", "2+ hours"] },
    { id: "purpose", label: "Purpose of Meeting", type: "textarea", required: true, isSystem: true, placeholder: "Briefly describe the purpose of your request or meeting." },
    { id: "context", label: "Detailed Notes / Context", type: "textarea", required: false, isSystem: false, placeholder: "Optional supporting details, project context, or scheduling considerations" }
  ]
};

// --- FALLBACK IN-MEMORY/LOCAL STORAGE FOR ZERO FRICTION ---
const isLocalStorageAvailable = typeof window !== 'undefined' && window.localStorage;

function getLocal<T>(key: string, fallback: T): T {
  if (!isLocalStorageAvailable) return fallback;
  const val = localStorage.getItem(key);
  if (!val) return fallback;
  try {
    return JSON.parse(val);
  } catch (e) {
    return fallback;
  }
}

function setLocal<T>(key: string, val: T) {
  if (!isLocalStorageAvailable) return;
  localStorage.setItem(key, JSON.stringify(val));
}

// --- API IMPLEMENTATION ---

export interface BlackoutDate {
  date: string;
  label: string;
}

export interface SettingsData {
  businessStartHour: number;
  businessEndHour: number;
  blackoutDates: BlackoutDate[];
  adminEmail: string;
  adminPhone: string;
  emailAlertsEnabled: boolean;
  whatsappAlertsEnabled: boolean;
}

const defaultSettingsFallback: SettingsData = {
  businessStartHour: 9,
  businessEndHour: 17,
  blackoutDates: [],
  adminEmail: '',
  adminPhone: '',
  emailAlertsEnabled: false,
  whatsappAlertsEnabled: false
};

export async function getSettings(): Promise<SettingsData> {
  try {
    const docRef = doc(db, 'settings', 'global');
    const docSnap = await getDoc(docRef);
    if (docSnap.exists()) {
      const data = docSnap.data();
      return {
        ...defaultSettingsFallback,
        ...data
      } as SettingsData;
    }
  } catch (err) {
    console.warn('Firestore getSettings error, using local/fallback:', err);
  }
  return getLocal('sys_settings', defaultSettingsFallback);
}

export async function saveSettings(settings: SettingsData): Promise<void> {
  setLocal('sys_settings', settings);
  try {
    const docRef = doc(db, 'settings', 'global');
    await setDoc(docRef, settings);
  } catch (err) {
    console.error('Firestore saveSettings error:', err);
    throw err;
  }
}

export async function getCalendarAvailability(): Promise<{ busy: any[] }> {
  try {
    const docRef = doc(db, 'availability', 'cache');
    const docSnap = await getDoc(docRef);
    if (docSnap.exists()) {
      return docSnap.data() as any;
    }
  } catch (err) {
    console.warn('Firestore getCalendarAvailability error, using local/fallback:', err);
  }
  return getLocal('calendar_availability', { busy: [] });
}

export async function saveCalendarAvailability(busy: any[]): Promise<void> {
  setLocal('calendar_availability', { busy });
  try {
    const docRef = doc(db, 'availability', 'cache');
    await setDoc(docRef, { busy });
  } catch (err) {
    console.error('Firestore saveCalendarAvailability error:', err);
    throw err;
  }
}

export async function getForms(): Promise<FormTemplate[]> {
  try {
    const querySnapshot = await getDocs(collection(db, 'forms'));
    const forms: FormTemplate[] = [];
    querySnapshot.forEach((doc) => {
      forms.push({ ...doc.data(), id: doc.id } as FormTemplate);
    });
    if (forms.length > 0) {
      return forms.sort((a, b) => a.createdAt - b.createdAt);
    }
  } catch (err) {
    console.warn('Firestore getForms error, using local/fallback:', err);
  }

  const localForms = getLocal<FormTemplate[]>('form_templates', [defaultForm]);
  return localForms;
}

export async function addForm(form: FormTemplate): Promise<FormTemplate> {
  const localForms = getLocal<FormTemplate[]>('form_templates', [defaultForm]);
  localForms.push(form);
  setLocal('form_templates', localForms);

  try {
    const docRef = doc(db, 'forms', form.id);
    await setDoc(docRef, { ...form, createdAt: form.createdAt || Date.now() });
  } catch (err) {
    console.error('Firestore addForm error:', err);
  }
  return form;
}

export async function updateForm(id: string, form: FormTemplate): Promise<FormTemplate> {
  const localForms = getLocal<FormTemplate[]>('form_templates', [defaultForm]);
  const index = localForms.findIndex(f => f.id === id);
  if (index !== -1) {
    localForms[index] = form;
    setLocal('form_templates', localForms);
  }

  try {
    const docRef = doc(db, 'forms', id);
    await setDoc(docRef, form);
  } catch (err) {
    console.error('Firestore updateForm error:', err);
  }
  return form;
}

export async function deleteForm(id: string): Promise<void> {
  const localForms = getLocal<FormTemplate[]>('form_templates', [defaultForm]);
  const filtered = localForms.filter(f => f.id !== id);
  setLocal('form_templates', filtered.length === 0 ? [defaultForm] : filtered);

  try {
    const docRef = doc(db, 'forms', id);
    await deleteDoc(docRef);
  } catch (err) {
    console.error('Firestore deleteForm error:', err);
  }
}

export async function getRequests(): Promise<MeetingRequest[]> {
  try {
    const q = query(collection(db, 'requests'), orderBy('createdAt', 'desc'));
    const querySnapshot = await getDocs(q);
    const requests: MeetingRequest[] = [];
    querySnapshot.forEach((doc) => {
      requests.push({ ...doc.data(), id: doc.id } as MeetingRequest);
    });
    if (requests.length > 0) {
      return requests;
    }
  } catch (err) {
    console.warn('Firestore getRequests error, using local/fallback:', err);
  }

  return getLocal<MeetingRequest[]>('meeting_requests', []);
}

export async function addRequest(request: MeetingRequest): Promise<MeetingRequest> {
  const localRequests = getLocal<MeetingRequest[]>('meeting_requests', []);
  localRequests.unshift(request);
  setLocal('meeting_requests', localRequests);

  try {
    const docRef = doc(db, 'requests', request.id);
    await setDoc(docRef, request);
  } catch (err) {
    console.error('Firestore addRequest error:', err);
  }
  return request;
}

export async function updateRequestStatus(id: string, status: string): Promise<void> {
  const localRequests = getLocal<MeetingRequest[]>('meeting_requests', []);
  const index = localRequests.findIndex(r => r.id === id);
  if (index !== -1) {
    localRequests[index].status = status as any;
    setLocal('meeting_requests', localRequests);
  }

  try {
    const docRef = doc(db, 'requests', id);
    await updateDoc(docRef, { status });
  } catch (err) {
    console.error('Firestore updateRequestStatus error:', err);
  }
}

export async function updateRequestLinks(id: string, calendarLink: string, meetLink: string): Promise<void> {
  const localRequests = getLocal<MeetingRequest[]>('meeting_requests', []);
  const index = localRequests.findIndex(r => r.id === id);
  if (index !== -1) {
    localRequests[index].calendarLink = calendarLink;
    localRequests[index].meetLink = meetLink;
    setLocal('meeting_requests', localRequests);
  }

  try {
    const docRef = doc(db, 'requests', id);
    await updateDoc(docRef, { calendarLink, meetLink });
  } catch (err) {
    console.error('Firestore updateRequestLinks error:', err);
  }
}


export async function deleteRequest(id: string): Promise<void> {
  const localRequests = getLocal<MeetingRequest[]>('meeting_requests', []);
  const filtered = localRequests.filter(r => r.id !== id);
  setLocal('meeting_requests', filtered);

  try {
    const docRef = doc(db, 'requests', id);
    await deleteDoc(docRef);
  } catch (err) {
    console.error('Firestore deleteRequest error:', err);
  }
}

export async function seedRequests(): Promise<MeetingRequest[]> {
  const seedData: MeetingRequest[] = [
    {
      id: "seed-1",
      formId: "form-default",
      createdAt: Date.now() - 3600000,
      status: "Pending",
      isUrgent: true,
      responses: {
        fullName: "Eng. Robert Chen",
        company: "Apex Precision Materials",
        phoneNumber: "+1 (555) 382-9011",
        purpose: "Sourcing partnership for high-grade titanium grade 5 alloy structures.",
        context: "Met briefly at the Munich Aerospace Expo. We want to discuss specialized manufacturing contracts for our upcoming drone fleet chassis.",
        preferredDate: "2026-06-03",
        preferredTime: "10:30",
        expectedDuration: "45 minutes",
        category: "Business",
        source: "Munich Aerospace Expo"
      }
    },
    {
      id: "seed-2",
      formId: "form-default",
      createdAt: Date.now() - 10800000,
      status: "Follow-up Needed",
      isUrgent: false,
      responses: {
        fullName: "Aditi Rao",
        company: "Nexus Ventures plc",
        phoneNumber: "+44 20 7946 0958",
        purpose: "Strategic investment round review for advanced robotics division.",
        context: "Following up on the preliminary term sheet signed last quarter. Looking to align timeline and corporate governance covenants.",
        preferredDate: "2026-06-05",
        preferredTime: "14:00",
        expectedDuration: "1 hour",
        category: "Investment",
        source: "Direct Referral from Lord Sterling"
      }
    }
  ];

  setLocal('meeting_requests', seedData);

  for (const req of seedData) {
    try {
      const docRef = doc(db, 'requests', req.id);
      await setDoc(docRef, req);
    } catch (err) {
      console.warn(`Firestore seed error for ${req.id}:`, err);
    }
  }

  return seedData;
}

export function subscribeRequests(
  onUpdate: (requests: MeetingRequest[]) => void,
  onError: (err: any) => void
) {
  try {
    const q = query(collection(db, 'requests'), orderBy('createdAt', 'desc'));
    return onSnapshot(q, (snapshot) => {
      const requests: MeetingRequest[] = [];
      snapshot.forEach((doc) => {
        requests.push({ ...doc.data(), id: doc.id } as MeetingRequest);
      });
      onUpdate(requests);
    }, (err) => {
      console.warn('Firestore subscription update failed:', err);
      onError(err);
    });
  } catch (err) {
    console.warn('Failed to initialize Firestore subscription:', err);
    onError(err);
    return () => { };
  }
}

export interface GoogleCredentials {
  clientId: string;
  clientSecret: string;
  refreshToken?: string;
  accessToken?: string;
  tokenExpiry?: number;
}

export async function getGoogleCredentials(): Promise<GoogleCredentials | null> {
  try {
    const docRef = doc(db, 'settings', 'google_auth');
    const docSnap = await getDoc(docRef);
    if (docSnap.exists()) {
      return docSnap.data() as GoogleCredentials;
    }
  } catch (err) {
    console.warn('Firestore getGoogleCredentials error, using local fallback:', err);
  }
  return getLocal<GoogleCredentials | null>('google_credentials', null);
}

export async function saveGoogleCredentials(creds: GoogleCredentials): Promise<void> {
  setLocal('google_credentials', creds);
  try {
    const docRef = doc(db, 'settings', 'google_auth');
    await setDoc(docRef, creds);
  } catch (err) {
    console.error('Firestore saveGoogleCredentials error:', err);
    throw err;
  }
}



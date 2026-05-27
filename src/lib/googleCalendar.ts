import { MeetingRequest } from '../types';
import { saveCalendarAvailability } from './db';

export interface CalendarSyncResult {
  htmlLink?: string;
  hangoutLink?: string;
  alreadyExists: boolean;
}

// Helper to estimate and parse duration in minutes
export function getDurationInMinutes(durationStr: string): number {
  const norm = (durationStr || '').toLowerCase();
  if (norm.includes('15')) return 15;
  if (norm.includes('30')) return 30;
  if (norm.includes('45')) return 45;
  if (norm.includes('1.5') || norm.includes('90')) return 90;
  if (norm.includes('1 hour') || norm.includes('1h')) return 60;
  if (norm.includes('2')) return 120;
  return 60; // default 1 hour
}

// Helper to convert to Local ISO string (YYYY-MM-DDTHH:MM:SS) 
// without UTC offset representation, paired with timezone.
function getLocalISOString(date: Date): string {
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}`;
}

/**
 * Fetches free/busy information for the next 30 days and posts it to the backend cache.
 */
export async function syncFreeBusyToCache(accessToken: string): Promise<void> {
  const timeMin = new Date();
  const timeMax = new Date();
  timeMax.setDate(timeMax.getDate() + 30); // Next 30 days

  const url = 'https://www.googleapis.com/calendar/v3/freeBusy';
  const body = {
    timeMin: timeMin.toISOString(),
    timeMax: timeMax.toISOString(),
    items: [{ id: 'primary' }]
  };

  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(body)
    });

    if (!res.ok) {
      console.warn('Failed to fetch free/busy data', await res.text());
      return;
    }

    const data = await res.json();
    const busy = data.calendars?.primary?.busy || [];

    // Push to our local/cloud database cache
    await saveCalendarAvailability(busy);
  } catch (err) {
    console.error('Error syncing free/busy:', err);
  }
}

/**
 * Searches the user's Google Calendar to see if this meeting request is already synced.
 */
export async function findExistingCalendarEvent(
  accessToken: string,
  requestId: string
): Promise<any | null> {
  try {
    const query = encodeURIComponent(requestId);
    const url = `https://www.googleapis.com/calendar/v3/calendars/primary/events?q=${query}`;
    
    const res = await fetch(url, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json'
      }
    });

    if (!res.ok) {
      console.warn('Failed to search calendar events', await res.text());
      return null;
    }

    const data = await res.json();
    if (data.items && data.items.length > 0) {
      // Find the event that contains the exact requested ID in its description
      const found = data.items.find((item: any) => 
        (item.description || '').includes(requestId)
      );
      return found || null;
    }
  } catch (err) {
    console.error('Error finding calendar event:', err);
  }
  return null;
}

/**
 * Syncs a meeting request to the user's primary Google Calendar.
 * Creates a beautiful calendar invitation and generates a Google Meet link.
 */
export async function syncToGoogleCalendar(
  accessToken: string,
  request: MeetingRequest
): Promise<CalendarSyncResult> {
  const existing = await findExistingCalendarEvent(accessToken, request.id);
  
  if (existing) {
    return {
      htmlLink: existing.htmlLink,
      hangoutLink: existing.hangoutLink,
      alreadyExists: true
    };
  }

  // Calculate start time dynamically from responses
  let prefDate = String(request.responses?.preferredDate || '');
  let prefTime = String(request.responses?.preferredTime || '');
  
  if (!prefDate) {
    const dateVal = Object.values(request.responses).find(val => 
      typeof val === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(val)
    );
    prefDate = String(dateVal || '');
  }
  
  if (!prefTime) {
    const timeVal = Object.values(request.responses).find(val => 
      typeof val === 'string' && /^\d{2}:\d{2}$/.test(val)
    );
    prefTime = String(timeVal || '09:00');
  }

  // Graceful fallback to prevent invalid dates (NaN-NaN-NaN) if missing entirely
  if (!prefDate) {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const pad = (n: number) => String(n).padStart(2, '0');
    prefDate = `${tomorrow.getFullYear()}-${pad(tomorrow.getMonth() + 1)}-${pad(tomorrow.getDate())}`;
  }

  const startDateTimeStr = `${prefDate}T${prefTime}:00`;
  const startDate = new Date(startDateTimeStr);
  
  // Calculate end time dynamically
  let expectedDuration = String(request.responses?.expectedDuration || '');
  if (!expectedDuration) {
    const durationVal = Object.values(request.responses).find(val => 
      typeof val === 'string' && (val.toLowerCase().includes('min') || val.toLowerCase().includes('hour'))
    );
    expectedDuration = String(durationVal || '30 minutes');
  }
  const durationMin = getDurationInMinutes(expectedDuration);
  const endDate = new Date(startDate.getTime() + durationMin * 60000);

  const startISO = getLocalISOString(startDate);
  const endISO = getLocalISOString(endDate);
  const userTimezone = Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC';

  // Build high-ROI meeting description
  const description = [
    `Precision Engineering Group — Executive Meeting`,
    `-----------------------------------------------`,
    `Requester: ${String(request.responses?.fullName || '')}`,
    `Company: ${String(request.responses?.company || '') || 'Individual Request'}`,
    `Phone: ${String(request.responses?.phoneNumber || '')}`,
    `Meeting Category: ${String(request.responses?.category || '')}`,
    `Contact Source: ${String(request.responses?.source || '')}`,
    ``,
    `Purpose of Meeting:`,
    `${String(request.responses?.purpose || '')}`,
    ``,
    `Notes/Context:`,
    `${String(request.responses?.context || '') || 'None provided.'}`,
    ``,
    `-----------------------------------------------`,
    `Verified Request ID: ${request.id}`,
    `This event was synthesized and synced via PRECI FORM Admin Dashboard.`
  ].join('\n');

  // Request Body
  const eventBody = {
    summary: `[PRECI] ${String(request.responses?.category || '')}: ${String(request.responses?.fullName || '')} (${String(request.responses?.company || '') || 'Individual'})`,
    description: description,
    start: {
      dateTime: startISO,
      timeZone: userTimezone
    },
    end: {
      dateTime: endISO,
      timeZone: userTimezone
    },
    conferenceData: {
      createRequest: {
        requestId: request.id,
        conferenceSolutionKey: {
          type: 'hangoutsMeet'
        }
      }
    }
  };

  const url = 'https://www.googleapis.com/calendar/v3/calendars/primary/events?conferenceDataVersion=1';
  
  const res = await fetch(url, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(eventBody)
  });

  if (!res.ok) {
    const errorMsg = await res.text();
    throw new Error(`Google Calendar scheduling failed: ${errorMsg}`);
  }

  const createdEvent = await res.json();
  
  return {
    htmlLink: createdEvent.htmlLink,
    hangoutLink: createdEvent.hangoutLink,
    alreadyExists: false
  };
}

/**
 * Fetches Mr. Yunus's Google Calendar events for the next 24 hours.
 */
export async function fetchUpcomingEvents(accessToken: string): Promise<any[]> {
  const timeMin = new Date().toISOString();
  const timeMax = new Date(Date.now() + 24 * 3600 * 1000).toISOString(); // next 24 hours
  const url = `https://www.googleapis.com/calendar/v3/calendars/primary/events?timeMin=${encodeURIComponent(timeMin)}&timeMax=${encodeURIComponent(timeMax)}&singleEvents=true&orderBy=startTime`;
  
  try {
    const res = await fetch(url, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json'
      }
    });

    if (!res.ok) {
      console.warn('Failed to fetch upcoming Google Calendar events', await res.text());
      return [];
    }

    const data = await res.json();
    return data.items || [];
  } catch (err) {
    console.error('Error fetching upcoming events:', err);
    return [];
  }
}


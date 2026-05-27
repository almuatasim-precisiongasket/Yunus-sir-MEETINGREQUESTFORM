import { MeetingRequest } from '../types';

export async function sendAutoReply(accessToken: string, request: MeetingRequest, type: 'Approved' | 'Declined', meetLink?: string) {
  const emailField = Object.keys(request.responses).find(k => k.toLowerCase().includes('email'));
  let toEmail = '';
  if (emailField) {
    toEmail = request.responses[emailField] as string;
  } else {
    // If we can't find an email, fallback to a standard field name or bail.
    toEmail = (request.responses['email'] as string) || '';
  }

  if (!toEmail) {
    console.warn("Could not find recipient email for auto-reply.");
    return;
  }

  const subject = type === 'Approved' 
    ? `Your Meeting Request is Approved: ${request.responses.category || 'General'}` 
    : `Update on your Meeting Request`;

  // Resolve Date and Time dynamically
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
    prefTime = String(timeVal || '');
  }

  let body = '';
  if (type === 'Approved') {
    body = `Hi ${request.responses.fullName || ''},\n\n` + 
           `Your meeting request has been approved and added to my calendar.\n\n` +
           `Time: ${prefDate} at ${prefTime}\n` +
           (meetLink ? `Google Meet Link: ${meetLink}\n\n` : '\n') +
           `Looking forward to speaking with you.\n\nRegards,\nPrecision Engineering Group`;
  } else {
    body = `Hi ${request.responses.fullName || ''},\n\n` + 
           `Thank you for your meeting request. Unfortunately, I have to decline at this time due to scheduling constraints.\n\n` +
           `Best regards,\nPrecision Engineering Group`;
  }

  const rawMessage = [
    `To: ${toEmail}`,
    `Subject: ${subject}`,
    `Content-Type: text/plain; charset="UTF-8"`,
    '',
    body
  ].join('\n');

  // Base64URL encode
  const encodedEmail = btoa(unescape(encodeURIComponent(rawMessage)))
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');

  const url = 'https://gmail.googleapis.com/gmail/v1/users/me/messages/send';
  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ raw: encodedEmail })
    });

    if (!res.ok) {
      console.error("Failed to send auto-reply", await res.text());
    } else {
      console.log("Auto-reply sent to", toEmail);
    }
  } catch (err) {
    console.error("Error sending auto-reply", err);
  }
}

export async function sendAdminNotificationEmail(
  accessToken: string,
  adminEmail: string,
  request: MeetingRequest
) {
  if (!adminEmail) {
    console.warn("No admin email configured for notifications.");
    return;
  }

  const guestName = String(request.responses.fullName || 'Guest');
  const subject = `[PRECI FORM Alert] New Booking Request from ${guestName}`;

  let prefDate = String(request.responses?.preferredDate || '');
  let prefTime = String(request.responses?.preferredTime || '');
  
  const body = `Hi Administrator,\n\n` + 
         `A new meeting request has been submitted through the PRECI FORM gateway.\n\n` +
         `Guest Details:\n` +
         `- Name: ${guestName}\n` +
         `- Company: ${request.responses.company || 'Not Provided'}\n` +
         `- Category: ${request.responses.category || 'General'}\n` +
         `- Phone: ${request.responses.phoneNumber || 'Not Provided'}\n\n` +
         `Preferred Date/Time:\n` +
         `- Date: ${prefDate}\n` +
         `- Time: ${prefTime}\n` +
         `- Expected Duration: ${request.responses.expectedDuration || 'Not Specified'}\n\n` +
         `Purpose of Request:\n` +
         `"${request.responses.purpose || 'No purpose description provided.'}"\n\n` +
         (request.responses.context ? `Context / Supporting Details:\n"${request.responses.context}"\n\n` : '') +
         `Urgency Priority: ${request.isUrgent ? 'URGENT' : 'Normal'}\n\n` +
         `Please manage this request in your PRECI FORM Admin Dashboard.\n\nRegards,\nPRECI FORM System`;

  const rawMessage = [
    `To: ${adminEmail}`,
    `Subject: ${subject}`,
    `Content-Type: text/plain; charset="UTF-8"`,
    '',
    body
  ].join('\n');

  const encodedEmail = btoa(unescape(encodeURIComponent(rawMessage)))
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');

  const url = 'https://gmail.googleapis.com/gmail/v1/users/me/messages/send';
  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ raw: encodedEmail })
    });

    if (!res.ok) {
      console.error("Failed to send admin email alert", await res.text());
    } else {
      console.log("Admin alert email successfully sent to", adminEmail);
    }
  } catch (err) {
    console.error("Error sending admin email alert", err);
  }
}

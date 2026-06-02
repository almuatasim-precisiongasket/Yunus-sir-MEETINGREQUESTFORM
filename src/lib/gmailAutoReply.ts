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
    throw new Error("No recipient email address was found in the request form responses.");
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
      const errText = await res.text();
      console.error("Failed to send auto-reply", errText);
      throw new Error(`Gmail API error: ${errText}`);
    } else {
      console.log("Auto-reply sent to", toEmail);
    }
  } catch (err) {
    console.error("Error sending auto-reply", err);
    throw err;
  }
}
export async function sendAdminNotificationEmail(
  accessToken: string,
  adminEmail: string,
  request: MeetingRequest,
  baseUrl?: string
) {
  if (!adminEmail) {
    console.warn("No admin email configured for notifications.");
    return;
  }

  const host = baseUrl || (typeof window !== 'undefined' ? window.location.origin : 'http://localhost:5173');
  const reviewUrl = `${host.replace(/\/+$/, '')}/request/${request.id}?admin=true`;

  const priority = request.priority || (request.isUrgent ? 'Urgent' : 'Normal');
  const guestName = String(request.responses.fullName || 'Guest');
  
  // Scannable Subject Lines
  const subjectPrefix = priority === 'Urgent' 
    ? '[Urgent]' 
    : priority === 'Important' 
    ? '[Important]' 
    : '[PRECI FORM]';
  const subject = `${subjectPrefix} New Meeting Request - ${guestName}`;

  // Timezone formatting for AST (GMT+3)
  const submittedAtDate = new Date(request.createdAt);
  const formattedSubmittedAt = submittedAtDate.toLocaleString('en-US', {
    month: 'long',
    day: 'numeric',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
    timeZone: 'Asia/Riyadh'
  }) + ' AST';

  let prefDate = String(request.responses?.preferredDate || '');
  let prefTime = String(request.responses?.preferredTime || '');
  
  if (!prefDate) {
    const dateVal = Object.values(request.responses).find(val => 
      typeof val === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(val)
    );
    prefDate = String(dateVal || 'Not Selected');
  }
  
  if (!prefTime) {
    const timeVal = Object.values(request.responses).find(val => 
      typeof val === 'string' && /^\d{2}:\d{2}$/.test(val)
    );
    prefTime = String(timeVal || 'Not Selected');
  }

  // Premium formatting for dates and times
  let displayDate = prefDate;
  try {
    if (prefDate && prefDate !== 'Not Selected') {
      const parsedDate = new Date(prefDate + 'T00:00:00');
      displayDate = parsedDate.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric', weekday: 'long' });
    }
  } catch (e) {
    displayDate = prefDate;
  }

  let displayTime = prefTime;
  try {
    if (prefTime && prefTime !== 'Not Selected' && prefTime.includes(':')) {
      const [hours, minutes] = prefTime.split(':');
      const hourNum = parseInt(hours, 10);
      const ampm = hourNum >= 12 ? 'PM' : 'AM';
      const formattedHour = hourNum % 12 || 12;
      displayTime = `${formattedHour}:${minutes} ${ampm}`;
    }
  } catch (e) {
    displayTime = prefTime;
  }

  const displayId = `PEG-${request.id.slice(0, 8).toUpperCase()}`;

  // Premium HTML Template
  const htmlBody = `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>${subject}</title>
</head>
<body style="margin: 0; padding: 0; background-color: #F8FAFC; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #111827; -webkit-font-smoothing: antialiased;">
  <table border="0" cellpadding="0" cellspacing="0" width="100%" style="background-color: #F8FAFC; padding: 32px 16px;">
    <tr>
      <td align="center">
        <table border="0" cellpadding="0" cellspacing="0" width="100%" style="max-width: 600px; background-color: #ffffff; border: 1px solid #E5E7EB; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 12px rgba(11, 31, 51, 0.05);">
          <!-- Header -->
          <tr>
            <td style="background-color: #0B1F33; padding: 24px; text-align: center;">
              <h1 style="margin: 0; color: #ffffff; font-size: 20px; font-weight: 800; letter-spacing: -0.5px; text-transform: uppercase;">PRECI FORM</h1>
              <p style="margin: 4px 0 0 0; color: #93C5FD; font-size: 11px; font-weight: 700; letter-spacing: 1.5px; text-transform: uppercase;">Operations Coordination</p>
            </td>
          </tr>
          <!-- Content -->
          <tr>
            <td style="padding: 32px 24px;">
              <p style="margin: 0 0 20px 0; font-size: 15px; line-height: 1.5; color: #374151;">
                Hi Administrator,<br><br>
                A new meeting request has been submitted through the PRECI FORM gateway. Please review the details below.
              </p>
              
              <!-- Details Table -->
              <table border="0" cellpadding="0" cellspacing="0" width="100%" style="margin-bottom: 28px; border-collapse: collapse;">
                <!-- Requester Name -->
                <tr style="border-bottom: 1px solid #F3F4F6;">
                  <td style="padding: 12px 0; font-size: 12px; font-weight: 600; color: #6B7280; width: 35%; text-transform: uppercase; letter-spacing: 0.5px;">Guest Name</td>
                  <td style="padding: 12px 0; font-size: 14px; font-weight: 700; color: #0B1F33;">${guestName}</td>
                </tr>
                <!-- Company -->
                <tr style="border-bottom: 1px solid #F3F4F6;">
                  <td style="padding: 12px 0; font-size: 12px; font-weight: 600; color: #6B7280; text-transform: uppercase; letter-spacing: 0.5px;">Company</td>
                  <td style="padding: 12px 0; font-size: 14px; font-weight: 700; color: #0B1F33;">${request.responses.company || 'Not Provided'}</td>
                </tr>
                <!-- Meeting Category -->
                <tr style="border-bottom: 1px solid #F3F4F6;">
                  <td style="padding: 12px 0; font-size: 12px; font-weight: 600; color: #6B7280; text-transform: uppercase; letter-spacing: 0.5px;">Category</td>
                  <td style="padding: 12px 0; font-size: 14px; font-weight: 700; color: #0B1F33;"><span style="background-color: #EFF6FF; border: 1px solid #BFDBFE; color: #1E40AF; padding: 2px 8px; border-radius: 99px; font-size: 11px; font-weight: 800; text-transform: uppercase; display: inline-block;">${request.responses.category || 'General'}</span></td>
                </tr>
                <!-- Preferred Date -->
                <tr style="border-bottom: 1px solid #F3F4F6;">
                  <td style="padding: 12px 0; font-size: 12px; font-weight: 600; color: #6B7280; text-transform: uppercase; letter-spacing: 0.5px;">Preferred Date</td>
                  <td style="padding: 12px 0; font-size: 14px; font-weight: 700; color: #0B1F33;">${displayDate}</td>
                </tr>
                <!-- Preferred Time -->
                <tr style="border-bottom: 1px solid #F3F4F6;">
                  <td style="padding: 12px 0; font-size: 12px; font-weight: 600; color: #6B7280; text-transform: uppercase; letter-spacing: 0.5px;">Preferred Time</td>
                  <td style="padding: 12px 0; font-size: 14px; font-weight: 700; color: #0B1F33;">${displayTime}</td>
                </tr>
                <!-- Expected Duration -->
                <tr style="border-bottom: 1px solid #F3F4F6;">
                  <td style="padding: 12px 0; font-size: 12px; font-weight: 600; color: #6B7280; text-transform: uppercase; letter-spacing: 0.5px;">Duration</td>
                  <td style="padding: 12px 0; font-size: 14px; font-weight: 700; color: #0B1F33;">${request.responses.expectedDuration || '30 Minutes'}</td>
                </tr>
                <!-- Priority -->
                <tr style="border-bottom: 1px solid #F3F4F6;">
                  <td style="padding: 12px 0; font-size: 12px; font-weight: 600; color: #6B7280; text-transform: uppercase; letter-spacing: 0.5px;">Priority</td>
                  <td style="padding: 12px 0; font-size: 14px; font-weight: 700; color: ${priority === 'Urgent' ? '#DC2626' : priority === 'Important' ? '#D97706' : '#2563EB'};">${priority}</td>
                </tr>
                <!-- Submitted At -->
                <tr style="border-bottom: 1px solid #F3F4F6;">
                  <td style="padding: 12px 0; font-size: 12px; font-weight: 600; color: #6B7280; text-transform: uppercase; letter-spacing: 0.5px;">Submitted At</td>
                  <td style="padding: 12px 0; font-size: 13px; font-weight: 600; color: #374151;">${formattedSubmittedAt}</td>
                </tr>
              </table>
              
              <!-- Purpose Section -->
              <div style="background-color: #F8FAFC; border-left: 4px solid #008FD5; padding: 16px; border-radius: 4px; margin-bottom: 36px;">
                <span style="font-size: 10px; font-weight: 800; color: #6B7280; text-transform: uppercase; letter-spacing: 1px; display: block; margin-bottom: 6px;">Purpose of Meeting</span>
                <p style="margin: 0; font-size: 13px; line-height: 1.5; color: #374151; font-weight: 500;">
                  "${request.responses.purpose || 'No description provided.'}"
                </p>
              </div>
              
              <!-- Button Call to Action Section (Future-Proofed with Padding Below) -->
              <table border="0" cellpadding="0" cellspacing="0" width="100%">
                <tr>
                  <td align="center" style="padding-bottom: 40px;">
                    <a href="${reviewUrl}" target="_blank" style="display: inline-block; background-color: #008FD5; color: #ffffff; padding: 14px 28px; font-size: 13px; font-weight: 700; letter-spacing: 0.5px; border-radius: 10px; text-decoration: none; text-transform: uppercase; box-shadow: 0 4px 10px rgba(0, 143, 213, 0.25);">Review Request</a>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          <!-- Footer -->
          <tr>
            <td style="background-color: #F8FAFC; border-top: 1px solid #E5E7EB; padding: 20px 24px; text-align: center;">
              <p style="margin: 0; font-size: 9px; font-weight: 700; color: #9CA3AF; text-transform: uppercase; letter-spacing: 1px;">Request ID: ${displayId}</p>
              <p style="margin: 4px 0 0 0; font-size: 10px; color: #9CA3AF; line-height: 1.4;">This is an automated administrative notification dispatched securely by PRECI FORM gateway.</p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;

  const rawMessage = [
    `To: ${adminEmail}`,
    `Subject: ${subject}`,
    `MIME-Version: 1.0`,
    `Content-Type: text/html; charset="UTF-8"`,
    '',
    htmlBody
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
      const errText = await res.text();
      console.error("Gmail API Response ERROR!", {
        status: res.status,
        statusText: res.statusText,
        errorPayload: errText
      });
    } else {
      await res.json();
    }
  } catch (err) {
    console.error("Fatal exception during fetch to Gmail API:", err);
  }
}

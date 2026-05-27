import express from "express";
import path from "path";
import fs from "fs";
import { createServer as createViteServer } from "vite";
import type { FormTemplate, MeetingRequest, FormField } from "./src/types";

const app = express();
const PORT = 3000;
const DB_FILE = path.join(process.cwd(), "requests.json");
const FORMS_FILE = path.join(process.cwd(), "forms.json");
const SETTINGS_FILE = path.join(process.cwd(), "settings.json");

app.use(express.json());

// API Middleware to prevent caching
app.use("/api", (req, res, next) => {
  res.setHeader("Cache-Control", "no-store, no-cache, must-revalidate, proxy-revalidate, max-age=0");
  next();
});

// Database Helpers
const readJson = async <T>(file: string, fallback: T): Promise<T> => {
  try {
    if (!fs.existsSync(file)) {
      await fs.promises.writeFile(file, JSON.stringify(fallback, null, 2));
      return fallback;
    }
    const data = await fs.promises.readFile(file, "utf-8");
    return JSON.parse(data);
  } catch (err) {
    console.error(`Error reading ${file}:`, err);
    return fallback;
  }
};

const writeJson = async <T>(file: string, data: T): Promise<void> => {
  try {
    await fs.promises.writeFile(file, JSON.stringify(data, null, 2));
  } catch (err) {
    console.error(`Error writing ${file}:`, err);
  }
};

// Simple XSS Sanitizer
const sanitize = (val: any): any => {
  if (typeof val === 'string') {
    return val.replace(/<[^>]*>?/gm, ''); // Strip HTML tags
  }
  if (typeof val === 'object' && val !== null) {
    const fresh: any = Array.isArray(val) ? [] : {};
    for (const k in val) {
      fresh[k] = sanitize(val[k]);
    }
    return fresh;
  }
  return val;
};

// Ensure default form exists
const defaultForm: FormTemplate = {
  id: "form-default",
  title: "Executive Meeting Gateway",
  description: "Submit your consultation or executive alignment proposal. Our office screens, categorizes, and logs incoming schedules securely.",
  successMessage: "Your executive request has been safely cataloged and is queued for verification.",
  createdAt: Date.now(),
  fields: [
    { id: "fullName", label: "Full Name", type: "text", required: true, isSystem: true },
    { id: "company", label: "Company / Organization", type: "text", required: false, isSystem: true },
    { id: "category", label: "Meeting Category", type: "dropdown", required: true, isSystem: false, options: ["Business", "Legal", "Investment", "Personal", "General"] },
    { id: "phoneNumber", label: "Phone Number", type: "phone", required: true, isSystem: false },
    { id: "preferredDate", label: "Preferred Meeting Date", type: "date", required: true, isSystem: true },
    { id: "preferredTime", label: "Preferred Meeting Time", type: "time", required: true, isSystem: true },
    { id: "expectedDuration", label: "Expected Duration", type: "dropdown", required: true, isSystem: true, options: ["15 minutes", "30 minutes", "45 minutes", "1 hour", "1.5 hours", "2+ hours"] },
    { id: "source", label: "How did you get the contact?", type: "text", required: true, isSystem: false },
    { id: "purpose", label: "Purpose of Meeting", type: "textarea", required: true, isSystem: true },
    { id: "context", label: "Detailed Notes / Context", type: "textarea", required: false, isSystem: false }
  ]
};

// Settings API
app.get("/api/settings", async (req, res) => {
  const settings = await readJson(SETTINGS_FILE, { businessStartHour: 9, businessEndHour: 17 });
  res.json(settings);
});

app.post("/api/settings", async (req, res) => {
  await writeJson(SETTINGS_FILE, req.body);
  res.json(req.body);
});

// Forms API
let availabilityCache: any = null;

app.get("/api/calendar-availability", (req, res) => {
  res.json(availabilityCache || { busy: [] });
});

app.post("/api/calendar-availability", (req, res) => {
  availabilityCache = req.body;
  res.json({ success: true });
});

app.get("/api/forms", async (req, res) => {
  const forms = await readJson<FormTemplate[]>(FORMS_FILE, [defaultForm]);
  res.json(forms);
});

app.post("/api/forms", async (req, res) => {
  const newForm: FormTemplate = req.body;
  const forms = await readJson<FormTemplate[]>(FORMS_FILE, [defaultForm]);
  const newId = `form-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
  forms.push({ ...newForm, id: newId, createdAt: Date.now() });
  await writeJson(FORMS_FILE, forms);
  res.status(201).json(forms[forms.length - 1]);
});

app.put("/api/forms/:id", async (req, res) => {
  const { id } = req.params;
  const updatedForm: FormTemplate = req.body;
  const forms = await readJson<FormTemplate[]>(FORMS_FILE, [defaultForm]);
  const index = forms.findIndex(f => f.id === id);
  if (index === -1) return res.status(404).json({ error: "Form not found" });
  
  // Protect system fields from being renamed or deleted by malicious/incorrect proxy calls
  const originalFields = forms[index].fields;
  const originalSystemFields = originalFields.filter(f => f.isSystem);
  const updatedFields = [...updatedForm.fields];
  
  originalSystemFields.forEach(sysField => {
    const exists = updatedFields.some(f => f.id === sysField.id);
    if (!exists) {
      updatedFields.push(sysField);
    }
  });

  const newFields = updatedFields.map(field => {
    const original = originalFields.find(f => f.id === field.id);
    if (original && original.isSystem) {
      return { ...field, label: original.label, isSystem: true };
    }
    return field;
  });

  forms[index] = { ...updatedForm, id, fields: newFields, createdAt: forms[index].createdAt };
  await writeJson(FORMS_FILE, forms);
  res.json(forms[index]);
});

app.delete("/api/forms/:id", async (req, res) => {
  const { id } = req.params;
  let forms = await readJson<FormTemplate[]>(FORMS_FILE, [defaultForm]);
  forms = forms.filter(f => f.id !== id);
  if (forms.length === 0) forms = [defaultForm]; // ensure at least one form
  await writeJson(FORMS_FILE, forms);
  res.json({ success: true });
});

// Requests API
app.get("/api/requests", async (req, res) => {
  res.json(await readJson<MeetingRequest[]>(DB_FILE, []));
});

app.post("/api/requests/seed", async (req, res) => {
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
  await writeJson(DB_FILE, seedData);
  res.json(seedData);
});

app.post("/api/requests", async (req, res) => {
  const newRequest: MeetingRequest = sanitize(req.body);
  if (!newRequest || !newRequest.id || !newRequest.responses) {
    return res.status(400).json({ error: "Invalid meeting request payload" });
  }
  
  const current = await readJson<MeetingRequest[]>(DB_FILE, []);
  current.unshift(newRequest);
  await writeJson(DB_FILE, current);
  res.status(201).json(newRequest);
});

app.put("/api/requests/:id", async (req, res) => {
  const { id } = req.params;
  const { status } = req.body;
  
  if (!status) return res.status(400).json({ error: "Missing status" });

  const current = await readJson<MeetingRequest[]>(DB_FILE, []);
  const index = current.findIndex(r => r.id === id);
  if (index === -1) return res.status(404).json({ error: "Request not found" });

  current[index].status = status;
  await writeJson(DB_FILE, current);
  res.json(current[index]);
});

app.delete("/api/requests/:id", async (req, res) => {
  const { id } = req.params;
  const current = await readJson<MeetingRequest[]>(DB_FILE, []);
  const filtered = current.filter(r => r.id !== id);
  await writeJson(DB_FILE, filtered);
  res.json({ success: true });
});

async function main() {
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server executing successfully on http://0.0.0.0:${PORT}`);
  });
}

main().catch(err => {
  console.error("Server bootstrapping failed:", err);
});


// server.js
import { v4 as uuidv4 } from "uuid";
import "dotenv/config";
import express from "express";
import cors from "cors";
import path from "path";
import fs from "fs";
import fsPromises from "fs/promises";
import { fileURLToPath } from "url";
import { google } from "googleapis";
import OpenAI from "openai";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const filePath = path.join(__dirname, "src/data/initialEmployees.json");
const eventsFilePath = path.join(__dirname, "public", "events.json");

async function loadInitialEmployees() {
  const fileData = await fsPromises.readFile(filePath, "utf-8");
  return JSON.parse(fileData);
}

const INITIAL_EMPLOYEES = await loadInitialEmployees(); 

import { SCHEDULING_RULES } from "./src/data/schedulingRules.js";

const buildSchedulingPrompt = (employees, weekStartDate) => {
  return `
You are a smart scheduling assistant.Generate a detailed 7-day weekly schedule from ${weekStartDate} (Monday) to Sunday based on the following employees and hard scheduling rules.
**Please generate schedule for each employee and for complete week of 7 days.**
**Don't skip saturday and sunday.**
**Must generate for saturday and sunday.**

### EMPLOYEES:
${employees
  .map((emp, idx) => {
    return `
Employee ${idx + 1}:
- Name: ${emp.name}
- ID: ${emp.id}
- Email: ${emp.email}
- Total Weekly Hours: ${emp.hours}
- Shift: ${emp.shift.start} to ${emp.shift.end}
- Lunch: ${emp.lunch.start} to ${emp.lunch.end}
- Abilities: ${emp.abilities.join(", ") || "None"}
- Specialist Task: ${emp.specialistTask || "None"}
- Specialist Target Hours: ${emp.specialistTarget || 0}
- PTO: ${emp.pto?.length > 0 ? JSON.stringify(emp.pto) : "None"}
- Message: ${emp.message || "None"}
`;
  })
  .join("\n")}

### ABSOLUTE RULES TO FOLLOW (NO EXCEPTIONS):

1. *Exact Daily Coverage (08:00-17:00)*:
   - EXACTLY **3 people on Reservations**
   - EXACTLY **1 person on Dispatch**
   - **NEVER assign **more than 3 people** to Reservations during this time**

2. *Evening Coverage (17:00+)*:
   - Goal: **3 Reservations + 1 Dispatch**
   - Minimum: **2 Reservations + 1 Dispatch**

3. *Dispatch Continuity*:
   - Dispatch must be staffed continuously during ALL operational hours, including lunch
   - Never allow a time slot with no Dispatch person

4. *Lunch Rules*:
   - EVERY employee must receive a lunch break
   - Acceptable lunch windows for Greenville staff:
     • 11:00-12:30 ET
     • 12:00-13:30 ET
     • 12:30-14:00 ET
     • NO lunch breaks after 15:00 unless specified
   - Exception: Katy (Reno) can have lunch from 15:00-16:00
   - DO NOT drop below 3 Reservations + 1 Dispatch during lunch slots

5. *Scheduling Hierarchy (in priority order)*:
   1. EXACT coverage (3 Reservations + 1 Dispatch from 08:00–17:00)
   2. DISPATCH continuity (including lunch)
   3. LUNCH compliance (everyone gets one, in allowed window)
   4. EVENING coverage (17:00+ goal: 3 Reservations + 1 Dispatch, minimum: 2 + 1)
   5. EMPLOYEE hour totals must match exactly
   6. SPECIALIST hours only after all other rules satisfied

6. *Preferences & Availability*:
   - Respect employee “message” field (e.g., “not available on Tuesday after 4PM” or “prefers marketing on Tuesdays”)
   - Do your best to accommodate preferences if coverage rules are still met

### REQUIRED OUTPUT FORMAT:
Return an array of JSON events like this:
[
  {
    "employeeId": "UUID",
    "title": "Reservations",
    taskId: "UUID-Reservations",
    date: "2025-07-22",
    "start": "2025-07-22T08:00:00",
    "end": "2025-07-22T12:00:00"
  },
  {
    "employeeId": "UUID",
    "title": "Lunch",
    taskId: "UUID-Lunch",
    date: "2025-07-22",
    "start": "2025-07-22T12:00:00",
    "end": "2025-07-22T13:00:00"
  },
  ...
]

Each event must:
- Match employee hours exactly (sum total = target hours)
- Reflect lunch breaks as “Lunch”
- Include specialist time (if any) labeled as their specialist task
- Respect all role/lunch/time restrictions

Output only **valid strict JSON array** — no commentary.
  `;
};

// --- Environment and Credential Checks ---
if (!process.env.GOOGLE_APPLICATION_CREDENTIALS) {
  console.error(
    "\nFATAL ERROR: The GOOGLE_APPLICATION_CREDENTIALS environment variable is not set."
  );
  process.exit(1);
}
if (!process.env.OPENAI_API_KEY) {
  console.error(
    "\nFATAL ERROR: The OPENAI_API_KEY environment variable is not set in your .env file."
  );
  process.exit(1);
}
const serviceAccountPath = path.resolve(
  __dirname,
  process.env.GOOGLE_APPLICATION_CREDENTIALS
);
if (!fs.existsSync(serviceAccountPath)) {
  console.error(
    `\nFATAL ERROR: Service account file not found at: ${serviceAccountPath}`
  );
  process.exit(1);
}

// --- App Setup ---
const app = express();
const {
  PORT = 5001,
  GOOGLE_PTO_CALENDAR_ID,
  GOOGLE_MEETINGS_CALENDAR_ID,
} = process.env;

// --- In-Memory Data Stores ---
let currentEmployees = { ...INITIAL_EMPLOYEES };
let currentRules = { ...SCHEDULING_RULES };

// --- API Clients ---
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
let calendar;
try {
  const auth = new google.auth.GoogleAuth({
    keyFile: serviceAccountPath,
    scopes: ["https://www.googleapis.com/auth/calendar"],
  });
  calendar = google.calendar({ version: "v3", auth });
} catch (error) {
  console.error(
    "\nFATAL ERROR: Could not authenticate with Google Calendar API.",
    error
  );
  process.exit(1);
}

// --- Middleware ---
app.use(cors());
app.use(express.json());

async function initializeFile() {
  try {
    await fsPromises.access(filePath);
  } catch {
    await fsPromises.writeFile(filePath, JSON.stringify([], null, 2));
  }
}

app.post("/api/generate-schedule", async (req, res) => {
  const { weekStart, employees, rules } = req.body;

  console.log("Generating schedule with weekStart:", weekStart);

  try {
    const prompt = buildSchedulingPrompt(employees, weekStart);
    const response = await openai.chat.completions.create({
      model: "gpt-4", 
      messages: [
        {
          role: "system",
          content: "You are a scheduling assistant AI.",
        },
        {
          role: "user",
          content: prompt,
        },
      ],
      temperature: 0.3,
    });
    const reply = response.choices[0].message.content;
    let parsedSchedule;
    try {
      parsedSchedule = JSON.parse(reply);
      console.log("parsed", parsedSchedule);
    } catch (jsonError) {
      console.error("Invalid JSON returned from OpenAI:", reply);
      return res
        .status(500)
        .json({ message: "Invalid schedule format received from AI." });
    }
    const eventContent = await fsPromises.readFile(eventsFilePath, "utf8");
    const events = JSON.parse(eventContent);
    for (const obj of parsedSchedule) {
      events.push(obj);
    }

    const updatedContent = JSON.stringify(events, null, 2);
    await fsPromises.writeFile(eventsFilePath, updatedContent);
    console.log(`✅ Schedule  added successfully to file`);
    res.json({ events: parsedSchedule });
  } catch (err) {
    console.error("Schedule Generation Error:", err);
    res.status(500).json({ message: "Failed to generate schedule" });
  }
});
app.delete("/api/delete-task", (req, res) => {
  const { employeId, taskId } = req.body;
  if (!employeId || !taskId) {
    return res
      .status(400)
      .json({ error: "employeeId and taskId are required" });
  }
  let eventsData = [];
  try {
    const fileContent = fs.readFileSync(eventsFilePath, "utf-8");
    eventsData = JSON.parse(fileContent);
  } catch (err) {
    return res.status(500).json({ error: "Failed to read event file" });
  }

  const initialLength = eventsData.length;
  const updatedData = eventsData.filter(
    (item) => !(item.employeeId === employeId && item.taskId === taskId)
  );

  if (updatedData.length === initialLength) {
    return res.status(404).json({ message: "No matching task found" });
  }

  try {
    fs.writeFileSync(eventsFilePath, JSON.stringify(updatedData, null, 2));
  } catch (err) {
    return res.status(500).json({ error: "Failed to write updated data" });
  }

  res.json({
    message: "Task deleted successfully",
    remainingTasks: updatedData,
  });
});

app.put("/api/update-task", async (req, res) => {
  const { employeeId, taskId, title, start, end } = req.body;
  console.log("data", employeeId, taskId, title, start, end);
  if (!employeeId || !taskId) {
    return res.status(400).json({ message: "empId and taskId are required" });
  }

  try {
    const rawData = await fsPromises.readFile(eventsFilePath);
    const events = JSON.parse(rawData);
    console.log("Events", events);
    let updated = false;

    const updatedEvents = events.map((event) => {
      if (event.taskId === taskId && event.employeeId === employeeId) {
        updated = true;
        return {
          ...event,
          title: title || event.title,
          start: start || event.start,
          end: end || event.end,
        };
      }
      return event;
    });

    if (!updated) {
      return res.status(404).json({ message: "Event not found" });
    }

    await fsPromises.writeFile(
      eventsFilePath,
      JSON.stringify(updatedEvents, null, 2)
    );
    res.status(200).json({ message: "Event updated successfully" });
  } catch (err) {
    console.error("Error updating event:", err);
    res.status(500).json({ message: "Server error" });
  }
});

app.post("/api/chat", async (req, res) => {
  const { prompt } = req.body;
  if (!prompt) {
    return res.status(400).json({ error: "A prompt is required." });
  }
  try {
    const completion = await openai.chat.completions.create({
      model: "gpt-3.5-turbo",
      messages: [{ role: "user", content: prompt }],
    });

    const responseText = completion.choices[0].message.content;
    res.json({ response: responseText });
  } catch (error) {
    console.error("Error calling OpenAI API:", error);
    res.status(500).json({ error: "Failed to get response from AI." });
  }
});

app.get("/api/events", async (req, res) => {
  const { start, end } = req.query;
  if (!start || !end)
    return res
      .status(400)
      .json({ error: "Start and end query parameters are required." });
  try {
    const [ptoEvents, meetingEvents] = await Promise.all([
      fetchCalendarEvents(GOOGLE_PTO_CALENDAR_ID, start, end),
      fetchCalendarEvents(GOOGLE_MEETINGS_CALENDAR_ID, start, end),
    ]);
    res.json([
      ...ptoEvents.map((e) => ({ ...e, type: "PTO" })),
      ...meetingEvents.map((e) => ({ ...e, type: "Meeting" })),
    ]);
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch calendar events" });
  }
});

app.get("/api/employees", async (req, res) => {
  try {
    const fileData = await fsPromises.readFile(filePath, "utf-8");
    const data = JSON.parse(fileData);
    res.status(200).json(data);
  } catch (err) {
    console.error("Error reading employees file:", err);
    res.status(500).json({ message: "Failed to load employee data." });
  }
});

app.post("/api/employees", async (req, res) => {
  try {
    const {
      name,
      email,
      shift,
      lunch,
      hours,
      abilities,
      specialistTask,
      schedulingNotes,
      pto,
      specialistTarget,
    } = req.body;

    const id = uuidv4();

    const newUser = {
      id,
      name,
      email,
      shift,
      lunch,
      hours,
      abilities,
      specialistTask,
      schedulingNotes,
      pto,
      specialistTarget,
    };

    try {
      await initializeFile();

      const fileContent = await fsPromises.readFile(filePath, "utf8");
      let currentEmployees = JSON.parse(fileContent);
      currentEmployees.push(newUser);
      const updatedContent = JSON.stringify(currentEmployees, null, 2);
      await fsPromises.writeFile(filePath, updatedContent);
      console.log(`✅ User ${name || "Unnamed"} added successfully to file`);

      return res.status(201).json({
        message: "User added successfully",
        user: newUser,
      });
    } catch (fileError) {
      console.error("❌ Error writing to file:", fileError);
      console.error("❌ File error details:", {
        code: fileError.code,
        message: fileError.message,
        path: fileError.path,
      });

      return res.status(500).json({
        message: "Failed to save user to file",
        error: fileError.message,
      });
    }
  } catch (error) {
    console.error("❌ Error adding user:", error);
    return res.status(500).json({
      message: "Internal server error",
      error: error.message,
    });
  }
});

app.patch("/api/employees", async (req, res) => {
  try {
    const {
      id,
      name,
      email,
      shift,
      lunch,
      hours,
      abilities,
      specialistTask,
      schedulingNotes,
      pto,
      specialistTarget,
    } = req.body;

    const newUser = {
      id,
      name,
      email,
      shift,
      lunch,
      hours,
      abilities,
      specialistTask,
      schedulingNotes,
      pto,
      specialistTarget,
    };

    try {
      await initializeFile();

      const fileContent = await fsPromises.readFile(filePath, "utf8");
      let currentEmployees = JSON.parse(fileContent);

      // Find the index of the employee with the matching id
      const employeeIndex = currentEmployees.findIndex((emp) => emp.id === id);

      if (employeeIndex === -1) {
        return res.status(404).json({ message: "Employee not found." });
      }

      // Update the existing employee data at the found index
      currentEmployees[employeeIndex] = newUser;

      // Write updated data back to the file
      const updatedContent = JSON.stringify(currentEmployees, null, 2);
      await fsPromises.writeFile(filePath, updatedContent);

      console.log(`✅ User ${name || "Unnamed"} updated successfully in file`);

      return res.status(200).json({
        message: "User updated successfully",
        user: newUser,
      });
    } catch (fileError) {
      console.error("❌ Error writing to file:", fileError);
      console.error("❌ File error details:", {
        code: fileError.code,
        message: fileError.message,
        path: fileError.path,
      });
      return res.status(500).json({ message: "Failed to write to file." });
    }
  } catch (error) {
    console.error("Error updating employees:", error);
    res.status(500).json({ message: "Internal server error." });
  }
});

app.delete("/api/employees/:id", async (req, res) => {
  try {
    const employeeId = req.params.id;
    const fileData = await fsPromises.readFile(filePath, "utf-8");
    const data = JSON.parse(fileData);
    const updatedEmployees = data.filter((emp) => emp.id !== employeeId);

    await fsPromises.writeFile(
      filePath,
      JSON.stringify(updatedEmployees, null, 2)
    );
    res.status(200).json({ message: "Employee deleted successfully." });
  } catch (err) {
    console.error("Error deleting employee:", err);
    res.status(500).json({ message: "Internal server error." });
  }
});

app.get("/api/rules", (req, res) => res.status(200).json(currentRules));
app.post("/api/rules", (req, res) => {
  currentRules = req.body;
  res.status(200).json({ message: "Rules updated successfully." });
});

app.delete("/api/task", async (req, res) => {
  const Eventid = req.params.id;
  const fileData = await fsPromises.readFile(filePath, "utf-8");
  const data = JSON.parse(fileData);
});

async function fetchCalendarEvents(calendarId, timeMin, timeMax) {
  if (!calendarId) return [];
  try {
    const { data } = await calendar.events.list({
      calendarId,
      timeMin,
      timeMax,
      singleEvents: true,
      orderBy: "startTime",
      fields: "items(id,summary,start,end,attendees)",
    });
    return data.items
      ? data.items.map((event) => ({
          id: event.id,
          title: event.summary,
          start: event.start?.dateTime || event.start?.date,
          end: event.end?.dateTime || event.end?.date,
          allDay: !!event.start?.date && !event.start?.dateTime,
          attendees: event.attendees ? event.attendees.map((a) => a.email) : [],
        }))
      : [];
  } catch (error) {
    console.error(`Error fetching from calendar ${calendarId}:`, error.message);
    return [];
  }
}

// --- Serve Static React App ---
app.use(express.static(path.join(__dirname, "build")));
app.get("*", (req, res) =>
  res.sendFile(path.join(__dirname, "build", "index.html"))
);

app.listen(PORT, () => {
  console.log(`\nServer is running and listening on http://localhost:${PORT}`);
});

// server.js
import { v4 as uuidv4 } from "uuid";
import "dotenv/config";
import express from "express";
import cors from "cors";
import path from "path";
// import fs from "fs/promises"; 
import fs from 'fs'; // for fs.existsSync
import fsPromises from 'fs/promises'; 
import { fileURLToPath } from "url";
import { google } from "googleapis";
import OpenAI from "openai"; // <-- Import OpenAI library

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Fix: Use consistent file path
const filePath = path.join(__dirname, "src/data/initialEmployees.json");

// const INITIAL_EMPLOYEES = JSON.parse(fs.readFile(filePath, "utf-8"));
async function loadInitialEmployees() {
  const fileData = await fsPromises.readFile(filePath, "utf-8");
  return JSON.parse(fileData);
}

const INITIAL_EMPLOYEES = await loadInitialEmployees(); // or use it inside a route/controller


import { SCHEDULING_RULES } from "./src/data/schedulingRules.js";

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
// --- API Endpoints ---

// --- NEW: Chat Endpoint ---
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

// Fixed: /api/user endpoint
// Add this debug version of your endpoint
// app.post("/api/user", async (req, res) => {
//   try {
//     const {
//       name,
//       email,
//       shift,
//       lunch,
//       hours,
//       abilities,
//       specialistTask,
//       pto,
//       specialistTarget,
//     } = req.body;

//     // Generate a unique ID for the new user
//     const id = uuidv4();
//     console.log("UUID generated:", id);

//     const newUser = {
//       id,
//       name,
//       email,
//       shift,
//       lunch,
//       hours,
//       abilities,
//       specialistTask,
//       pto,
//       specialistTarget,
//     };
//     console.log("New user data:", newUser); // Log the new user data for debugging

//     try {
//       // Read existing employees from file
//       await initializeFile();
//       const fileContent = await fs.readFile(filePath, "utf8");
//       const currentEmployees = JSON.parse(fileContent || "[]");

//       // Add new user to array
//       currentEmployees.push(newUser);

//       // Write updated data back to file
//       const updatedContent = JSON.stringify(currentEmployees, null, 2);
//       await fs.writeFile(filePath, updatedContent);

//       console.log(`✅ User ${name} added successfully to file`);

//       return res.status(201).json({
//         message: "User added successfully",
//         user: newUser,
//       });
//     } catch (fileError) {
//       console.error("❌ Error writing to file:", fileError);
//       console.error("❌ File error details:", {
//         code: fileError.code,
//         message: fileError.message,
//         path: fileError.path,
//       });

//       return res.status(500).json({
//         message: "Failed to save user to file",
//         error: fileError.message,
//       });
//     }
//   } catch (error) {
//     console.error("❌ Error adding user:", error);
//     return res.status(500).json({
//       message: "Internal server error",
//       error: error.message,
//     });
//   }
// });

app.post("/api/user", async (req, res) => {
  try {
    const {
      name,
      email,
      shift,
      lunch,
      hours,
      abilities,
      specialistTask,
      pto,
      specialistTarget,
    } = req.body;

    console.log("Received user data:", req.body)

    // Generate a unique ID for the new user
    const id = uuidv4();
    // console.log("UUID generated:", id);

    const newUser = {
      id,
      name,
      email,
      shift,
      lunch,
      hours,
      abilities,
      specialistTask,
      pto,
      specialistTarget,
    };
    // console.log("New user data:", newUser); // Log the new user data for debugging

    try {
      // Read existing employees from file
      await initializeFile();
  
      const fileContent = await fsPromises.readFile(filePath, "utf8");
      let currentEmployees = JSON.parse(fileContent);

      currentEmployees.push(newUser);

      // Write updated data back to file
      const updatedContent = JSON.stringify(currentEmployees, null, 2);
      console.log("Writing updated content to file:", updatedContent);
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

app.get("/api/employees", (req, res) => res.status(200).json(currentEmployees));
// app.post("/api/employees", async (req, res) => {
//   currentEmployees = req.body;

//   // Also update the file when employees are updated via this endpoint
//   try {
//     console.log("Here is the currentEmployees before writing to file:");
//     await fs.writeFile(filePath, JSON.stringify(currentEmployees, null, 2));
//     console.log("Employees updated in file and memory");
//   } catch (error) {
//     console.error("Error writing employees to file:", error);
//   }

//   res.status(200).json({ message: "Employees updated successfully." });
// });

app.get("/api/rules", (req, res) => res.status(200).json(currentRules));
app.post("/api/rules", (req, res) => {
  currentRules = req.body;
  res.status(200).json({ message: "Rules updated successfully." });
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

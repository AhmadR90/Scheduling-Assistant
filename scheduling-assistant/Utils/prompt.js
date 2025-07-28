export const buildSchedulingPrompt = (employees, weekStartDate) => {
  return `
“You are a scheduling assistant.Generate a detailed 7-day weekly schedule from ${weekStartDate} (Monday) to Sunday based on the following employees and hard scheduling rules.

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

2. *Evening Coverage (17:00–21:00 ET)*:
   - Minimum: **2 Reservations + 1 Dispatch**
   - Goal: **3 Reservations + 1 Dispatch**
   - If insufficient staff is available for the goal, ensure the minimum is still met.


3. *Dispatch Continuity*:
   - Dispatch must be staffed continuously during ALL operational hours, including lunch
   - Never allow a time slot with no Dispatch person

4. *Lunch Rules*:
   - Every employee must receive a lunch break.
   - Greenville office employees must have a **1.5-hour** lunch.
     • Preferred lunch windows are:
       - 11:00–12:30 ET
       - 12:00–13:30 ET
       - 12:30–14:00 ET
   - Reno office employees (e.g., Katy) take a **1-hour** lunch from 15:00–16:00 ET.
   - Lunches **should ideally** occur within preferred windows, but may be moved to other times **only if necessary to maintain coverage requirements**.
   - Never allow coverage to drop below **3 Reservations + 1 Dispatch during 08:00–17:00**, including during lunch breaks.
   - You must distinguish between **Greenville** and **Reno** employees.
   - Greenville employees follow **Greenville lunch rules (1.5h preferred slots)**
   - Reno employees follow **Reno lunch rules (1h from 15:00–16:00)**
   - Do not assign Greenville employees to the Reno lunch window unless coverage cannot be met otherwise.



5. *Scheduling Hierarchy (in priority order)*:
- Use each employee's primary role to fill core coverage first.
   - For example, if 3 Reservation spots are needed, use employees with “Reservations” as their **primary job** first.
   - Then fill using **secondary**, then **tertiary**, only as needed.
   - If an employee is not needed for Reservations or Dispatch, assign them their next highest available priority task.

   1. EXACT coverage (3 Reservations + 1 Dispatch from 08:00–17:00)
   2. DISPATCH continuity (including lunch)
   3. LUNCH compliance (everyone gets one, in allowed window)
   4. EVENING coverage (17:00+ goal: 3 Reservations + 1 Dispatch, minimum: 2 + 1)
   5. EMPLOYEE hour totals must match exactly
6. SPECIALIST task hours should only be scheduled after:
   - All coverage requirements are fulfilled
   - Employee’s primary and secondary roles are not needed during that time
   - Ensure their total weekly hours still match exactly


6. *Preferences & Availability*:
   - Respect employee “message” field (e.g., “not available on Tuesday after 4PM” or “prefers marketing on Tuesdays”)
   - Do your best to accommodate preferences if coverage rules are still met
7. *Weekly Coverage*:
   - The schedule must include every day from **Monday to Sunday**
   - **Saturday and Sunday must not be skipped**, even if coverage is reduced
8. *Other Role Assignment (Sales, Marketing, etc.):*
   - When Reservation and Dispatch coverage is satisfied, assign employees to other tasks based on their listed **abilities**.
   - Prioritize tasks in order: Primary → Secondary → Tertiary based on the employee's abilities array.
   - Do not assign a task to an employee who does not list it in their abilities.

### REQUIRED OUTPUT FORMAT:
Return an array of JSON events like this:
[
  {
    "employeeId": "UUID",
    "title": "Reservations",
     taskId: "3 digits unique number-Lunch-date",
    date: "2025-07-22",
    "start": "2025-07-22T08:00:00",
    "end": "2025-07-22T12:00:00"
  },
  {
    "employeeId": "UUID",
    "title": "Lunch",
   taskId: "3 digits unique number-Lunch-date",
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

Return only a raw, valid JSON array. **please Do not include triple backticks, markdown, or any explanation**.

  `;
};

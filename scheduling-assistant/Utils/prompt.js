export const buildSchedulingPrompt = (employees, weekStartDate, events) => {
  return `
 You are a scheduling assistant. Generate a detailed 7-day work schedule (Monday through Sunday), starting from ${weekStartDate}, using the following employee data and strict scheduling rules.

---

### INPUT DATA

#### Employees:
${employees
  .map((emp, idx) => {
    return `
Employee ${idx + 1}:
- Name: ${emp.name}
- ID: ${emp.id}
- Email: ${emp.email}
- Weekly Hours: ${emp.hours}
- Shift: ${emp.shift.start} to ${emp.shift.end}
- Lunch: ${emp.lunch.start} to ${emp.lunch.end}
- Abilities: ${emp.abilities.join(", ") || "None"}
- Specialist Task: ${emp.specialistTask || "None"}
- Specialist Target Hours: ${emp.specialistTarget || 0}
- PTO: ${emp.pto?.length > 0 ? JSON.stringify(emp.pto) : "None"}
- Notes: ${emp.message || "None"}
`;
  })
  .join("\n")}

#### Existing Events:
${JSON.stringify(events)}

---

### SCHEDULING RULES (STRICT – NO EXCEPTIONS)

#### 1. Coverage Requirements
- **08:00–17:00 ET (Daily):**
  - Exactly **3 on Reservations**
  - Exactly **1 on Dispatch**
  - Never exceed 3 on Reservations at any time during this window.

- **17:00–21:00 ET (Evenings):**
  - Minimum: 2 Reservations + 1 Dispatch
  - Goal: 3 Reservations + 1 Dispatch

#### 2. Dispatch Continuity
- Dispatch must be covered **without interruption**, including lunch breaks.

#### 3. Lunch Breaks
- Everyone must receive a lunch.
- **Greenville**: 1.5h lunch, preferred slots:
  - 11:00–12:30, 12:00–13:30, 12:30–14:00
- **Reno** (e.g., Katy): 1h lunch, fixed: 15:00–16:00
- Always maintain full daytime coverage (3 Reservations + 1 Dispatch) **even during lunch**.
- Greenville employees should not be scheduled during Reno lunch unless no other option.

#### 4. Scheduling Hierarchy (in order of priority):
1. Exact 08:00–17:00 coverage
2. Dispatch continuity
3. Lunch rule compliance
4. Evening minimum/goal coverage
5. Match employee's weekly hour totals exactly
6. Add specialist task hours only **after** all above are satisfied

#### 5. Assignment Logic
- Prioritize employees' primary job roles first.
- After Reservations/Dispatch coverage, assign:
  - Specialist task (if applicable)
  - Then other roles from their Abilities list in priority order

#### 6. Preferences & Availability
- Respect the "Notes" field (e.g., availability constraints or task preferences)

#### 7. Weekend Coverage
- Include Saturday and Sunday
- Weekend coverage may be reduced, but must be included

---

### OUTPUT FORMAT

Return only a raw, valid JSON array. **please Do not include triple backticks, markdown, or any explanation**. Each event must include:
[
  {
    "employeeId": "UUID",
    "title": "Reservations",  // or "Dispatch", "Lunch", specialist task, etc.
    "taskId": "123-Lunch-2025-07-22",
    "date": "2025-07-22",
    "start": "2025-07-22T08:00:00",
    "end": "2025-07-22T12:00:00"
  },
  
]`;
};

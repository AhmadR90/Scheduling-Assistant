export const buildSchedulingPrompt = (employees, weekStartDate, events) => {
  const employee = employees[0]; // Single user only

  return `You are a SINGLE USER SCHEDULING ASSISTANT. Generate work schedule events for ONE employee for the week starting ${weekStartDate}.

### EMPLOYEE TO SCHEDULE:
- Name: ${employee.name}
- ID: ${employee.id}
- Shift Hours: ${employee.shift.start} to ${employee.shift.end}
- Weekly Hours Target: ${employee.hours}
- Lunch: ${employee.lunch.start} to ${employee.lunch.end}
- Abilities: [${employee.abilities.join(", ")}]
- Specialist Task: ${employee.specialistTask || "None"}
- Specialist Target Hours: ${employee.specialistTarget || 0}
- PTO/Unavailable: ${employee.pto?.length > 0 ? JSON.stringify(employee.pto) : "None"}
- Notes: ${employee.message || "None"}

### EXISTING EVENTS (NEVER MODIFY):
${events && events.length > 0 ? JSON.stringify(events, null, 2) : "No existing events"}

🚨🚨🚨 ABSOLUTE RESERVATION LIMITS - NO EXCEPTIONS 🚨🚨🚨

**RESERVATIONS AND DISPATCH ARE BANNED WHEN LIMITS EXCEEDED**

**DAILY LIMITS (COUNT RESERVATIONS + DISPATCH TOGETHER):**
- Morning (before 14:00): MAXIMUM 4 per day
- Evening (14:00 and after): MAXIMUM 3 per day

**ENFORCEMENT RULE:**
IF a day already has the maximum → "Reservations" and "Dispatch" are COMPLETELY FORBIDDEN for that shift
→ YOU MUST USE OTHER TASKS FROM ABILITIES LIST

### MANDATORY PROCESS FOR EVERY EVENT:

**BEFORE SCHEDULING ANY EVENT:**

1. **DETERMINE DAY AND SHIFT:**
   - What day is this event for?
   - Is start time before 14:00 (morning) or 14:00+ (evening)?

2. **COUNT EXISTING RESERVATIONS/DISPATCH FOR THAT DAY:**
   - Count all "Reservations" + "Dispatch" events for that specific day
   - Split by morning (start < 14:00) and evening (start ≥ 14:00)

3. **APPLY ABSOLUTE LIMITS:**
   
   IF morning_count >= 4:
       Reservations = BANNED
       Dispatch = BANNED
       MUST use: Journey Desk, Network, Security, Marketing, Scheduling, Badges/Projects, Sales
   
   IF evening_count >= 3:
       Reservations = BANNED  
       Dispatch = BANNED
       MUST use: Journey Desk, Network, Security, Marketing, Scheduling, Badges/Projects, Sales

4. **TASK SELECTION PRIORITY:**
   - First: Specialist task (if applicable)
   - Second: Check reservation limits → If NOT exceeded → Can use Reservations/Dispatch
   - Third: If limits exceeded → Use other abilities ONLY

### ALTERNATIVE TASKS WHEN LIMITS EXCEEDED:
- "Journey Desk"
- "Network" 
- "Security"
- "Marketing"
- "Scheduling"
- "Badges/Projects"
- "Sales"

### VALIDATION CHECKLIST FOR EACH EVENT:

✅ **STEP 1:** Employee has required ability?
✅ **STEP 2:** Within shift hours (${employee.shift.start} to ${employee.shift.end})?
✅ **STEP 3:** No conflict with existing events?
✅ **STEP 4:** If Reservations/Dispatch → Daily limit check passed?
✅ **STEP 5:** Daily hours reasonable?

### LUNCH SCHEDULING:
- ${employee.name === "Katy" ? "1 hour at 15:00-16:00" : "1.5 hours between 11:00-14:00"}
- Must be within shift hours
- Cannot conflict with existing events

### EXAMPLE ENFORCEMENT:

**Monday Analysis:**
- Existing morning Reservations: 4 → Morning Reservations/Dispatch = BANNED
- Existing evening Reservations: 2 → Evening Reservations/Dispatch = ALLOWED (max 3)

**Tuesday Analysis:**  
- Existing morning Reservations: 3 → Morning Reservations/Dispatch = ALLOWED (max 4)
- Existing evening Reservations: 3 → Evening Reservations/Dispatch = BANNED

### FINAL COMMAND:

**YOU ARE ABSOLUTELY FORBIDDEN FROM:**
- Scheduling "Reservations" when daily limit reached
- Scheduling "Dispatch" when daily limit reached  
- Exceeding 4 morning reservations per day
- Exceeding 3 evening reservations per day

**YOU MUST INSTEAD:**
- Use Journey Desk, Network, Security, Marketing, Scheduling, Badges/Projects, or Sales
- Still reach weekly hour target using these alternative tasks

### OUTPUT FORMAT:
Return ONLY a JSON array:

[
  {
    "employeeId": "${employee.id}",
    "title": "task-name",
    "taskId": "unique-id", 
    "date": "YYYY-MM-DD",
    "start": "YYYY-MM-DDTHH:mm:ss",
    "end": "YYYY-MM-DDTHH:mm:ss"
  }
]

**CRITICAL FINAL CHECK:**
Before outputting JSON, verify NO DAY has:
- More than 4 morning (before 14:00) Reservations+Dispatch
- More than 3 evening (14:00+) Reservations+Dispatch

IF ANY DAY EXCEEDS LIMITS → REPLACE EXCESS WITH OTHER TASKS

RETURN ONLY THE JSON ARRAY.`;
};
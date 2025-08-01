export const buildSchedulingPrompt = (employees, weekStartDate, events) => {
  return `You are a PRECISION SCHEDULING ASSISTANT. Generate a COMPLETE 5-day work schedule (Monday through Friday) starting from ${weekStartDate}.

🚨 CRITICAL SUCCESS CRITERIA - FAILURE IS UNACCEPTABLE:

### MANDATORY COVERAGE REQUIREMENTS (EXACT - NOT APPROXIMATE):
- **08:00-17:00 ET**: EXACTLY 3 Reservations + EXACTLY 1 Dispatch EVERY DAY
- **17:00+ ET**: MINIMUM 2 Reservations + 1 Dispatch (GOAL: 3 Reservations + 1 Dispatch)
- **DISPATCH CONTINUITY**: NEVER allow zero Dispatch coverage during operational hours - including ALL lunch periods
- **NO OVER-ALLOCATION**: Never exceed 3 Reservations during 08:00-17:00 (wasteful over-staffing)

### EMPLOYEE DATA:
${employees.map((emp, idx) => {
  return `Employee ${idx + 1}:
- Name: ${emp.name}
- ID: ${emp.id}
- Working Hours: ${emp.shift.start} to ${emp.shift.end}
- Weekly Hours Target: ${emp.hours}
- Lunch Window: ${emp.lunch.start} to ${emp.lunch.end}
- Abilities: ${emp.abilities.join(", ") || "Reservations, Dispatch"}
- Specialist Task: ${emp.specialistTask || "None"}
- Specialist Target Hours: ${emp.specialistTarget || 0}
- PTO/Unavailable: ${emp.pto?.length > 0 ? JSON.stringify(emp.pto) : "None"}
- Special Notes: ${emp.message || "None"}`;
}).join("\n\n")}

### EXISTING EVENTS TO PRESERVE:
${JSON.stringify(events)}

### ABSOLUTE SCHEDULING RULES:

#### 1. ROLE ASSIGNMENTS (NON-NEGOTIABLE):
- **Antje**: ONLY Journey Desk - NEVER Reservations or Dispatch
- **All Others**: Can work Reservations, Dispatch, OR specialist functions
- **Specialist Time Calculation**: Target specialist hours = (Total weekly hours) - (Hours on Reservations/Dispatch)

#### 2. LUNCH SCHEDULING (MANDATORY):
- **EVERYONE gets lunch** - No exceptions
- **Greenville Standard Lunches** (1.5 hours):
  - 11:00-12:30 ET
  - 12:00-13:30 ET  
  - 12:30-14:00 ET
- **Katy (Reno)**: 15:00-16:00 ET (1 hour) - ONLY exception
- **Coverage During Lunch**: Maintain EXACTLY 3 Reservations + 1 Dispatch even when people are at lunch
- **NO lunches outside these windows** for Greenville staff

#### 3. SCHEDULING PRIORITY HIERARCHY:
1. **EXACT COVERAGE FIRST**: 3 Reservations + 1 Dispatch (08:00-17:00)
2. **DISPATCH CONTINUITY**: Uninterrupted Dispatch coverage
3. **LUNCH COMPLIANCE**: Everyone gets lunch in proper windows
4. **EVENING COVERAGE**: 2+ Reservations + 1 Dispatch (17:00+)
5. **HOUR COMPLIANCE**: Each employee hits exact weekly hour targets
6. **SPECIALIST TIME**: Only after all coverage secured

### SPECIALIST TIME TARGETS (MUST ACHIEVE):
- Antje: 30 hours Journey Desk
- Adam: 2 hours Network
- Heather: 15 hours Network
- Sheridan: 5 hours Network
- Katy: 2 hours Badges/Projects
- SydPo: 5 hours Scheduling
- Elliott: 2 hours Marketing
- Brian Adie: 15 hours Journey Desk
- Paul: 25 hours Security
- Shelby: 8 hours Journey Desk
- SydMo: 5 hours Sales

### CRITICAL VALIDATION REQUIREMENTS:

Before finalizing the schedule, YOU MUST verify:
1. **Slot-by-Slot Coverage**: Count Reservations and Dispatch for EVERY 30-minute increment
2. **Lunch Period Coverage**: Confirm coverage never drops during any lunch break
3. **Employee Compliance**: Verify each employee has proper lunch timing and role assignments
4. **Hour Totals**: Confirm each employee reaches exact weekly hour targets
5. **Specialist Targets**: Verify all specialist time targets are met

### OUTPUT FORMAT REQUIREMENTS:

Return ONLY a valid JSON array with NO markdown, explanations, or backticks. Each event must include:

- **employeeId**: UUID from employee data
- **title**: Task name ("Reservations", "Dispatch", "Lunch", "Journey Desk", "Network", etc.)
- **taskId**: Unique identifier (format: "employeeId-title-date")
- **date**: YYYY-MM-DD format
- **start**: Full ISO datetime (YYYY-MM-DDTHH:mm:ss)
- **end**: Full ISO datetime (YYYY-MM-DDTHH:mm:ss)

### TASK TYPES TO USE:
- "Reservations"
- "Dispatch" 
- "Lunch"
- "Journey Desk"
- "Network"
- "Security"
- "Marketing"
- "Scheduling"
- "Badges/Projects"
- "Sales"

### MANDATORY QUALITY CHECKS:

If ANY of these fail, RESTART the scheduling process:
- ❌ Any 30-minute slot with ≠3 Reservations (08:00-17:00)
- ❌ Any 30-minute slot with ≠1 Dispatch (operational hours)
- ❌ Any lunch period creating coverage gaps
- ❌ Evening slots with <2 Reservations or <1 Dispatch
- ❌ Any employee missing lunch or lunch outside windows
- ❌ Antje working anything other than Journey Desk
- ❌ Any employee not hitting exact weekly hour targets
- ❌ Any specialist time target not achieved

### SCHEDULING STRATEGY:

1. **Start with Core Coverage**: Place 3 Reservations + 1 Dispatch for every 08:00-17:00 slot
2. **Stagger Lunches**: Ensure Dispatch continuity by carefully timing lunch breaks
3. **Fill Evening Hours**: Add evening coverage after daytime is secured
4. **Add Specialist Time**: Only after all coverage requirements are met
5. **Balance Hours**: Adjust to ensure everyone hits exact weekly targets

Generate a schedule that maintains BULLETPROOF coverage while maximizing specialist time within the constraints of exact coverage requirements and proper lunch scheduling.

RETURN ONLY THE JSON ARRAY - NO OTHER TEXT.`;
};

// Example usage function to help with implementation
export const validateScheduleOutput = (scheduleEvents, employees) => {
  const validation = {
    coverageIssues: [],
    lunchIssues: [],
    hourIssues: [],
    specialistIssues: []
  };
  
  // Add validation logic here
  // This would check the generated schedule against all requirements
  
  return validation;
};

// Helper function to format employee data consistently
export const formatEmployeeData = (rawEmployees) => {
  return rawEmployees.map(emp => ({
    ...emp,
    abilities: emp.abilities || ['Reservations', 'Dispatch'],
    specialistTask: emp.specialistTask || null,
    specialistTarget: emp.specialistTarget || 0,
    pto: emp.pto || [],
    message: emp.message || ''
  }));
};
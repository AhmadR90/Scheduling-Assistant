// src/SchedulerApp.js
import React, { useState, useEffect, useMemo } from "react";
import FullCalendar from "@fullcalendar/react";
import resourceTimelinePlugin from "@fullcalendar/resource-timeline";
import interactionPlugin from "@fullcalendar/interaction";
import "./App.css";

const timeToMinutes = (time) => {
  if (!time) return 0;
  const [hours, minutes] = time.split(":").map(Number);
  return hours * 60 + minutes;
};

const minutesToTime = (minutes) => {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
};

export default function SchedulerApp({
  employees,
  rules,
  weekStart,
  events,
  onEventsGenerated,
  onEventClick,
}) {
  const [isLoading, setIsLoading] = useState(true);

  const emailToEmployeeMap = useMemo(() => {
    const map = new Map();
    for (const name in employees) {
      if (employees[name].email) map.set(employees[name].email, name);
    }
    return map;
  }, [employees]);
  const resources = useMemo(() => {
    return Object.keys(employees).map((name) => {
      const emp = employees[name];

      return {
        id: emp.id,
        title: emp.name,
      };
    });
  }, [employees]);

  useEffect(() => {
    const fetchGeneratedSchedule = async () => {
      if (!rules?.coverage || Object.keys(employees).length === 0) {
        setIsLoading(false);
        return;
      }

      setIsLoading(true);

      try {
        const startDate = new Date(weekStart);
        const endDate = new Date(startDate);
        endDate.setDate(startDate.getDate() + 7);

        const extEventRes = await fetch(
          `/api/events?start=${startDate.toISOString()}&end=${endDate.toISOString()}`
        );
        const externalEventsRaw = await extEventRes.json();
        const internalFormatGoogleEvents = convertGoogleEventsToInternalFormat(
          externalEventsRaw,
          employees
        );

        console.log("Converted Google Events:", internalFormatGoogleEvents);
        await fetch("/api/save-google-events", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(internalFormatGoogleEvents),
        });

        const response = await fetch("/events.json");
        const result = await response.json();

        const fullCalendarEvents = [];

        for (const emp of result) {
          const empName = Object.values(employees).find(
            (e) => e.id === emp.employeeId
          )?.name;

          if (!empName) continue;

          fullCalendarEvents.push({
            id: `${emp.taskId}-${emp.start}`,
            resourceId: emp.employeeId,
            title: emp.title,
            start: emp.start,
            end: emp.end,
            backgroundColor: getTaskColor(emp.title),
            borderColor: getTaskColor(emp.title),
            extendedProps: {
              email: emp.email || "",
              userName: empName,
              taskId: emp.taskId || null,
              shift: emp.shift || null,
            },
          });
        }
        onEventsGenerated(fullCalendarEvents);
      } catch (error) {
        console.error("Error fetching AI-generated schedule:", error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchGeneratedSchedule();
  }, [weekStart, employees, rules, onEventsGenerated, emailToEmployeeMap]);

  //   useEffect(() => {
  //   const fetchGeneratedSchedule = async () => {
  //     if (!rules?.coverage || Object.keys(employees).length === 0) return;

  //     setIsLoading(true);

  //     try {
  //       const startDate = new Date(weekStart);
  //       const endDate = new Date(startDate);
  //       endDate.setDate(startDate.getDate() + 7);

  //
  //       const scheduleRes = await fetch("/api/generate-schedule-multiple", {
  //         method: "POST",
  //         headers: {
  //           "Content-Type": "application/json",
  //         },
  //         body: JSON.stringify({
  //           weekStart,
  //           employees,
  //           rules,
  //         }),
  //       });

  //       if (!scheduleRes.ok) {
  //         throw new Error("Failed to generate schedule");
  //       }

  //       const { events: result } = await scheduleRes.json();

  //       const fullCalendarEvents = [];

  //       for (const emp of result) {
  //         const empName = Object.values(employees).find(
  //           (e) => e.id === emp.employeeId
  //         )?.name;

  //         if (!empName) continue;

  //         fullCalendarEvents.push({
  //           id: `${emp.taskId}-${emp.start}`,
  //           resourceId: emp.employeeId,
  //           title: emp.title,
  //           start: emp.start,
  //           end: emp.end,
  //           backgroundColor: getTaskColor(emp.title),
  //           borderColor: getTaskColor(emp.title),
  //           extendedProps: {
  //             email: emp.email || "",
  //             userName: empName,
  //             taskId: emp.taskId || null,
  //             shift: emp.shift || null,
  //           },
  //         });
  //       }

  //       onEventsGenerated(fullCalendarEvents);
  //     } catch (error) {
  //       console.error("Error fetching AI-generated schedule:", error);
  //     } finally {
  //       setIsLoading(false);
  //     }
  //   };

  //   fetchGeneratedSchedule();
  // }, [weekStart, employees, rules, onEventsGenerated]);

  return (
    <div className="scheduler-container">
      {isLoading && (
        <div className="loading-overlay">Generating Schedule...</div>
      )}
      <FullCalendar
        key={weekStart}
        plugins={[resourceTimelinePlugin, interactionPlugin]}
        initialView="resourceTimelineWeek"
        initialDate={weekStart}
        schedulerLicenseKey="GPL-My-Project-Is-Open-Source"
        headerToolbar={{
          left: "",
          center: "title",
          right: "resourceTimelineDay,resourceTimelineWeek",
        }}
        editable={true}
        resources={resources}
        events={events}
        eventClick={onEventClick}
        resourceAreaHeaderContent="Employees"
        resourceAreaWidth="150px"
        slotMinTime="07:00:00"
        slotMaxTime="22:00:00"
        height="100%"
      />
    </div>
  );
}

function getTaskColor(task) {
  switch (task) {
    case "Reservations":
      return "#007bff";
    case "Dispatch":
      return "#28a745";
    case "Lunch":
      return "#ffc107";
    case "Journey Desk":
      return "#6610f2";
    case "Network":
      return "#fd7e14";
    case "Badges/Projects":
      return "#20c997";
    case "Scheduling":
      return "#e83e8c";
    case "Marketing":
      return "#17a2b8";
    case "Security":
      return "#343a40";
    case "Sales":
      return "#d63384";
    default:
      return "#6c757d";
  }
}
function convertGoogleEventsToInternalFormat(googleEvents, employeesMap) {
  const internalEvents = [];
  console.log(
    "Event IDs:",
    googleEvents.map((event) => event.id)
  );

  const randomNum = Math.floor(100 + Math.random() * 900);
  for (const event of googleEvents) {
    if (!event.attendees || !event.attendees.length) continue;

    for (const email of event.attendees) {
      const employeeEntry = employeesMap.find((emp) => emp.email === email);

      if (!employeeEntry) continue;

      const employeeId = employeeEntry.id;
      const date = new Date(event.start).toISOString().split("T")[0];
      const taskId = `${event.id}`;

      internalEvents.push({
        employeeId,
        title: event.title,
        taskId,
        date,
        start: new Date(event.start).toISOString().replace("Z", ""),
        end: new Date(event.end).toISOString().replace("Z", ""),
      });
    }
  }

  return internalEvents;
}

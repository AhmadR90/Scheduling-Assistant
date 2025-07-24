// src/App.js
import React, { useState, useEffect } from "react";
import SchedulerApp from "./SchedulerApp.js";
import EmployeeEditor from "./EmployeeEditor.js";
import AdminPanel from "./AdminPanel.js";
import Chatbot from "./Chatbot.js";
import EventEditor from "./EventEditor.js"; // <-- This line was missing
import "./App.css";

export default function App() {
  const [view, setView] = useState("scheduler");
  const [isEditingEmployee, setIsEditingEmployee] = useState(false);
  const [employees, setEmployees] = useState({});
  const [rules, setRules] = useState({});
  const [scheduleEvents, setScheduleEvents] = useState([]);
  const [weekStart, setWeekStart] = useState(getStartOfWeek(new Date()));
  const [editingEmployee, setEditingEmployee] = useState(null);
  const [editingEvent, setEditingEvent] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [editing, setIsEditing] = useState(false);

  const fetchData = async () => {
    try {
      setIsLoading(true);
      const [employeesRes, rulesRes] = await Promise.all([
        fetch("/api/employees"),
        fetch("/api/rules"),
      ]);
      if (!employeesRes.ok || !rulesRes.ok)
        throw new Error("Failed to fetch initial data.");

      const employeesData = await employeesRes.json();
      const rulesData = await rulesRes.json();

      setEmployees(employeesData);
      setRules(rulesData);
    } catch (error) {
      console.error("Failed to fetch data:", error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  function getStartOfWeek(date) {
    const d = new Date(date);
    d.setDate(d.getDate() - d.getDay());
    d.setHours(0, 0, 0, 0);
    return d;
  }
  // --- Event Handlers ---
  const handleEventClick = (eventClickInfo) => {
    if (eventClickInfo.event.backgroundColor === "#dc3545") {
      alert(
        "PTO and external meetings cannot be edited here. Please edit them directly in Google Calendar."
      );
      return;
    }
    setEditingEvent(eventClickInfo.event);
  };

  const handleEventSave = (updatedEvent) => {
    console.log("Updated Event details", updatedEvent);
    const updatedEvents = scheduleEvents.map((e) =>
      e.id === updatedEvent.id
        ? { ...e, ...updatedEvent, ...getTaskColor(updatedEvent.title) }
        : e
    );
    setScheduleEvents(updatedEvents);
    setEditingEvent(null);
  };

  const handleEventDelete = (eventId) => {
    console.log("Event ID", eventId);
    if (window.confirm("Are you sure you want to delete this task?")) {
      setScheduleEvents(scheduleEvents.filter((e) => e.id !== eventId));
      setEditingEvent(null);
    }
  };

  const handleEditEmployee = async (employee) => {
    const newEmployee = {
      id: employee.id,
      name: employee.name,
      email: employee.email,
      shift: employee.shift,
      lunch: employee.lunch,
      hours: 40,
      abilities: employee.abilities || [],
      specialistTask: employee.specialistTask || "",
      schedulingNotes: employee.schedulingNotes || "",
      pto: employee.pto || [],
      specialistTarget: employee.specialistTarget || 0,
    };

    try {
      const response = await fetch("/api/employees", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(newEmployee),
      });
      fetchData();
      const result = await response.json();
      if (response.ok) {
        console.log("✅ User Updated successfully:", result.message);
      } else {
        console.error("❌ Failed:", result.message);
      }
    } catch (err) {
      console.error("❌ Server error:", err);
    }

    setEditingEmployee(null);
  };

  const handleRemoveEmployee = async (employee) => {
    if (!window.confirm(`Are you sure you want to remove ${employee.name}?`))
      return;
    setIsLoading(true);
    try {
      await fetch(`/api/employees/${employee.id}`, {
        method: "DELETE",
      });
      setEmployees(employees.filter((emp) => emp.id !== employee.id));
    } catch (error) {
      console.error("Error removing employee:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSaveRules = async (newRules) => {
    try {
      const response = await fetch("/api/rules", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(newRules),
      });
      if (!response.ok) throw new Error("Server failed to save rules.");
      setRules(newRules);
      alert("Scheduling rules have been updated!");
    } catch (error) {
      console.error("Error saving rules:", error);
    }
  };
  const initializeState = () => {
    setEditingEmployee({
      name: "",
      email: "",
      shift: { start: "09:00", end: "17:00" },
      lunch: { start: "12:00", end: "13:00" },
      hours: 40,
      abilities: [],
      specialistTask: "",
      schedulingNotes: "",
      pto: [],
      specialistTarget: 0,
    });
  };
  const initializeEditingEmployeeState = (employee) => {
    setIsEditingEmployee(true);
    setEditingEmployee({
      id: employee.id,
      name: employee.name,
      email: employee.email,
      shift: employee.shift,
      lunch: employee.lunch,
      hours: employee.hours,
      abilities: employee.abilities,
      specialistTask: employee.specialistTask,
      schedulingNotes: employee.schedulingNotes,
      pto: employee.pto,
      specialistTarget: employee.specialistTarget,
    });
  };

  const handleAddNewEmployee = async (employeeData) => {
    const newEmployee = {
      name: employeeData.name,
      email: employeeData.email,
      shift: employeeData.shift,
      lunch: employeeData.lunch,
      hours: 40,
      abilities: employeeData.abilities || [],
      specialistTask: employeeData.specialistTask || "",
      schedulingNotes: employeeData.schedulingNotes || "",
      pto: employeeData.pto || [],
      specialistTarget: employeeData.specialistTarget || 0, // Default for new employee
    };
    if (!isEditingEmployee) {
      try {
        const response = await fetch("/api/employees", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(newEmployee),
        });

        const result = await response.json();
        console.log("Result:", result);
        if (response.ok) {
          setEmployees([...employees, result.user]);
          console.log("✅ User added successfully:", result.message);
        } else {
          console.error("❌ Failed:", result.message);
        }
      } catch (err) {
        console.error("❌ Server error:", err);
      }
    } else {
      await handleEditEmployee(employeeData);
      setEditingEmployee(false);
    }
    // This still shows the form with empty fields for further editing

    setEditingEmployee(null);
  };

  const getTaskColor = (task) => {
    switch (task) {
      case "Reservations":
        return { backgroundColor: "#007bff", borderColor: "#007bff" };
      case "Dispatch":
        return { backgroundColor: "#28a745", borderColor: "#28a745" };
      case "Lunch":
        return { backgroundColor: "#ffc107", borderColor: "#ffc107" };
      default:
        return { backgroundColor: "#6c757d", borderColor: "#6c757d" };
    }
  };

  return (
    <div className="App">
      {isLoading && <div className="loading-overlay">Loading...</div>}
      {editingEmployee && (
        <EmployeeEditor
          employee={editingEmployee}
          onSave={handleAddNewEmployee}
          onClose={() => {
            setEditingEmployee(null);
            setIsEditingEmployee(false);
          }}
        />
      )}
      {editingEvent && (
        <EventEditor
          event={editingEvent}
          employee={employees[editingEvent.getResources()[0].id]}
          onClose={() => setEditingEvent(null)}
          onSave={handleEventSave}
          onDelete={handleEventDelete}
        />
      )}
      <div className="controls">
        <h2>Controls</h2>
        <div className="view-switcher">
          <button
            onClick={() => setView("scheduler")}
            className={view === "scheduler" ? "active" : ""}
          >
            Scheduler
          </button>
          <button
            onClick={() => setView("admin")}
            className={view === "admin" ? "active" : ""}
          >
            Admin
          </button>
        </div>

        {view === "scheduler" && (
          <div className="scheduler-controls">
            <div className="navigation">
              <button
                onClick={() =>
                  setWeekStart(
                    (d) => new Date(new Date(d).setDate(d.getDate() - 7))
                  )
                }
              >
                &lt;
              </button>
              <button onClick={() => setWeekStart(getStartOfWeek(new Date()))}>
                Today
              </button>
              <button
                onClick={() =>
                  setWeekStart(
                    (d) => new Date(new Date(d).setDate(d.getDate() + 7))
                  )
                }
              >
                &gt;
              </button>
            </div>
            <label>
              Week Starting:
              <input
                type="date"
                value={weekStart.toISOString().split("T")[0]}
                onChange={(e) =>
                  setWeekStart(getStartOfWeek(new Date(e.target.value)))
                }
              />
            </label>
          </div>
        )}

        <div className="chatbot-wrapper">
          <Chatbot
            employees={employees}
            rules={rules}
            scheduleEvents={scheduleEvents}
          />
        </div>
      </div>
      <div className="main-content">
        {view === "scheduler" ? (
          <SchedulerApp
            employees={employees}
            rules={rules}
            weekStart={weekStart.toISOString()}
            events={scheduleEvents}
            onEventsGenerated={setScheduleEvents}
            onEventClick={handleEventClick}
          />
        ) : (
          <AdminPanel
            employees={employees}
            rules={rules}
            onSaveRules={handleSaveRules}
            onEditEmployee={initializeEditingEmployeeState}
            setEditingEmployee={setEditingEmployee}
            onRemoveEmployee={handleRemoveEmployee}
            onAddNewEmployee={initializeState}
          />
        )}
      </div>
    </div>
  );
}

// src/EventEditor.js
import React, { useState, useEffect } from "react";
import "./App.css";

export default function EventEditor({
  event,
  employee,
  onClose,
  onSave,
  onDelete,
}) {
  const [formData, setFormData] = useState({
    empId: "",
    taskId: "",
    title: "",
    start: "",
    end: "",
  });

  const defaultAbilities = [
    "Reservations",
    "Dispatch",
    "Journey Desk",
    "Network",
    "Marketing",
    "Security",
    "Sales",
    "Scheduling",
    "Badges/Projects",
  ];
  useEffect(() => {
    if (event) {
      const extractTime = (isoString) => {
        if (!isoString) return "";
        const d = new Date(isoString);
        return d.toTimeString().slice(0, 5); // "HH:mm"
      };

      setFormData({
        empId: event._def.resourceIds,
        taskId: event._def.extendedProps.taskId,
        title: event.title,
        start: extractTime(event.start),
        end: extractTime(event.end),
      });
    }
  }, [event]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };
  const handleSave = () => {
    const dateStr = new Date(event.start).toISOString().split("T")[0];

    const startISO = `${dateStr}T${formData.start}:00`;
    const endISO = `${dateStr}T${formData.end}:00`;

    onSave({
      empId: formData.empId,
      taskId: formData.taskId,
      title: formData.title,
      start: startISO,
      end: endISO,
    });
  };

  if (!event) return null;

  return (
    <div className="modal-backdrop">
      <div className="modal">
        <h3>Edit Task</h3>
        <div className="form-group">
          <div className="task-header">
            <label htmlFor="title">Task</label>
            <h1>{formData.title}</h1>
          </div>

          <select name="title" value={formData.title} onChange={handleChange}>
            {(employee?.abilities?.length
              ? employee.abilities.map((a) => a.name)
              : defaultAbilities
            ).map((task, idx) => (
              <option key={idx} value={task}>
                {task}
              </option>
            ))}
          </select>
        </div>
        <div className="form-group-inline">
          <div className="form-group">
            <label>Start Time</label>
            <input
              type="time"
              name="start"
              value={formData.start}
              onChange={handleChange}
            />
          </div>
          <div className="form-group">
            <label>End Time</label>
            <input
              type="time"
              name="end"
              value={formData.end}
              onChange={handleChange}
            />
          </div>
        </div>
        <div className="modal-actions">
          <button
            type="button"
            className="danger"
            onClick={() =>
              onDelete(event._def.extendedProps.taskId, event._def.resourceIds)
            }
          >
            Delete Task
          </button>
          <button type="button" className="secondary" onClick={onClose}>
            Cancel
          </button>
          <button type="button" className="primary" onClick={handleSave}>
            Save Changes
          </button>
        </div>
      </div>
    </div>
  );
}

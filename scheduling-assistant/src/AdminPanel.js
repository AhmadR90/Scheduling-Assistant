// src/AdminPanel.js
import React, { useState, useEffect } from "react";
import "./App.css"; // Reuse the main stylesheet

export default function AdminPanel({
  employees,
  rules,
  onSaveRules,
  onEditEmployee,
  onRemoveEmployee,
  onAddNewEmployee,
  setEditingEmployee
}) {
  // Receive the new prop
  const [editableRules, setEditableRules] = useState(rules);
 
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    setEditableRules(rules);
  }, [rules]);

  const handleRequirementChange = (period, task, value) => {
    const newValue = parseInt(value, 10);
    if (isNaN(newValue)) return;

    setEditableRules((prevRules) => ({
      ...prevRules,
      coverage: {
        ...prevRules.coverage,
        [period]: {
          ...prevRules.coverage[period],
          requirements: {
            ...prevRules.coverage[period].requirements,
            [task]: newValue,
          },
        },
      },
    }));
  };

  const handleSave = async () => {
    setIsSaving(true);
    await onSaveRules(editableRules);
    setIsSaving(false);
  };

  if (!editableRules.coverage) {
    return <div className="loading-overlay">Loading Rules...</div>;
  }

  return (
    <div className="admin-panel">
      <h1>Admin Settings</h1>

      <div className="admin-section">
        <h2>Coverage Requirements</h2>
        <div className="rule-card">
          <h4>Primary Hours (08:00 - 17:00)</h4>
          <div className="rule-input-group">
            <label>Reservations:</label>
            <input
              type="number"
              value={editableRules.coverage.primary.requirements.Reservations}
              onChange={(e) =>
                handleRequirementChange(
                  "primary",
                  "Reservations",
                  e.target.value
                )
              }
            />
          </div>
          <div className="rule-input-group">
            <label>Dispatch:</label>
            <input
              type="number"
              value={editableRules.coverage.primary.requirements.Dispatch}
              onChange={(e) =>
                handleRequirementChange("primary", "Dispatch", e.target.value)
              }
            />
          </div>
        </div>
        <div className="rule-card">
          <h4>Evening Hours (17:00+)</h4>
          <div className="rule-input-group">
            <label>Reservations:</label>
            <input
              type="number"
              value={editableRules.coverage.evening.requirements.Reservations}
              onChange={(e) =>
                handleRequirementChange(
                  "evening",
                  "Reservations",
                  e.target.value
                )
              }
            />
          </div>
          <div className="rule-input-group">
            <label>Dispatch:</label>
            <input
              type="number"
              value={editableRules.coverage.evening.requirements.Dispatch}
              onChange={(e) =>
                handleRequirementChange("evening", "Dispatch", e.target.value)
              }
            />
          </div>
        </div>
        <div className="save-rules-container">
          <button onClick={handleSave} disabled={isSaving}>
            {isSaving ? "Saving..." : "Save Rule Changes"}
          </button>
        </div>
      </div>

      <div className="admin-section">
        <h2>Manage Employees</h2>
        {/* --- Add New Employee Button --- */}
        <div className="admin-actions">
          <button onClick={onAddNewEmployee} className="add-new">
            Add New Employee
          </button>
        </div>
        <div className="employee-list-admin">
          {Object.keys(employees)
            .sort()
            .map((id) => (
              <div key={id} className="employee-item">
                <span>
                  <strong>{employees[id].name}</strong> ({employees[id].email})
                  <br />
                  <small>
                    Specialty: {employees[id].specialistTask} (Target:{" "}
                    {employees[id].specialistTarget} hrs)
                  </small>
                </span>
                <div>
                  <button
                    className="edit"
                    onClick={
                      (() => {
                        onEditEmployee(employees[id])
                      })}
                  >
                    Edit
                  </button>
                  <button
                    className="remove"
                    onClick={() => onRemoveEmployee(employees[id])}
                  >
                    Remove
                  </button>
                </div>
              </div>
            ))}
        </div>
      </div>
    </div>
  );
}

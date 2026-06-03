"use client";

import { useState } from "react";

const TABS = [
  { key: "supervisor", label: "Supervisor Change Form" },
  { key: "consent", label: "FYP Student Consent Form" },
  { key: "extension", label: "Extension Request Form" },
  { key: "reeval", label: "Re-Evaluation Appeal Form" },
  { key: "general", label: "General Request Form" },
];

export default function StudentFormsPage() {
  const [tab, setTab] = useState("supervisor");


  return (
    <div className="max-w-4xl mx-auto p-6">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-3xl font-bold text-gray-800">FYP Forms</h1>
        <button
          className="bg-gray-200 hover:bg-gray-300 text-gray-800 px-4 py-2 rounded shadow"
          onClick={() => window.location.href = '/student'}
        >
          ← Back to Dashboard
        </button>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
        {TABS.map((t) => (
          <button
            key={t.key}
            className={`flex flex-col items-center justify-center p-6 rounded-xl shadow transition-all border-2 ${tab === t.key ? "bg-blue-600 text-white border-blue-600 scale-105" : "bg-white text-gray-800 border-gray-200 hover:border-blue-400 hover:shadow-lg"}`}
            onClick={() => setTab(t.key)}
            style={{ minHeight: 120 }}
          >
            <span className="text-lg font-semibold mb-2">{t.label}</span>
            <span className="text-xs opacity-70">{tab === t.key ? "Selected" : "Click to fill"}</span>
          </button>
        ))}
      </div>
      <div className="bg-white rounded-xl shadow-lg p-6">
        {tab === "supervisor" && <SupervisorChangeForm />}
        {tab === "consent" && <ConsentForm />}
        {tab === "extension" && <ExtensionRequestForm />}
        {tab === "reeval" && <ReEvaluationAppealForm />}
        {tab === "general" && <GeneralRequestForm />}
      </div>
    </div>
  );
}

function SupervisorChangeForm() {
  const [form, setForm] = useState({
    projectTitle: "",
    projectCode: "",
    prevSupervisor: "",
    newSupervisor: "",
    coSupervisors: "",
    reason: "",
    members: [{ name: "", regNo: "" }, { name: "", regNo: "" }, { name: "", regNo: "" }],
    prevSupervisorComments: "",
    newSupervisorComments: "",
    committeeComments: "",
    date: "",
  });
  const [status, setStatus] = useState("");
  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };
  const handleMemberChange = (idx, field, value) => {
    setForm((prev) => {
      const members = [...prev.members];
      members[idx][field] = value;
      return { ...prev, members };
    });
  };
  const handleSubmit = async (e) => {
    e.preventDefault();
    setStatus("Submitting...");
    
    // Get user from localStorage
    const userStr = localStorage.getItem('user');
    const user = userStr ? JSON.parse(userStr) : null;
    
    const res = await fetch("/api/forms/submit", {
      method: "POST",
      headers: { 
        "Content-Type": "application/json",
        ...(user?.id && { "x-user-id": user.id })
      },
      body: JSON.stringify({ type: "supervisor-change", ...form }),
    });
    setStatus(res.ok ? "Submitted!" : "Failed to submit");
  };
  return (
    <form className="space-y-4 bg-white p-4 rounded shadow" onSubmit={handleSubmit}>
      <h2 className="text-xl font-semibold mb-2">Supervisor Change Form</h2>
      <input name="projectTitle" value={form.projectTitle} onChange={handleChange} placeholder="Project Title" className="input" required />
      <input name="projectCode" value={form.projectCode} onChange={handleChange} placeholder="Project Code" className="input" />
      <input name="prevSupervisor" value={form.prevSupervisor} onChange={handleChange} placeholder="Previous Supervisor Name" className="input" required />
      <input name="newSupervisor" value={form.newSupervisor} onChange={handleChange} placeholder="New Supervisor Name" className="input" required />
      <input name="coSupervisors" value={form.coSupervisors} onChange={handleChange} placeholder="Co-Supervisor(s) Name" className="input" />
      <input name="reason" value={form.reason} onChange={handleChange} placeholder="Reason for Request of Change" className="input" required />
      <div>
        <div className="font-semibold">Team Members</div>
        {form.members.map((m, i) => (
          <div key={i} className="flex gap-2 mb-1">
            <input value={m.name} onChange={e => handleMemberChange(i, "name", e.target.value)} placeholder={`Name ${i+1}`} className="input" required={i===0} />
            <input value={m.regNo} onChange={e => handleMemberChange(i, "regNo", e.target.value)} placeholder="Reg No." className="input" required={i===0} />
          </div>
        ))}
      </div>
      <textarea name="prevSupervisorComments" value={form.prevSupervisorComments} onChange={handleChange} placeholder="Comments by Previous Supervisor" className="input" />
      <textarea name="newSupervisorComments" value={form.newSupervisorComments} onChange={handleChange} placeholder="Comments by New Supervisor" className="input" />
      <textarea name="committeeComments" value={form.committeeComments} onChange={handleChange} placeholder="Comments by FYP Committee/Chairman" className="input" />
      <input name="date" value={form.date} onChange={handleChange} placeholder="Date" className="input" />
      <button type="submit" className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded">Submit</button>
      {status && <div className="text-sm mt-2">{status}</div>}
    </form>
  );
}

function ConsentForm() {
  const [form, setForm] = useState({
    teamLead: "",
    teamLeadReg: "",
    members: [{ name: "", regNo: "" }, { name: "", regNo: "" }],
    witnesses: ["", ""],
    committeeComments: "",
    committeeSignature: "",
    date: "",
  });
  const [status, setStatus] = useState("");
  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };
  const handleMemberChange = (idx, field, value) => {
    setForm((prev) => {
      const members = [...prev.members];
      members[idx][field] = value;
      return { ...prev, members };
    });
  };
  const handleWitnessChange = (idx, value) => {
    setForm((prev) => {
      const witnesses = [...prev.witnesses];
      witnesses[idx] = value;
      return { ...prev, witnesses };
    });
  };
  const handleSubmit = async (e) => {
    e.preventDefault();
    setStatus("Submitting...");
    
    // Get user from localStorage
    const userStr = localStorage.getItem('user');
    const user = userStr ? JSON.parse(userStr) : null;
    
    const res = await fetch("/api/forms/submit", {
      method: "POST",
      headers: { 
        "Content-Type": "application/json",
        ...(user?.id && { "x-user-id": user.id })
      },
      body: JSON.stringify({ type: "consent", ...form }),
    });
    setStatus(res.ok ? "Submitted!" : "Failed to submit");
  };
  return (
    <form className="space-y-4 bg-white p-4 rounded shadow" onSubmit={handleSubmit}>
      <h2 className="text-xl font-semibold mb-2">FYP Student Consent Form</h2>
      <input name="teamLead" value={form.teamLead} onChange={handleChange} placeholder="Team Lead Name" className="input" required />
      <input name="teamLeadReg" value={form.teamLeadReg} onChange={handleChange} placeholder="Team Lead Reg No." className="input" required />
      <input name="teamLeadSign" value={form.teamLeadSign} onChange={handleChange} placeholder="Team Lead Signature" className="input" />
      <div>
        <div className="font-semibold">Team Members</div>
        {form.members.map((m, i) => (
          <div key={i} className="flex gap-2 mb-1">
            <input value={m.name} onChange={e => handleMemberChange(i, "name", e.target.value)} placeholder={`Name ${i+2}`} className="input" />
            <input value={m.regNo} onChange={e => handleMemberChange(i, "regNo", e.target.value)} placeholder="Reg No." className="input" />
          </div>
        ))}
      </div>
      <div>
        <div className="font-semibold">Witnesses</div>
        {form.witnesses.map((w, i) => (
          <input key={i} value={w} onChange={e => handleWitnessChange(i, e.target.value)} placeholder={`Witness #${i+1}`} className="input" />
        ))}
      </div>
      <textarea name="committeeComments" value={form.committeeComments} onChange={handleChange} placeholder="Comments by FYP Committee" className="input" />
      <input name="committeeSignature" value={form.committeeSignature} onChange={handleChange} placeholder="Committee Signature" className="input" />
      <input name="date" value={form.date} onChange={handleChange} placeholder="Date" className="input" />
      <button type="submit" className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded">Submit</button>
      {status && <div className="text-sm mt-2">{status}</div>}
    </form>
  );
}
function ExtensionRequestForm() {
  const [form, setForm] = useState({
    projectTitle: "",
    reason: "",
    requestedExtension: "",
    members: [{ name: "", regNo: "" }, { name: "", regNo: "" }, { name: "", regNo: "" }],
    supportingDocs: "",
  });
  const [status, setStatus] = useState("");
  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };
  const handleMemberChange = (idx, field, value) => {
    setForm((prev) => {
      const members = [...prev.members];
      members[idx][field] = value;
      return { ...prev, members };
    });
  };
  const handleSubmit = async (e) => {
    e.preventDefault();
    setStatus("Submitting...");
    
    // Get user from localStorage
    const userStr = localStorage.getItem('user');
    const user = userStr ? JSON.parse(userStr) : null;
    
    const res = await fetch("/api/forms/submit", {
      method: "POST",
      headers: { 
        "Content-Type": "application/json",
        ...(user?.id && { "x-user-id": user.id })
      },
      body: JSON.stringify({ type: "extension", ...form }),
    });
    setStatus(res.ok ? "Submitted!" : "Failed to submit");
  };
  return (
    <form className="space-y-4 bg-white p-4 rounded shadow" onSubmit={handleSubmit}>
      <h2 className="text-xl font-semibold mb-2">Extension Request Form</h2>
      <input name="projectTitle" value={form.projectTitle} onChange={handleChange} placeholder="Project Title" className="input" required />
      <textarea name="reason" value={form.reason} onChange={handleChange} placeholder="Reason for Extension Request" className="input" required />
      <input name="requestedExtension" value={form.requestedExtension} onChange={handleChange} placeholder="Requested Extension (e.g. 2 weeks)" className="input" required />
      <div>
        <div className="font-semibold">Team Members</div>
        {form.members.map((m, i) => (
          <div key={i} className="flex gap-2 mb-1">
            <input value={m.name} onChange={e => handleMemberChange(i, "name", e.target.value)} placeholder={`Name ${i+1}`} className="input" />
            <input value={m.regNo} onChange={e => handleMemberChange(i, "regNo", e.target.value)} placeholder="Reg No." className="input" />
          </div>
        ))}
      </div>
      <input name="supportingDocs" value={form.supportingDocs} onChange={handleChange} placeholder="Supporting Documents (optional)" className="input" />
      <button type="submit" className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded">Submit</button>
      {status && <div className="text-sm mt-2">{status}</div>}
    </form>
  );
}
function ReEvaluationAppealForm() {
  const [form, setForm] = useState({
    courseOrComponent: "",
    reason: "",
    members: [{ name: "", regNo: "" }, { name: "", regNo: "" }, { name: "", regNo: "" }],
    supportingDocs: "",
  });
  const [status, setStatus] = useState("");
  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };
  const handleMemberChange = (idx, field, value) => {
    setForm((prev) => {
      const members = [...prev.members];
      members[idx][field] = value;
      return { ...prev, members };
    });
  };
  const handleSubmit = async (e) => {
    e.preventDefault();
    setStatus("Submitting...");
    
    // Get user from localStorage
    const userStr = localStorage.getItem('user');
    const user = userStr ? JSON.parse(userStr) : null;
    
    const res = await fetch("/api/forms/submit", {
      method: "POST",
      headers: { 
        "Content-Type": "application/json",
        ...(user?.id && { "x-user-id": user.id })
      },
      body: JSON.stringify({ type: "reeval", ...form }),
    });
    setStatus(res.ok ? "Submitted!" : "Failed to submit");
  };
  return (
    <form className="space-y-4 bg-white p-4 rounded shadow" onSubmit={handleSubmit}>
      <h2 className="text-xl font-semibold mb-2">Re-Evaluation Appeal Form</h2>
      <input name="courseOrComponent" value={form.courseOrComponent} onChange={handleChange} placeholder="Course/Component" className="input" required />
      <textarea name="reason" value={form.reason} onChange={handleChange} placeholder="Reason for Appeal" className="input" required />
      <div>
        <div className="font-semibold">Team Members</div>
        {form.members.map((m, i) => (
          <div key={i} className="flex gap-2 mb-1">
            <input value={m.name} onChange={e => handleMemberChange(i, "name", e.target.value)} placeholder={`Name ${i+1}`} className="input" />
            <input value={m.regNo} onChange={e => handleMemberChange(i, "regNo", e.target.value)} placeholder="Reg No." className="input" />
          </div>
        ))}
      </div>
      <input name="supportingDocs" value={form.supportingDocs} onChange={handleChange} placeholder="Supporting Documents (optional)" className="input" />
      <button type="submit" className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded">Submit</button>
      {status && <div className="text-sm mt-2">{status}</div>}
    </form>
  );
}
function GeneralRequestForm() {
  const [form, setForm] = useState({
    subject: "",
    description: "",
    members: [{ name: "", regNo: "" }, { name: "", regNo: "" }, { name: "", regNo: "" }],
    supportingDocs: "",
  });
  const [status, setStatus] = useState("");
  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };
  const handleMemberChange = (idx, field, value) => {
    setForm((prev) => {
      const members = [...prev.members];
      members[idx][field] = value;
      return { ...prev, members };
    });
  };
  const handleSubmit = async (e) => {
    e.preventDefault();
    setStatus("Submitting...");
    
    // Get user from localStorage
    const userStr = localStorage.getItem('user');
    const user = userStr ? JSON.parse(userStr) : null;
    
    const res = await fetch("/api/forms/submit", {
      method: "POST",
      headers: { 
        "Content-Type": "application/json",
        ...(user?.id && { "x-user-id": user.id })
      },
      body: JSON.stringify({ type: "general", ...form }),
    });
    setStatus(res.ok ? "Submitted!" : "Failed to submit");
  };
  return (
    <form className="space-y-4 bg-white p-4 rounded shadow" onSubmit={handleSubmit}>
      <h2 className="text-xl font-semibold mb-2">General Request Form</h2>
      <input name="subject" value={form.subject} onChange={handleChange} placeholder="Subject" className="input" required />
      <textarea name="description" value={form.description} onChange={handleChange} placeholder="Description of Issue/Request" className="input" required />
      <div>
        <div className="font-semibold">Team Members</div>
        {form.members.map((m, i) => (
          <div key={i} className="flex gap-2 mb-1">
            <input value={m.name} onChange={e => handleMemberChange(i, "name", e.target.value)} placeholder={`Name ${i+1}`} className="input" />
            <input value={m.regNo} onChange={e => handleMemberChange(i, "regNo", e.target.value)} placeholder="Reg No." className="input" />
          </div>
        ))}
      </div>
      <input name="supportingDocs" value={form.supportingDocs} onChange={handleChange} placeholder="Supporting Documents (optional)" className="input" />
      <button type="submit" className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded">Submit</button>
      {status && <div className="text-sm mt-2">{status}</div>}
    </form>
  );
}

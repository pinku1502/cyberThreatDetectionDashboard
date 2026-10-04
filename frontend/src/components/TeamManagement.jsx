import { useEffect, useState } from "react";
import { ROOT_API } from "../api/api";

export default function TeamManagement({ websiteId, user }) {
  const [users, setUsers] = useState([]);
  const [form, setForm] = useState({ full_name: "", email: "", password: "", role: "ANALYST" });
  const [message, setMessage] = useState("");

  const loadUsers = async () => {
    try { const response = await ROOT_API.get("/auth/users"); setUsers(response.data.data || []); } catch (error) { setMessage(error.response?.data?.message || "Could not load team"); }
  };
  useEffect(() => { loadUsers(); }, []);

  const createAndAssign = async (event) => {
    event.preventDefault();
    try {
      const created = await ROOT_API.post("/auth/users", form);
      await ROOT_API.post("/websites/" + websiteId + "/members", { user_id: created.data.user_id, role: form.role });
      setMessage("User created and assigned to this website.");
      setForm({ full_name: "", email: "", password: "", role: "ANALYST" });
      loadUsers();
    } catch (error) { setMessage(error.response?.data?.message || "Could not create or assign user"); }
  };

  return <section className="mt-8 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
    <h2 className="text-xl font-bold text-slate-800">Website team</h2>
    <p className="mt-1 text-sm text-slate-500">Create a least-privilege analyst or client and assign access to the selected website.</p>
    <form onSubmit={createAndAssign} className="mt-4 grid gap-3 md:grid-cols-5">
      <input value={form.full_name} onChange={(e) => setForm({ ...form, full_name: e.target.value })} placeholder="Full name" required className="rounded-xl border px-3 py-3" />
      <input value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} placeholder="Email" type="email" required className="rounded-xl border px-3 py-3" />
      <input value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} placeholder="Temporary password (12+)" minLength="12" required className="rounded-xl border px-3 py-3" />
      <select value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value })} className="rounded-xl border px-3 py-3"><option value="ANALYST">Analyst</option><option value="CLIENT">Client</option>{user.role === "SUPER_ADMIN" && <option value="SITE_ADMIN">Site admin</option>}</select>
      <button className="rounded-xl bg-slate-900 px-4 py-3 font-semibold text-white">Create and assign</button>
    </form>
    {message && <p className="mt-3 text-sm text-slate-600">{message}</p>}
    <div className="mt-5 grid gap-2 md:grid-cols-3">{users.map((user) => <div key={user.id} className="rounded-xl bg-slate-50 p-3 text-sm"><b>{user.full_name}</b><br />{user.email} · {user.role}</div>)}</div>
  </section>;
}

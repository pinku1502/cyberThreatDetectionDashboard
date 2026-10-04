import { useState } from "react";
import { ROOT_API } from "../api/api";

export default function WebsiteSelector({ websites, selectedWebsite, onSelect, user, onCreated }) {
  const [name, setName] = useState("");
  const [baseUrl, setBaseUrl] = useState("");
  const [confirmed, setConfirmed] = useState(false);
  const [message, setMessage] = useState("");
  const [token, setToken] = useState("");

  const createWebsite = async (event) => {
    event.preventDefault();
    setMessage("");
    setToken("");
    try {
      const response = await ROOT_API.post("/websites", {
        name,
        base_url: baseUrl,
        authorization_confirmed: confirmed,
      });
      setMessage("Website registered. Generate an ingest token from the site management page.");
      setName("");
      setBaseUrl("");
      setConfirmed(false);
      onCreated(response.data.website_id);
    } catch (error) {
      setMessage(error.response?.data?.message || "Could not register website.");
    }
  };

  const generateToken = async () => {
    if (!selectedWebsite) return;
    try {
      const response = await ROOT_API.post("/websites/" + selectedWebsite.id + "/tokens", { label: "security-agent" });
      setToken(response.data.token);
    } catch (error) {
      setMessage(error.response?.data?.message || "Could not create ingest token.");
    }
  };

  return (
    <section className="mb-6 rounded-3xl border border-blue-100 bg-white p-5 shadow-sm">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <label className="flex-1 text-sm font-semibold text-slate-700">
          Authorized website
          <select value={selectedWebsite?.id || ""} onChange={(event) => onSelect(Number(event.target.value))} className="mt-2 w-full rounded-xl border border-slate-200 px-3 py-3">
            {websites.length === 0 && <option value="">No assigned websites</option>}
            {websites.map((website) => <option key={website.id} value={website.id}>{website.name} — {website.base_url}</option>)}
          </select>
        </label>
        {selectedWebsite && (user.role === "SUPER_ADMIN" || selectedWebsite.role === "SITE_ADMIN") && (
          <button onClick={generateToken} className="rounded-xl bg-slate-900 px-4 py-3 font-semibold text-white">Generate ingest token</button>
        )}
      </div>

      {user.role === "SUPER_ADMIN" && (
        <form onSubmit={createWebsite} className="mt-5 grid gap-3 border-t border-slate-100 pt-5 md:grid-cols-4">
          <input value={name} onChange={(event) => setName(event.target.value)} placeholder="Website name" required className="rounded-xl border px-3 py-3" />
          <input value={baseUrl} onChange={(event) => setBaseUrl(event.target.value)} placeholder="https://example.com" type="url" required className="rounded-xl border px-3 py-3" />
          <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={confirmed} onChange={(event) => setConfirmed(event.target.checked)} required /> I am authorized to monitor it</label>
          <button className="rounded-xl bg-blue-600 px-4 py-3 font-semibold text-white">Add authorized website</button>
        </form>
      )}

      {message && <p className="mt-3 text-sm text-slate-600">{message}</p>}
      {token && <div className="mt-3 rounded-xl border border-amber-300 bg-amber-50 p-3 text-sm text-amber-900">Copy this token into the website agent environment now: <code className="break-all">{token}</code></div>}
    </section>
  );
}

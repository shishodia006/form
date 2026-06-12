import { useEffect, useMemo, useState } from "react";
import {
  ArrowLeft,
  BriefcaseBusiness,
  CalendarDays,
  CheckCircle2,
  Clock3,
  Download,
  Eye,
  FileText,
  Filter,
  LayoutDashboard,
  Loader2,
  LockKeyhole,
  LogOut,
  Mail,
  Menu,
  MessageCircle,
  Search,
  ShieldCheck,
  Sparkles,
  Target,
  Users,
  X,
} from "lucide-react";

const statusStyles = {
  New: "bg-violet-100 text-violet-700",
  Contacted: "bg-sky-100 text-sky-700",
  "In Progress": "bg-amber-100 text-amber-700",
  Closed: "bg-emerald-100 text-emerald-700",
};

const fieldLabels = {
  fullName: "Full name",
  businessName: "Business / brand",
  phone: "WhatsApp",
  email: "Email",
  websiteType: "Website type",
  businessDescription: "Business description",
  targetAudience: "Target audience",
  primaryGoal: "Primary goal",
  uniqueValue: "Unique value",
  tone: "Brand tone",
  pages: "Pages",
  features: "Features",
  inspiration: "Reference websites",
  brandStyle: "Brand style",
  primaryColor: "Primary color",
  hasLogo: "Logo status",
  designNotes: "Design notes",
  budget: "Budget",
  timeline: "Timeline",
  contentReady: "Content status",
  launchDate: "Launch date",
  finalNotes: "Final notes",
};

const sections = [
  {
    title: "Contact & Business",
    fields: ["fullName", "businessName", "phone", "email", "websiteType"],
  },
  {
    title: "Goals & Audience",
    fields: ["businessDescription", "targetAudience", "primaryGoal", "uniqueValue", "tone"],
  },
  {
    title: "Website Scope",
    fields: ["pages", "features", "inspiration"],
  },
  {
    title: "Brand & Design",
    fields: ["brandStyle", "primaryColor", "hasLogo", "designNotes"],
  },
  {
    title: "Budget & Delivery",
    fields: ["budget", "timeline", "contentReady", "launchDate", "finalNotes"],
  },
];

function formatDate(value) {
  if (!value) return "Not provided";
  return new Intl.DateTimeFormat("en-IN", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

function displayValue(value) {
  if (Array.isArray(value)) return value.length ? value.join(", ") : "Not provided";
  return value || "Not provided";
}

function initials(name) {
  return String(name || "Lead")
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("");
}

async function apiRequest(url, options = {}) {
  try {
    const response = await fetch(url, {
      credentials: "same-origin",
      headers: {
        "Content-Type": "application/json",
        ...options.headers,
      },
      ...options,
    });
    const responseText = await response.text();
    let result = {};

    if (responseText) {
      try {
        result = JSON.parse(responseText);
      } catch {
        result = {};
      }
    }

    if (!response.ok) {
      const fallbackMessages = {
        404: "Admin API route was not found. Redeploy the latest GitHub commit on Vercel.",
        500: "The admin server encountered an error.",
        503: "Admin storage is not configured yet.",
      };
      const error = new Error(
        result.error || fallbackMessages[response.status] || `Request failed with status ${response.status}.`,
      );
      error.status = response.status;
      throw error;
    }
    return result;
  } catch (error) {
    if (error?.status) throw error;
    throw new Error("Could not reach the admin server. Check your connection and try again.");
  }
}

function LoginScreen({ onLogin }) {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const submit = async (event) => {
    event.preventDefault();
    setLoading(true);
    setError("");
    try {
      const result = await apiRequest("/api/admin/login", {
        method: "POST",
        body: JSON.stringify({ username, password }),
      });
      onLogin(result.username);
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="relative grid min-h-screen place-items-center overflow-hidden bg-slate-950 px-5 py-10">
      <div className="absolute left-[-10rem] top-[-6rem] h-96 w-96 rounded-full bg-violet-600/25 blur-3xl" />
      <div className="absolute bottom-[-10rem] right-[-6rem] h-[28rem] w-[28rem] rounded-full bg-fuchsia-500/20 blur-3xl" />
      <section className="relative w-full max-w-md rounded-[32px] border border-white/10 bg-white p-7 shadow-2xl sm:p-9">
        <div className="mb-8 flex items-center gap-3">
          <div className="grid h-12 w-12 place-items-center rounded-2xl bg-violet-600 text-white shadow-button">
            <LockKeyhole size={23} />
          </div>
          <div>
            <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-violet-600">Private workspace</p>
            <h1 className="text-xl font-extrabold tracking-tight text-slate-900">Admin Dashboard</h1>
          </div>
        </div>

        <div className="mb-7 rounded-2xl border border-violet-100 bg-violet-50 p-4">
          <div className="flex gap-3">
            <ShieldCheck size={20} className="mt-0.5 shrink-0 text-violet-600" />
            <p className="text-sm leading-6 text-slate-600">
              Website responses and uploaded files are protected behind your admin login.
            </p>
          </div>
        </div>

        <form onSubmit={submit} className="space-y-5">
          <label className="block">
            <span className="field-label">Admin username</span>
            <input
              value={username}
              onChange={(event) => setUsername(event.target.value)}
              className="input-field"
              autoComplete="username"
              placeholder="Enter username"
              required
            />
          </label>
          <label className="block">
            <span className="field-label">Password</span>
            <input
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              className="input-field"
              autoComplete="current-password"
              placeholder="Enter password"
              required
            />
          </label>
          {error && <p className="rounded-2xl bg-rose-50 p-3 text-sm font-medium text-rose-700">{error}</p>}
          <button
            type="submit"
            disabled={loading}
            className="flex w-full items-center justify-center gap-2 rounded-2xl bg-violet-600 px-5 py-4 text-sm font-bold text-white shadow-button transition hover:bg-violet-700 disabled:bg-slate-300"
          >
            {loading ? <Loader2 size={18} className="animate-spin" /> : <LockKeyhole size={18} />}
            {loading ? "Signing in..." : "Secure login"}
          </button>
        </form>
        <a href="/" className="mt-5 flex items-center justify-center gap-2 text-sm font-semibold text-slate-500 hover:text-violet-700">
          <ArrowLeft size={16} />
          Back to public form
        </a>
      </section>
    </main>
  );
}

function DetailPanel({ submission, onClose, onStatusChange, updating }) {
  if (!submission) return null;
  const data = submission.formData;
  const digits = String(data.phone || "").replace(/\D/g, "");

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-slate-950/45 backdrop-blur-sm">
      <button type="button" aria-label="Close details" onClick={onClose} className="flex-1 cursor-default" />
      <aside className="h-full w-full max-w-2xl overflow-y-auto bg-slate-50 shadow-2xl">
        <div className="sticky top-0 z-10 border-b border-slate-200 bg-white/95 px-5 py-5 backdrop-blur sm:px-7">
          <div className="flex items-start justify-between gap-4">
            <div className="flex min-w-0 items-center gap-3">
              <div className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-violet-600 text-sm font-extrabold text-white">
                {initials(data.fullName)}
              </div>
              <div className="min-w-0">
                <p className="truncate text-lg font-extrabold text-slate-900">{data.fullName}</p>
                <p className="truncate text-sm text-slate-500">{data.businessName}</p>
              </div>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="rounded-xl border border-slate-200 bg-white p-2 text-slate-500 hover:bg-slate-100"
            >
              <X size={19} />
            </button>
          </div>

          <div className="mt-4 grid grid-cols-2 gap-3 sm:flex">
            <a
              href={`https://wa.me/${digits}`}
              target="_blank"
              rel="noreferrer"
              className="flex items-center justify-center gap-2 rounded-xl bg-emerald-600 px-4 py-2.5 text-xs font-bold text-white"
            >
              <MessageCircle size={16} />
              WhatsApp
            </a>
            <a
              href={`mailto:${data.email}`}
              className="flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-xs font-bold text-slate-700"
            >
              <Mail size={16} />
              Email
            </a>
            <select
              value={submission.status}
              disabled={updating}
              onChange={(event) => onStatusChange(event.target.value)}
              className="col-span-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-xs font-bold text-slate-700 outline-none sm:min-w-36"
            >
              {Object.keys(statusStyles).map((status) => (
                <option key={status} value={status}>
                  {status}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="space-y-5 p-5 sm:p-7">
          <div className="grid gap-3 sm:grid-cols-3">
            <div className="rounded-2xl border border-slate-200 bg-white p-4">
              <CalendarDays size={18} className="mb-3 text-violet-600" />
              <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Submitted</p>
              <p className="mt-1 text-sm font-semibold text-slate-700">{formatDate(submission.createdAt)}</p>
            </div>
            <div className="rounded-2xl border border-slate-200 bg-white p-4">
              <Target size={18} className="mb-3 text-violet-600" />
              <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Primary goal</p>
              <p className="mt-1 text-sm font-semibold text-slate-700">{data.primaryGoal}</p>
            </div>
            <div className="rounded-2xl border border-slate-200 bg-white p-4">
              <BriefcaseBusiness size={18} className="mb-3 text-violet-600" />
              <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Budget</p>
              <p className="mt-1 text-sm font-semibold text-slate-700">{data.budget}</p>
            </div>
          </div>

          {sections.map((section) => (
            <section key={section.title} className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
              <div className="border-b border-slate-100 bg-slate-50 px-5 py-3">
                <h3 className="text-xs font-extrabold uppercase tracking-[0.12em] text-slate-600">{section.title}</h3>
              </div>
              <div className="divide-y divide-slate-100 px-5">
                {section.fields.map((field) => (
                  <div key={field} className="grid gap-1 py-4 sm:grid-cols-[150px_1fr] sm:gap-5">
                    <p className="text-xs font-bold text-slate-400">{fieldLabels[field]}</p>
                    <p className="whitespace-pre-wrap break-words text-sm font-medium leading-6 text-slate-700">
                      {displayValue(data[field])}
                    </p>
                  </div>
                ))}
              </div>
            </section>
          ))}

          <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
            <div className="border-b border-slate-100 bg-slate-50 px-5 py-3">
              <h3 className="text-xs font-extrabold uppercase tracking-[0.12em] text-slate-600">Uploaded Files</h3>
            </div>
            <div className="p-4">
              {submission.files.length ? (
                <div className="space-y-2">
                  {submission.files.map((file) => (
                    <a
                      key={file.storedName}
                      href={`/api/admin/files/${submission.id}/${encodeURIComponent(file.storedName)}`}
                      target="_blank"
                      rel="noreferrer"
                      className="flex items-center gap-3 rounded-xl border border-slate-200 p-3 transition hover:border-violet-300 hover:bg-violet-50"
                    >
                      <div className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-violet-100 text-violet-700">
                        <FileText size={18} />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-bold text-slate-700">{file.name}</p>
                        <p className="text-xs text-slate-400">
                          {file.category} · {(file.size / 1024 / 1024).toFixed(2)} MB
                        </p>
                      </div>
                      <Download size={17} className="text-slate-400" />
                    </a>
                  ))}
                </div>
              ) : (
                <p className="py-5 text-center text-sm text-slate-400">No files uploaded.</p>
              )}
            </div>
          </section>
        </div>
      </aside>
    </div>
  );
}

function Dashboard({ username, onLogout }) {
  const [submissions, setSubmissions] = useState([]);
  const [selectedId, setSelectedId] = useState(null);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("All");
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);
  const [error, setError] = useState("");
  const [setupMessage, setSetupMessage] = useState("");
  const [mobileMenu, setMobileMenu] = useState(false);

  useEffect(() => {
    apiRequest("/api/admin/submissions")
      .then((result) => {
        setSubmissions(result.submissions);
        setSetupMessage(result.setupRequired || "");
      })
      .catch((requestError) => setError(requestError.message))
      .finally(() => setLoading(false));
  }, []);

  const selected = submissions.find((item) => item.id === selectedId) || null;

  const filtered = useMemo(() => {
    const needle = search.trim().toLowerCase();
    return submissions.filter((submission) => {
      const matchesStatus = statusFilter === "All" || submission.status === statusFilter;
      const haystack = [
        submission.formData.fullName,
        submission.formData.businessName,
        submission.formData.email,
        submission.formData.phone,
        submission.formData.websiteType,
      ]
        .join(" ")
        .toLowerCase();
      return matchesStatus && (!needle || haystack.includes(needle));
    });
  }, [search, statusFilter, submissions]);

  const stats = {
    total: submissions.length,
    new: submissions.filter((item) => item.status === "New").length,
    active: submissions.filter((item) => ["Contacted", "In Progress"].includes(item.status)).length,
    closed: submissions.filter((item) => item.status === "Closed").length,
  };

  const changeStatus = async (status) => {
    if (!selected) return;
    setUpdating(true);
    try {
      const result = await apiRequest(`/api/admin/submissions/${selected.id}`, {
        method: "PATCH",
        body: JSON.stringify({ status }),
      });
      setSubmissions((current) =>
        current.map((item) => (item.id === selected.id ? result.submission : item)),
      );
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setUpdating(false);
    }
  };

  const logout = async () => {
    await apiRequest("/api/admin/logout", { method: "POST", body: "{}" }).catch(() => {});
    onLogout();
  };

  return (
    <main className="min-h-screen bg-slate-100">
      <header className="sticky top-0 z-30 border-b border-slate-200 bg-white/95 backdrop-blur">
        <div className="mx-auto flex h-18 max-w-[1500px] items-center justify-between px-4 py-4 sm:px-7">
          <div className="flex items-center gap-3">
            <div className="grid h-10 w-10 place-items-center rounded-xl bg-violet-600 text-white">
              <LayoutDashboard size={20} />
            </div>
            <div>
              <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-violet-600">Website Intake</p>
              <h1 className="font-extrabold text-slate-900">Admin Dashboard</h1>
            </div>
          </div>
          <button
            type="button"
            onClick={() => setMobileMenu((current) => !current)}
            className="rounded-xl border border-slate-200 p-2 text-slate-600 sm:hidden"
          >
            <Menu size={20} />
          </button>
          <div className={`${mobileMenu ? "flex" : "hidden"} absolute left-4 right-4 top-16 flex-col gap-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-xl sm:static sm:flex sm:flex-row sm:items-center sm:border-0 sm:p-0 sm:shadow-none`}>
            <span className="text-sm font-semibold text-slate-500">Signed in as {username}</span>
            <a href="/" className="rounded-xl border border-slate-200 px-4 py-2 text-center text-xs font-bold text-slate-700">
              Public form
            </a>
            <button
              type="button"
              onClick={logout}
              className="flex items-center justify-center gap-2 rounded-xl bg-slate-900 px-4 py-2 text-xs font-bold text-white"
            >
              <LogOut size={15} />
              Logout
            </button>
          </div>
        </div>
      </header>

      <div className="mx-auto max-w-[1500px] px-4 py-6 sm:px-7 sm:py-8">
        <div className="mb-7">
          <p className="text-sm font-semibold text-violet-600">Good to see you, {username}.</p>
          <h2 className="mt-1 text-2xl font-extrabold tracking-tight text-slate-900 sm:text-3xl">
            Your website leads, all in one place.
          </h2>
        </div>

        {setupMessage && (
          <div className="mb-7 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm leading-6 text-amber-900">
            <p className="font-extrabold">Admin login successful. Storage setup is pending.</p>
            <p>{setupMessage}</p>
          </div>
        )}

        <div className="mb-7 grid grid-cols-2 gap-3 lg:grid-cols-4">
          {[
            ["Total responses", stats.total, Users, "bg-violet-100 text-violet-700"],
            ["New leads", stats.new, Sparkles, "bg-fuchsia-100 text-fuchsia-700"],
            ["Active", stats.active, Clock3, "bg-amber-100 text-amber-700"],
            ["Closed", stats.closed, CheckCircle2, "bg-emerald-100 text-emerald-700"],
          ].map(([label, value, Icon, color]) => (
            <div key={label} className="rounded-2xl border border-slate-200 bg-white p-4 sm:p-5">
              <div className={`mb-4 grid h-10 w-10 place-items-center rounded-xl ${color}`}>
                <Icon size={19} />
              </div>
              <p className="text-2xl font-extrabold text-slate-900">{value}</p>
              <p className="mt-1 text-xs font-semibold text-slate-500">{label}</p>
            </div>
          ))}
        </div>

        <section className="overflow-hidden rounded-3xl border border-slate-200 bg-white">
          <div className="border-b border-slate-200 p-4 sm:p-5">
            <div className="flex flex-col gap-3 sm:flex-row">
              <label className="relative flex-1">
                <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  placeholder="Search name, business, email or phone..."
                  className="w-full rounded-xl border border-slate-200 py-3 pl-11 pr-4 text-sm outline-none focus:border-violet-400 focus:ring-4 focus:ring-violet-100"
                />
              </label>
              <label className="relative">
                <Filter size={17} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
                <select
                  value={statusFilter}
                  onChange={(event) => setStatusFilter(event.target.value)}
                  className="w-full appearance-none rounded-xl border border-slate-200 py-3 pl-11 pr-10 text-sm font-semibold text-slate-700 outline-none sm:w-44"
                >
                  <option>All</option>
                  {Object.keys(statusStyles).map((status) => (
                    <option key={status}>{status}</option>
                  ))}
                </select>
              </label>
            </div>
          </div>

          {error && <p className="m-4 rounded-xl bg-rose-50 p-3 text-sm font-medium text-rose-700">{error}</p>}

          {loading ? (
            <div className="grid min-h-72 place-items-center">
              <Loader2 size={28} className="animate-spin text-violet-600" />
            </div>
          ) : filtered.length ? (
            <div className="divide-y divide-slate-100">
              {filtered.map((submission) => (
                <button
                  key={submission.id}
                  type="button"
                  onClick={() => setSelectedId(submission.id)}
                  className="grid w-full gap-4 p-4 text-left transition hover:bg-slate-50 sm:grid-cols-[1.4fr_1fr_0.8fr_auto] sm:items-center sm:px-5"
                >
                  <div className="flex min-w-0 items-center gap-3">
                    <div className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-violet-100 text-xs font-extrabold text-violet-700">
                      {initials(submission.formData.fullName)}
                    </div>
                    <div className="min-w-0">
                      <p className="truncate text-sm font-extrabold text-slate-900">{submission.formData.fullName}</p>
                      <p className="truncate text-xs text-slate-500">{submission.formData.businessName}</p>
                    </div>
                  </div>
                  <div>
                    <p className="text-xs font-bold text-slate-700">{submission.formData.websiteType}</p>
                    <p className="mt-1 text-xs text-slate-400">{submission.formData.budget}</p>
                  </div>
                  <div>
                    <span className={`inline-flex rounded-full px-3 py-1 text-[10px] font-extrabold ${statusStyles[submission.status]}`}>
                      {submission.status}
                    </span>
                    <p className="mt-2 text-[11px] text-slate-400">{formatDate(submission.createdAt)}</p>
                  </div>
                  <span className="flex items-center gap-1 text-xs font-bold text-violet-600">
                    <Eye size={16} />
                    View
                  </span>
                </button>
              ))}
            </div>
          ) : (
            <div className="grid min-h-72 place-items-center p-8 text-center">
              <div>
                <div className="mx-auto mb-4 grid h-14 w-14 place-items-center rounded-2xl bg-slate-100 text-slate-400">
                  <FileText size={24} />
                </div>
                <p className="font-extrabold text-slate-800">No responses found</p>
                <p className="mt-1 text-sm text-slate-400">New form submissions will appear here.</p>
              </div>
            </div>
          )}
        </section>
      </div>

      <DetailPanel
        submission={selected}
        onClose={() => setSelectedId(null)}
        onStatusChange={changeStatus}
        updating={updating}
      />
    </main>
  );
}

function AdminApp() {
  const [checking, setChecking] = useState(true);
  const [username, setUsername] = useState("");

  useEffect(() => {
    apiRequest("/api/admin/session")
      .then((result) => setUsername(result.username))
      .catch(() => setUsername(""))
      .finally(() => setChecking(false));
  }, []);

  if (checking) {
    return (
      <main className="grid min-h-screen place-items-center bg-slate-950">
        <Loader2 size={30} className="animate-spin text-violet-400" />
      </main>
    );
  }

  if (!username) {
    return <LoginScreen onLogin={setUsername} />;
  }

  return <Dashboard username={username} onLogout={() => setUsername("")} />;
}

export default AdminApp;

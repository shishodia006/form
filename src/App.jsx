import { useMemo, useState } from "react";
import { upload } from "@vercel/blob/client";
import {
  ArrowLeft,
  ArrowRight,
  AlertCircle,
  BadgeCheck,
  BriefcaseBusiness,
  Check,
  CheckCircle2,
  ChevronRight,
  Clock3,
  FileText,
  Globe2,
  LayoutGrid,
  Loader2,
  MessageCircle,
  Phone,
  Rocket,
  ShieldCheck,
  Sparkles,
  Target,
  Trash2,
  UploadCloud,
  Users,
  X,
} from "lucide-react";

const ADMIN_WHATSAPP_NUMBER = import.meta.env.VITE_ADMIN_WHATSAPP_NUMBER?.replace(/\D/g, "");
const MAX_FILE_SIZE = 5 * 1024 * 1024;
const MAX_TOTAL_UPLOAD_SIZE = 10 * 1024 * 1024;
const MAX_PROJECT_FILES = 3;

const steps = [
  { title: "Brand Basics", eyebrow: "Tell us who you are" },
  { title: "Business & Goals", eyebrow: "Define your direction" },
  { title: "Pages & Features", eyebrow: "Shape the experience" },
  { title: "Style & Brand", eyebrow: "Set the visual mood" },
  { title: "Budget & Timeline", eyebrow: "Plan the launch" },
  { title: "Review & Submit", eyebrow: "One final check" },
];

const initialData = {
  fullName: "",
  businessName: "",
  phone: "",
  email: "",
  websiteType: "",
  businessDescription: "",
  targetAudience: "",
  primaryGoal: "",
  uniqueValue: "",
  tone: [],
  pages: ["Home", "About", "Contact"],
  features: [],
  inspiration: "",
  brandStyle: "",
  primaryColor: "#7c3aed",
  hasLogo: "",
  designNotes: "",
  budget: "",
  timeline: "",
  contentReady: "",
  launchDate: "",
  finalNotes: "",
};

const websiteTypes = [
  "Business / Corporate",
  "E-commerce Store",
  "Portfolio",
  "Landing Page",
  "Blog / Publication",
  "Booking / Service",
];

const tones = ["Professional", "Friendly", "Bold", "Luxury", "Minimal", "Playful"];
const pages = ["Home", "About", "Services", "Products", "Portfolio", "Blog", "Contact", "FAQ"];
const features = [
  "WhatsApp Chat",
  "Contact Forms",
  "Online Payments",
  "Appointment Booking",
  "User Login",
  "Multilingual",
  "Blog / CMS",
  "Analytics",
];
const brandStyles = [
  { name: "Clean & Minimal", detail: "Calm, spacious, focused" },
  { name: "Bold & Modern", detail: "Energetic, sharp, confident" },
  { name: "Premium & Elegant", detail: "Refined, polished, timeless" },
  { name: "Warm & Friendly", detail: "Human, inviting, approachable" },
];

function TextField({ label, error, className = "", ...props }) {
  return (
    <label className={`block ${className}`}>
      <span className="field-label">{label}</span>
      <input className={`input-field ${error ? "border-rose-400 ring-4 ring-rose-50" : ""}`} {...props} />
      {error && <span className="mt-1.5 block text-xs font-medium text-rose-600">{error}</span>}
    </label>
  );
}

function TextArea({ label, error, className = "", ...props }) {
  return (
    <label className={`block ${className}`}>
      <span className="field-label">{label}</span>
      <textarea
        className={`input-field min-h-28 resize-y ${error ? "border-rose-400 ring-4 ring-rose-50" : ""}`}
        {...props}
      />
      {error && <span className="mt-1.5 block text-xs font-medium text-rose-600">{error}</span>}
    </label>
  );
}

function SelectField({ label, error, children, className = "", ...props }) {
  return (
    <label className={`block ${className}`}>
      <span className="field-label">{label}</span>
      <select
        className={`input-field appearance-none ${error ? "border-rose-400 ring-4 ring-rose-50" : ""}`}
        {...props}
      >
        {children}
      </select>
      {error && <span className="mt-1.5 block text-xs font-medium text-rose-600">{error}</span>}
    </label>
  );
}

function Choice({ active, children, onClick, type = "button" }) {
  return (
    <button
      type={type}
      onClick={onClick}
      className={`choice-card text-left ${active ? "choice-card-active" : ""}`}
    >
      <span
        className={`grid h-5 w-5 shrink-0 place-items-center rounded-full border ${
          active ? "border-violet-600 bg-violet-600 text-white" : "border-slate-300 bg-white"
        }`}
      >
        {active && <Check size={13} strokeWidth={3} />}
      </span>
      {children}
    </button>
  );
}

function FileUpload({ label, hint, files, multiple = false, onChange, onRemove, error }) {
  const inputId = label.toLowerCase().replace(/[^a-z0-9]+/g, "-");

  return (
    <div>
      <span className="field-label">{label}</span>
      <label
        htmlFor={inputId}
        className={`flex cursor-pointer flex-col items-center justify-center rounded-2xl border border-dashed px-5 py-7 text-center transition hover:border-violet-400 hover:bg-violet-50 ${
          error ? "border-rose-400 bg-rose-50" : "border-slate-300 bg-slate-50/70"
        }`}
      >
        <span className="mb-3 grid h-11 w-11 place-items-center rounded-2xl bg-white text-violet-600 shadow-sm">
          <UploadCloud size={21} />
        </span>
        <span className="text-sm font-bold text-slate-800">Choose {multiple ? "files" : "a file"}</span>
        <span className="mt-1 text-xs leading-5 text-slate-500">{hint}</span>
        <input
          id={inputId}
          type="file"
          multiple={multiple}
          accept="image/*,.pdf,.doc,.docx,.ppt,.pptx,.xls,.xlsx,.txt"
          onChange={onChange}
          className="sr-only"
        />
      </label>

      {files.length > 0 && (
        <div className="mt-3 space-y-2">
          {files.map((file, index) => (
            <div
              key={`${file.name}-${file.lastModified}`}
              className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-white px-4 py-3"
            >
              <FileText size={18} className="shrink-0 text-violet-600" />
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-semibold text-slate-700">{file.name}</p>
                <p className="text-xs text-slate-400">{(file.size / 1024 / 1024).toFixed(2)} MB</p>
              </div>
              <button
                type="button"
                onClick={() => onRemove(index)}
                aria-label={`Remove ${file.name}`}
                className="rounded-xl p-2 text-slate-400 transition hover:bg-rose-50 hover:text-rose-600"
              >
                <Trash2 size={17} />
              </button>
            </div>
          ))}
        </div>
      )}
      {error && <span className="mt-1.5 block text-xs font-medium text-rose-600">{error}</span>}
    </div>
  );
}

function TermsModal({ open, agreed, submitting, submitError, onAgree, onClose, onSubmit }) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-slate-950/50 p-0 backdrop-blur-sm sm:items-center sm:p-5">
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="terms-title"
        className="w-full overflow-hidden rounded-t-[28px] bg-white shadow-2xl sm:max-w-xl sm:rounded-[28px]"
      >
        <div className="flex items-start justify-between border-b border-slate-100 px-5 py-5 sm:px-7">
          <div>
            <p className="mb-1 text-[10px] font-bold uppercase tracking-[0.16em] text-violet-600">Final step</p>
            <h2 id="terms-title" className="text-xl font-extrabold tracking-tight text-slate-900">
              Terms & Conditions
            </h2>
          </div>
          <button
            type="button"
            disabled={submitting}
            onClick={onClose}
            aria-label="Close terms"
            className="rounded-full p-2 text-slate-500 transition hover:bg-slate-100 hover:text-slate-900 disabled:opacity-40"
          >
            <X size={20} />
          </button>
        </div>

        <div className="max-h-[48vh] space-y-4 overflow-y-auto px-5 py-5 text-sm leading-6 text-slate-600 sm:max-h-[44vh] sm:px-7">
          <p>
            By submitting this form, you confirm that the information provided is accurate and may be used to
            understand, scope, and discuss your website project.
          </p>
          <div>
            <h3 className="mb-1 font-bold text-slate-800">Project scope</h3>
            <p>
              This intake is for requirement collection only. Final pricing, timelines, deliverables, and revisions
              will be confirmed separately before work begins.
            </p>
          </div>
          <div>
            <h3 className="mb-1 font-bold text-slate-800">Communication</h3>
            <p>
              After submission, you will be redirected to WhatsApp with a pre-filled summary. No message is sent
              until you review and send it yourself.
            </p>
          </div>
          <div>
            <h3 className="mb-1 font-bold text-slate-800">Privacy</h3>
            <p>
              Your details should only be used for project communication. Do not include passwords, payment details,
              or other sensitive credentials in this form.
            </p>
          </div>
          <div>
            <h3 className="mb-1 font-bold text-slate-800">Secure storage</h3>
            <p>
              Your responses and attached files will be stored securely and will only be visible inside the protected
              admin dashboard.
            </p>
          </div>
        </div>

        <div className="border-t border-slate-100 bg-slate-50 px-5 py-5 sm:px-7">
          <label className="mb-4 flex cursor-pointer items-start gap-3 rounded-2xl border border-slate-200 bg-white p-4">
            <input
              type="checkbox"
              disabled={submitting}
              checked={agreed}
              onChange={(event) => onAgree(event.target.checked)}
              className="mt-0.5 h-5 w-5 rounded border-slate-300 text-violet-600 accent-violet-600"
            />
            <span className="text-sm font-medium leading-5 text-slate-700">
              I have read and agree to the Terms & Conditions.
            </span>
          </label>
          {submitError && (
            <div className="mb-4 flex gap-3 rounded-2xl border border-rose-200 bg-rose-50 p-4 text-sm leading-5 text-rose-700">
              <AlertCircle size={18} className="mt-0.5 shrink-0" />
              {submitError}
            </div>
          )}
          <button
            type="button"
            disabled={!agreed || submitting}
            onClick={onSubmit}
            className="flex w-full items-center justify-center gap-2 rounded-2xl bg-violet-600 px-5 py-4 text-sm font-bold text-white shadow-button transition hover:bg-violet-700 disabled:cursor-not-allowed disabled:bg-slate-300 disabled:shadow-none"
          >
            {submitting ? (
              <>
                Saving securely...
                <Loader2 size={18} className="animate-spin" />
              </>
            ) : (
              <>
                Accept & Submit
                <CheckCircle2 size={18} />
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}

function fileToPayload(file, category) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = String(reader.result);
      resolve({
        name: file.name,
        mimeType: file.type || "application/octet-stream",
        size: file.size,
        category,
        data: result.includes(",") ? result.split(",")[1] : result,
      });
    };
    reader.onerror = () => reject(new Error(`Could not read ${file.name}.`));
    reader.readAsDataURL(file);
  });
}

function App() {
  const [step, setStep] = useState(0);
  const [data, setData] = useState(initialData);
  const [logoFile, setLogoFile] = useState(null);
  const [projectFiles, setProjectFiles] = useState([]);
  const [errors, setErrors] = useState({});
  const [termsOpen, setTermsOpen] = useState(false);
  const [agreed, setAgreed] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [redirecting, setRedirecting] = useState(false);

  const progress = ((step + 1) / steps.length) * 100;

  const updateField = (field, value) => {
    setData((current) => ({ ...current, [field]: value }));
    setErrors((current) => ({ ...current, [field]: "" }));
  };

  const toggleListValue = (field, value) => {
    setData((current) => {
      const exists = current[field].includes(value);
      return {
        ...current,
        [field]: exists ? current[field].filter((item) => item !== value) : [...current[field], value],
      };
    });
    setErrors((current) => ({ ...current, [field]: "" }));
  };

  const validateSelectedFiles = (files, maximumFiles, existingSizeOverride) => {
    if (files.length > maximumFiles) {
      return `You can upload up to ${maximumFiles} file${maximumFiles > 1 ? "s" : ""}.`;
    }
    if (files.some((file) => file.size > MAX_FILE_SIZE)) {
      return "Each file must be 5 MB or smaller.";
    }

    const existingSize =
      existingSizeOverride ??
      (logoFile?.size || 0) + projectFiles.reduce((total, file) => total + file.size, 0);
    const selectedSize = files.reduce((total, file) => total + file.size, 0);
    if (existingSize + selectedSize > MAX_TOTAL_UPLOAD_SIZE) {
      return "Total uploads must be 10 MB or smaller.";
    }
    return "";
  };

  const selectLogoFile = (event) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;

    const projectFilesSize = projectFiles.reduce((total, projectFile) => total + projectFile.size, 0);
    const fileError = validateSelectedFiles([file], 1, projectFilesSize);
    if (fileError) {
      setErrors((current) => ({ ...current, logoFile: fileError }));
      return;
    }

    setLogoFile(file);
    setErrors((current) => ({ ...current, logoFile: "" }));
  };

  const selectProjectFiles = (event) => {
    const files = Array.from(event.target.files || []);
    event.target.value = "";
    if (!files.length) return;

    const combinedFiles = [...projectFiles, ...files];
    const fileError = validateSelectedFiles(files, MAX_PROJECT_FILES - projectFiles.length);
    if (fileError || combinedFiles.length > MAX_PROJECT_FILES) {
      setErrors((current) => ({
        ...current,
        projectFiles: fileError || `You can upload up to ${MAX_PROJECT_FILES} files.`,
      }));
      return;
    }

    setProjectFiles(combinedFiles);
    setErrors((current) => ({ ...current, projectFiles: "" }));
  };

  const validationByStep = useMemo(
    () => [
      {
        fullName: data.fullName.trim() ? "" : "Please enter your name.",
        businessName: data.businessName.trim() ? "" : "Please enter your business name.",
        phone: /^\d{10}$/.test(data.phone.replace(/\D/g, "")) ? "" : "Enter a valid 10-digit WhatsApp number.",
        email: /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.email) ? "" : "Enter a valid email address.",
        websiteType: data.websiteType ? "" : "Please select a website type.",
      },
      {
        businessDescription: data.businessDescription.trim() ? "" : "Tell us briefly about your business.",
        targetAudience: data.targetAudience.trim() ? "" : "Please describe your ideal audience.",
        primaryGoal: data.primaryGoal ? "" : "Choose one primary goal.",
      },
      {
        pages: data.pages.length ? "" : "Choose at least one page.",
        features: data.features.length ? "" : "Choose at least one feature.",
      },
      {
        brandStyle: data.brandStyle ? "" : "Choose a visual direction.",
        hasLogo: data.hasLogo ? "" : "Let us know whether you have a logo.",
        logoFile:
          data.hasLogo !== "Yes, ready to use" || logoFile ? "" : "Please upload your ready-to-use logo file.",
      },
      {
        budget: data.budget ? "" : "Choose an estimated budget.",
        timeline: data.timeline ? "" : "Choose a target timeline.",
        contentReady: data.contentReady ? "" : "Select your content status.",
      },
      {},
    ],
    [data, logoFile],
  );

  const validateStep = () => {
    const currentErrors = Object.fromEntries(
      Object.entries(validationByStep[step]).filter(([, message]) => message),
    );
    setErrors(currentErrors);
    return Object.keys(currentErrors).length === 0;
  };

  const goNext = () => {
    if (!validateStep()) return;
    setStep((current) => Math.min(current + 1, steps.length - 1));
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const goBack = () => {
    setErrors({});
    setStep((current) => Math.max(current - 1, 0));
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const whatsappUrl = useMemo(() => {
    const message = [
      `Hi, a new website requirement form has been submitted.`,
      ``,
      `Name: ${data.fullName}`,
      `Business: ${data.businessName}`,
      `Customer WhatsApp: +91 ${data.phone}`,
      `Email: ${data.email}`,
      `Website: ${data.websiteType}`,
      `Goal: ${data.primaryGoal}`,
      `Pages: ${data.pages.join(", ")}`,
      `Features: ${data.features.join(", ")}`,
      `Budget: ${data.budget}`,
      `Timeline: ${data.timeline}`,
      ``,
      `Please review the requirements and contact the customer for the next steps.`,
    ].join("\n");
    return ADMIN_WHATSAPP_NUMBER
      ? `https://wa.me/${ADMIN_WHATSAPP_NUMBER}?text=${encodeURIComponent(message)}`
      : "";
  }, [data]);

  const submitForm = async () => {
    if (!ADMIN_WHATSAPP_NUMBER) {
      setSubmitError(
        "Admin WhatsApp number is not configured yet. Add VITE_ADMIN_WHATSAPP_NUMBER to your .env.local file.",
      );
      return;
    }

    setSubmitting(true);
    setSubmitError("");

    try {
      const submissionId = crypto.randomUUID();
      const formData = {
        ...data,
        phone: `+91${data.phone.replace(/\D/g, "")}`,
        termsAccepted: true,
        submittedAt: new Date().toISOString(),
      };
      const selectedFiles = [
        ...(logoFile ? [{ file: logoFile, category: "Logo" }] : []),
        ...projectFiles.map((file) => ({ file, category: "Project file" })),
      ];
      let uploads = [];
      let uploadTicket = "";

      if (selectedFiles.length) {
        const authorizeResponse = await fetch("/api/uploads/authorize", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            submissionId,
            formData,
            files: selectedFiles.map(({ file, category }) => ({
              name: file.name,
              mimeType: file.type || "application/octet-stream",
              size: file.size,
              category,
            })),
          }),
        });
        const authorization = await authorizeResponse.json().catch(() => ({}));
        if (!authorizeResponse.ok || authorization.ok !== true) {
          throw new Error(authorization.error || "Could not prepare the file upload.");
        }

        if (authorization.mode === "blob") {
          uploadTicket = authorization.ticket;
          uploads = await Promise.all(
            authorization.uploads.map(async (descriptor, index) => {
              const selected = selectedFiles[index];
              const blob = await upload(descriptor.pathname, selected.file, {
                access: "private",
                handleUploadUrl: "/api/uploads",
                clientPayload: JSON.stringify({ ticket: uploadTicket }),
                contentType: descriptor.mimeType,
              });
              return {
                ...descriptor,
                pathname: blob.pathname,
                blobUrl: blob.url,
              };
            }),
          );
        } else {
          uploads = await Promise.all(
            selectedFiles.map(({ file, category }) => fileToPayload(file, category)),
          );
        }
      }

      const payload = {
        submissionId,
        uploadTicket,
        formData,
        files: uploads,
        meta: {
          sourceUrl: window.location.href,
          timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
        },
      };

      const response = await fetch("/api/submissions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const result = await response.json().catch(() => ({}));
      if (!response.ok || result.ok !== true) {
        throw new Error(result.error || "Could not save your response. Please try again.");
      }

      setTermsOpen(false);
      setSubmitted(true);
      setRedirecting(true);
      window.setTimeout(() => {
        window.location.assign(whatsappUrl);
      }, 2800);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Submission failed. Please try again.";
      setSubmitError(message);
    } finally {
      setSubmitting(false);
    }
  };

  if (submitted) {
    return (
      <main className="relative grid min-h-screen place-items-center overflow-hidden bg-[#f8f5fc] px-5 py-10">
        <div className="absolute -left-32 top-10 h-80 w-80 rounded-full bg-cyan-200/40 blur-3xl" />
        <div className="absolute -right-24 bottom-0 h-96 w-96 rounded-full bg-fuchsia-200/45 blur-3xl" />
        <section className="relative w-full max-w-lg rounded-[32px] border border-white bg-white/90 p-7 text-center shadow-card backdrop-blur sm:p-11">
          <div className="mx-auto mb-6 grid h-20 w-20 place-items-center rounded-full bg-emerald-50 text-emerald-600">
            <CheckCircle2 size={42} strokeWidth={2.2} />
          </div>
          <p className="mb-2 text-xs font-bold uppercase tracking-[0.18em] text-violet-600">Form submitted</p>
          <h1 className="text-3xl font-extrabold tracking-tight text-slate-900 sm:text-4xl">
            Thank you, {data.fullName.split(" ")[0]}!
          </h1>
          <p className="mx-auto mt-4 max-w-md text-sm leading-6 text-slate-600 sm:text-base">
            Your requirements and files were saved securely. We are opening WhatsApp so you can review and send the
            summary.
          </p>
          <div className="mt-7 flex items-center justify-center gap-2 rounded-2xl bg-violet-50 px-4 py-3 text-sm font-semibold text-violet-700">
            <MessageCircle size={18} />
            {redirecting ? "Redirecting to WhatsApp..." : "WhatsApp is ready"}
          </div>
          <a
            href={whatsappUrl}
            className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-violet-600 px-5 py-4 text-sm font-bold text-white shadow-button transition hover:bg-violet-700"
          >
            Open WhatsApp now
            <ArrowRight size={18} />
          </a>
        </section>
      </main>
    );
  }

  return (
    <main className="relative min-h-screen overflow-hidden bg-[#f8f5fc]">
      <div className="pointer-events-none absolute -left-40 top-20 h-[460px] w-[460px] rounded-full bg-cyan-200/35 blur-3xl" />
      <div className="pointer-events-none absolute -right-32 bottom-0 h-[520px] w-[520px] rounded-full bg-fuchsia-200/40 blur-3xl" />

      <div className="relative mx-auto grid min-h-screen max-w-[1440px] lg:grid-cols-[0.9fr_1.1fr]">
        <section className="hidden items-center px-10 py-14 lg:flex xl:px-20">
          <div className="max-w-xl">
            <div className="mb-8 inline-flex items-center gap-2 rounded-full border border-white bg-white/75 px-4 py-2 text-xs font-bold text-violet-700 shadow-sm backdrop-blur">
              <Sparkles size={15} />
              Smart website planning
            </div>
            <h1 className="text-6xl font-extrabold leading-[0.98] tracking-[-0.055em] text-slate-900 xl:text-7xl">
              Your idea.
              <span className="mt-2 block text-violet-600">Clearly defined.</span>
            </h1>
            <p className="mt-7 max-w-lg text-lg leading-8 text-slate-600">
              Answer a few focused questions so we can understand your brand, goals, content, and ideal website
              experience.
            </p>

            <div className="mt-10 grid max-w-lg grid-cols-3 gap-3">
              {[
                { icon: Clock3, value: "5 min", label: "Quick intake" },
                { icon: Target, value: "6 steps", label: "Clear scope" },
                { icon: ShieldCheck, value: "Private", label: "Your details" },
              ].map(({ icon: Icon, value, label }) => (
                <div key={value} className="rounded-2xl border border-white bg-white/80 p-4 shadow-sm backdrop-blur">
                  <Icon size={19} className="mb-3 text-violet-600" />
                  <p className="text-base font-extrabold text-slate-900">{value}</p>
                  <p className="mt-0.5 text-[11px] font-medium text-slate-500">{label}</p>
                </div>
              ))}
            </div>

            <div className="mt-10 flex items-center gap-3 text-sm font-medium text-slate-500">
              <div className="flex -space-x-2">
                {["AS", "NK", "RM"].map((initials, index) => (
                  <span
                    key={initials}
                    className={`grid h-9 w-9 place-items-center rounded-full border-2 border-white text-[10px] font-bold text-white ${
                      ["bg-violet-500", "bg-sky-500", "bg-fuchsia-500"][index]
                    }`}
                  >
                    {initials}
                  </span>
                ))}
              </div>
              Built for thoughtful project conversations.
            </div>
          </div>
        </section>

        <section className="flex min-h-screen items-stretch justify-center p-0 sm:p-5 lg:items-center lg:px-8 lg:py-10">
          <div className="flex w-full max-w-3xl flex-col bg-white shadow-card sm:min-h-[780px] sm:rounded-[32px] lg:h-[min(860px,calc(100vh-80px))] lg:min-h-[680px]">
            <div className="px-5 pt-6 sm:px-9 sm:pt-8">
              <div className="mb-6 h-1.5 overflow-hidden rounded-full bg-slate-100">
                <div
                  className="h-full rounded-full bg-violet-600 transition-all duration-500"
                  style={{ width: `${progress}%` }}
                />
              </div>
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="mb-2 text-[10px] font-bold uppercase tracking-[0.17em] text-violet-600">
                    Website strategy intake
                  </p>
                  <h2 className="text-xl font-extrabold tracking-tight text-slate-900 sm:text-2xl">
                    {steps[step].title}
                  </h2>
                  <p className="mt-1 text-xs text-slate-500">{steps[step].eyebrow}</p>
                </div>
                <span className="shrink-0 rounded-full bg-slate-100 px-3 py-1.5 text-xs font-bold text-slate-600">
                  {step + 1} / {steps.length}
                </span>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto px-5 py-7 sm:px-9 sm:py-8">
              {step === 0 && (
                <div className="grid gap-5 sm:grid-cols-2">
                  <TextField
                    label="Your name *"
                    value={data.fullName}
                    onChange={(event) => updateField("fullName", event.target.value)}
                    placeholder="e.g. Aman Sharma"
                    error={errors.fullName}
                  />
                  <TextField
                    label="Business / Brand name *"
                    value={data.businessName}
                    onChange={(event) => updateField("businessName", event.target.value)}
                    placeholder="e.g. Northstar Studio"
                    error={errors.businessName}
                  />
                  <label className="block">
                    <span className="field-label">WhatsApp number *</span>
                    <div
                      className={`flex overflow-hidden rounded-2xl border bg-white transition focus-within:border-violet-400 focus-within:ring-4 focus-within:ring-violet-100 ${
                        errors.phone ? "border-rose-400 ring-4 ring-rose-50" : "border-slate-200"
                      }`}
                    >
                      <span className="flex items-center border-r border-slate-200 bg-slate-50 px-3 text-sm font-semibold text-slate-600">
                        +91
                      </span>
                      <input
                        type="tel"
                        inputMode="numeric"
                        maxLength={10}
                        value={data.phone}
                        onChange={(event) => updateField("phone", event.target.value.replace(/\D/g, "").slice(0, 10))}
                        placeholder="98765 43210"
                        className="min-w-0 flex-1 px-4 py-3.5 text-sm outline-none placeholder:text-slate-400"
                      />
                    </div>
                    {errors.phone && <span className="mt-1.5 block text-xs font-medium text-rose-600">{errors.phone}</span>}
                  </label>
                  <TextField
                    label="Email address *"
                    type="email"
                    value={data.email}
                    onChange={(event) => updateField("email", event.target.value)}
                    placeholder="you@company.com"
                    error={errors.email}
                  />
                  <SelectField
                    label="What kind of website do you need? *"
                    value={data.websiteType}
                    onChange={(event) => updateField("websiteType", event.target.value)}
                    error={errors.websiteType}
                    className="sm:col-span-2"
                  >
                    <option value="">Select website type</option>
                    {websiteTypes.map((type) => (
                      <option key={type} value={type}>
                        {type}
                      </option>
                    ))}
                  </SelectField>
                  <div className="sm:col-span-2 rounded-2xl border border-violet-100 bg-violet-50 p-4">
                    <div className="flex gap-3">
                      <div className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-white text-violet-600 shadow-sm">
                        <Phone size={18} />
                      </div>
                      <div>
                        <p className="text-sm font-bold text-slate-800">We will continue on WhatsApp</p>
                        <p className="mt-1 text-xs leading-5 text-slate-500">
                          Your answers will be prepared as a message for the number entered above.
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {step === 1 && (
                <div className="space-y-6">
                  <TextArea
                    label="What does your business do? *"
                    value={data.businessDescription}
                    onChange={(event) => updateField("businessDescription", event.target.value)}
                    placeholder="Describe your products, services, and the problem you solve..."
                    error={errors.businessDescription}
                  />
                  <TextArea
                    label="Who is your ideal customer? *"
                    value={data.targetAudience}
                    onChange={(event) => updateField("targetAudience", event.target.value)}
                    placeholder="Age group, location, interests, industry, or customer type..."
                    error={errors.targetAudience}
                  />
                  <div>
                    <span className="field-label">Primary website goal *</span>
                    <div className="grid gap-3 sm:grid-cols-2">
                      {[
                        ["Generate leads", Target],
                        ["Sell online", BriefcaseBusiness],
                        ["Build credibility", BadgeCheck],
                        ["Share information", Globe2],
                      ].map(([goal, Icon]) => (
                        <Choice key={goal} active={data.primaryGoal === goal} onClick={() => updateField("primaryGoal", goal)}>
                          <Icon size={17} className="text-violet-600" />
                          {goal}
                        </Choice>
                      ))}
                    </div>
                    {errors.primaryGoal && (
                      <span className="mt-1.5 block text-xs font-medium text-rose-600">{errors.primaryGoal}</span>
                    )}
                  </div>
                  <TextArea
                    label="What makes you different?"
                    value={data.uniqueValue}
                    onChange={(event) => updateField("uniqueValue", event.target.value)}
                    placeholder="Your unique offer, approach, experience, or advantage..."
                  />
                  <div>
                    <span className="field-label">Desired brand tone</span>
                    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                      {tones.map((tone) => (
                        <Choice key={tone} active={data.tone.includes(tone)} onClick={() => toggleListValue("tone", tone)}>
                          {tone}
                        </Choice>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {step === 2 && (
                <div className="space-y-7">
                  <div>
                    <span className="field-label">Pages you need *</span>
                    <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                      {pages.map((page) => (
                        <Choice key={page} active={data.pages.includes(page)} onClick={() => toggleListValue("pages", page)}>
                          {page}
                        </Choice>
                      ))}
                    </div>
                    {errors.pages && <span className="mt-1.5 block text-xs font-medium text-rose-600">{errors.pages}</span>}
                  </div>
                  <div>
                    <span className="field-label">Features & integrations *</span>
                    <div className="grid gap-3 sm:grid-cols-2">
                      {features.map((feature) => (
                        <Choice
                          key={feature}
                          active={data.features.includes(feature)}
                          onClick={() => toggleListValue("features", feature)}
                        >
                          {feature}
                        </Choice>
                      ))}
                    </div>
                    {errors.features && (
                      <span className="mt-1.5 block text-xs font-medium text-rose-600">{errors.features}</span>
                    )}
                  </div>
                  <TextArea
                    label="Reference websites"
                    value={data.inspiration}
                    onChange={(event) => updateField("inspiration", event.target.value)}
                    placeholder="Paste links you like and mention what stands out..."
                  />
                </div>
              )}

              {step === 3 && (
                <div className="space-y-7">
                  <div>
                    <span className="field-label">Choose a visual direction *</span>
                    <div className="grid gap-3 sm:grid-cols-2">
                      {brandStyles.map((style, index) => (
                        <button
                          type="button"
                          key={style.name}
                          onClick={() => updateField("brandStyle", style.name)}
                          className={`rounded-2xl border p-4 text-left transition ${
                            data.brandStyle === style.name
                              ? "border-violet-500 bg-violet-50 ring-2 ring-violet-100"
                              : "border-slate-200 hover:border-violet-300"
                          }`}
                        >
                          <div
                            className={`mb-4 h-12 rounded-xl ${
                              [
                                "bg-slate-100",
                                "bg-slate-900",
                                "bg-amber-100",
                                "bg-rose-100",
                              ][index]
                            }`}
                          />
                          <p className="text-sm font-bold text-slate-800">{style.name}</p>
                          <p className="mt-1 text-xs text-slate-500">{style.detail}</p>
                        </button>
                      ))}
                    </div>
                    {errors.brandStyle && (
                      <span className="mt-1.5 block text-xs font-medium text-rose-600">{errors.brandStyle}</span>
                    )}
                  </div>

                  <label className="block">
                    <span className="field-label">Preferred primary color</span>
                    <div className="flex items-center gap-3 rounded-2xl border border-slate-200 p-3">
                      <input
                        type="color"
                        value={data.primaryColor}
                        onChange={(event) => updateField("primaryColor", event.target.value)}
                        className="h-11 w-14 cursor-pointer rounded-xl border-0 bg-transparent"
                      />
                      <div>
                        <p className="text-sm font-bold text-slate-800">{data.primaryColor.toUpperCase()}</p>
                        <p className="text-xs text-slate-500">Tap the swatch to change</p>
                      </div>
                    </div>
                  </label>

                  <div>
                    <span className="field-label">Do you already have a logo? *</span>
                    <div className="grid grid-cols-2 gap-3">
                      {["Yes, ready to use", "No, I need one"].map((option) => (
                        <Choice
                          key={option}
                          active={data.hasLogo === option}
                          onClick={() => {
                            updateField("hasLogo", option);
                            if (option === "No, I need one") {
                              setLogoFile(null);
                              setErrors((current) => ({ ...current, logoFile: "" }));
                            }
                          }}
                        >
                          {option}
                        </Choice>
                      ))}
                    </div>
                    {errors.hasLogo && (
                      <span className="mt-1.5 block text-xs font-medium text-rose-600">{errors.hasLogo}</span>
                    )}
                  </div>

                  {data.hasLogo === "Yes, ready to use" && (
                    <FileUpload
                      label="Upload logo file *"
                      hint="PNG, JPG, SVG, PDF, or source document. Maximum 5 MB."
                      files={logoFile ? [logoFile] : []}
                      onChange={selectLogoFile}
                      onRemove={() => {
                        setLogoFile(null);
                        setErrors((current) => ({ ...current, logoFile: "" }));
                      }}
                      error={errors.logoFile}
                    />
                  )}

                  <TextArea
                    label="Design notes"
                    value={data.designNotes}
                    onChange={(event) => updateField("designNotes", event.target.value)}
                    placeholder="Colors to avoid, visual preferences, animations, or any special ideas..."
                  />
                </div>
              )}

              {step === 4 && (
                <div className="space-y-7">
                  <div>
                    <span className="field-label">Estimated budget *</span>
                    <div className="grid gap-3 sm:grid-cols-2">
                      {["₹15k – ₹30k", "₹30k – ₹60k", "₹60k – ₹1L", "₹1L+"].map((option) => (
                        <Choice key={option} active={data.budget === option} onClick={() => updateField("budget", option)}>
                          {option}
                        </Choice>
                      ))}
                    </div>
                    {errors.budget && <span className="mt-1.5 block text-xs font-medium text-rose-600">{errors.budget}</span>}
                  </div>
                  <div>
                    <span className="field-label">Ideal launch timeline *</span>
                    <div className="grid gap-3 sm:grid-cols-2">
                      {["1–2 weeks", "3–4 weeks", "1–2 months", "Flexible"].map((option) => (
                        <Choice key={option} active={data.timeline === option} onClick={() => updateField("timeline", option)}>
                          {option}
                        </Choice>
                      ))}
                    </div>
                    {errors.timeline && (
                      <span className="mt-1.5 block text-xs font-medium text-rose-600">{errors.timeline}</span>
                    )}
                  </div>
                  <div>
                    <span className="field-label">Is your website content ready? *</span>
                    <div className="grid gap-3 sm:grid-cols-3">
                      {["Yes, all ready", "Partially ready", "Need help"].map((option) => (
                        <Choice
                          key={option}
                          active={data.contentReady === option}
                          onClick={() => updateField("contentReady", option)}
                        >
                          {option}
                        </Choice>
                      ))}
                    </div>
                    {errors.contentReady && (
                      <span className="mt-1.5 block text-xs font-medium text-rose-600">{errors.contentReady}</span>
                    )}
                  </div>
                  <TextField
                    label="Target launch date (optional)"
                    type="date"
                    value={data.launchDate}
                    onChange={(event) => updateField("launchDate", event.target.value)}
                  />
                  <TextArea
                    label="Anything else we should know?"
                    value={data.finalNotes}
                    onChange={(event) => updateField("finalNotes", event.target.value)}
                    placeholder="Special requirements, deadlines, concerns, or questions..."
                  />
                  <FileUpload
                    label="Supporting files (optional)"
                    hint="Upload up to 3 images, PDFs, presentations, or content documents. 10 MB total."
                    files={projectFiles}
                    multiple
                    onChange={selectProjectFiles}
                    onRemove={(index) => {
                      setProjectFiles((current) => current.filter((_, fileIndex) => fileIndex !== index));
                      setErrors((current) => ({ ...current, projectFiles: "" }));
                    }}
                    error={errors.projectFiles}
                  />
                </div>
              )}

              {step === 5 && (
                <div className="space-y-5">
                  <div className="rounded-3xl border border-violet-100 bg-violet-50 p-5">
                    <div className="flex items-start gap-3">
                      <div className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-white text-violet-600 shadow-sm">
                        <Rocket size={21} />
                      </div>
                      <div>
                        <h3 className="font-extrabold text-slate-900">Ready for review</h3>
                        <p className="mt-1 text-sm leading-6 text-slate-600">
                          Check your key project details below. You can go back to make changes before submitting.
                        </p>
                      </div>
                    </div>
                  </div>

                  {[
                    {
                      icon: Users,
                      title: "Contact",
                      lines: [data.fullName, data.businessName, `+91 ${data.phone}`, data.email],
                    },
                    {
                      icon: Target,
                      title: "Project direction",
                      lines: [data.websiteType, data.primaryGoal, data.brandStyle],
                    },
                    {
                      icon: LayoutGrid,
                      title: "Website scope",
                      lines: [`${data.pages.length} pages`, `${data.features.length} features`, data.contentReady],
                    },
                    {
                      icon: Clock3,
                      title: "Plan",
                      lines: [data.budget, data.timeline, data.launchDate || "Launch date flexible"],
                    },
                    {
                      icon: UploadCloud,
                      title: "Uploads",
                      lines: [
                        logoFile ? `Logo: ${logoFile.name}` : "No logo file",
                        projectFiles.length
                          ? `${projectFiles.length} supporting file${projectFiles.length > 1 ? "s" : ""}`
                          : "No supporting files",
                      ],
                    },
                  ].map(({ icon: Icon, title, lines }) => (
                    <div key={title} className="flex gap-4 rounded-2xl border border-slate-200 p-4">
                      <div className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-slate-100 text-slate-600">
                        <Icon size={19} />
                      </div>
                      <div>
                        <p className="text-xs font-bold uppercase tracking-[0.12em] text-slate-400">{title}</p>
                        <p className="mt-1.5 text-sm font-semibold leading-6 text-slate-700">{lines.filter(Boolean).join(" · ")}</p>
                      </div>
                    </div>
                  ))}

                  <div className="flex gap-3 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm leading-6 text-amber-900">
                    <FileText size={19} className="mt-0.5 shrink-0" />
                    Clicking submit will first open the Terms & Conditions. The final button stays disabled until you
                    agree.
                  </div>
                </div>
              )}
            </div>

            <div className="sticky bottom-0 border-t border-slate-100 bg-white/95 px-5 py-4 backdrop-blur sm:rounded-b-[32px] sm:px-9">
              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={goBack}
                  disabled={step === 0}
                  className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl border border-slate-200 text-slate-600 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-35"
                  aria-label="Go to previous step"
                >
                  <ArrowLeft size={19} />
                </button>
                {step < steps.length - 1 ? (
                  <button
                    type="button"
                    onClick={goNext}
                    className="flex h-12 flex-1 items-center justify-center gap-2 rounded-2xl bg-violet-600 px-5 text-sm font-bold text-white shadow-button transition hover:bg-violet-700"
                  >
                    Continue
                    <ChevronRight size={18} />
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={() => {
                      setSubmitError("");
                      setTermsOpen(true);
                    }}
                    className="flex h-12 flex-1 items-center justify-center gap-2 rounded-2xl bg-violet-600 px-5 text-sm font-bold text-white shadow-button transition hover:bg-violet-700"
                  >
                    Review Terms & Submit
                    <ShieldCheck size={18} />
                  </button>
                )}
              </div>
            </div>
          </div>
        </section>
      </div>

      <TermsModal
        open={termsOpen}
        agreed={agreed}
        submitting={submitting}
        submitError={submitError}
        onAgree={setAgreed}
        onClose={() => {
          setSubmitError("");
          setTermsOpen(false);
        }}
        onSubmit={submitForm}
      />
    </main>
  );
}

export default App;

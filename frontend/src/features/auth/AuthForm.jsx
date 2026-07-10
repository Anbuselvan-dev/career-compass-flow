import * as React from "react";
import { useState, useCallback } from "react";
import { cn } from "@/lib/utils";
import {
  Mail,
  Lock,
  User,
  Eye,
  EyeOff,
  Shield,
  AlertTriangle,
  KeyRound,
  Loader2,
  Sparkles,
  ArrowRight,
} from "lucide-react";

const API = import.meta.env.VITE_API_BASE_URL || "http://localhost:8000";

// ── Password Strength ─────────────────────────────────────────────────
function calculatePasswordStrength(password) {
  const requirements = {
    length: password.length >= 8,
    uppercase: /[A-Z]/.test(password),
    lowercase: /[a-z]/.test(password),
    number: /\d/.test(password),
    special: /[!@#$%^&*()_+\-=[\]{};':"\\|,.<>/?]/.test(password),
  };
  const score = Object.values(requirements).filter(Boolean).length;
  const feedback = [];
  if (!requirements.length) feedback.push("At least 8 characters");
  if (!requirements.uppercase) feedback.push("One uppercase letter");
  if (!requirements.lowercase) feedback.push("One lowercase letter");
  if (!requirements.number) feedback.push("One number");
  if (!requirements.special) feedback.push("One special character");
  return { score, feedback, requirements };
}

function PasswordStrengthIndicator({ password }) {
  const strength = calculatePasswordStrength(password);
  const colors = ["", "bg-red-500", "bg-orange-500", "bg-yellow-500", "bg-blue-500", "bg-green-500"];
  const labels = ["", "Very Weak", "Weak", "Fair", "Good", "Strong"];
  if (!password) return null;
  return (
    <div className="mt-2 space-y-2">
      <div className="flex items-center gap-2">
        <div className="flex-1 bg-muted rounded-full h-1.5 overflow-hidden">
          <div
            className={`h-full rounded-full transition-all ${colors[strength.score]}`}
            style={{ width: `${(strength.score / 5) * 100}%` }}
          />
        </div>
        <span className="text-[10px] font-bold text-muted-foreground min-w-[50px]">
          {labels[strength.score]}
        </span>
      </div>
      {strength.feedback.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {strength.feedback.map((item) => (
            <span key={item} className="flex items-center gap-1 text-[10px] text-amber-500">
              <AlertTriangle className="h-2.5 w-2.5" />{item}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}

// ── Main AuthForm Component ───────────────────────────────────────────
export function AuthForm({ onSuccess, initialMode = "login" }) {
  const [authMode, setAuthMode] = useState(initialMode);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isGoogleLoading, setIsGoogleLoading] = useState(false);
  const [successMessage, setSuccessMessage] = useState("");
  const [formData, setFormData] = useState({
    username: "",
    email: "",
    login_id: "", // E-mail or Username
    password: "",
    confirmPassword: "",
    rememberMe: false,
    agreeToTerms: false,
  });
  const [errors, setErrors] = useState({});
  const [touched, setTouched] = useState({});

  const validateField = useCallback(
    (field, value) => {
      switch (field) {
        case "username":
          return authMode === "signup" && !String(value).trim() ? "Username is required" : "";
        case "login_id":
          if (!value) return "Email or Username is required";
          if (/@/.test(value)) {
            return !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value) ? "Enter a valid email address" : "";
          }
          return String(value).trim().length < 3 ? "Username must be at least 3 characters" : "";
        case "email":
          if (!value) return "Email is required";
          return !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value) ? "Enter a valid email address" : "";
        case "password":
          if (!value) return "Password is required";
          if (String(value).length < 8) return "Password must be at least 8 characters";
          if (authMode === "signup" && calculatePasswordStrength(String(value)).score < 3)
            return "Password is too weak";
          return "";
        case "confirmPassword":
          return authMode === "signup" && value !== formData.password ? "Passwords do not match" : "";
        case "agreeToTerms":
          return authMode === "signup" && !value ? "You must agree to the terms" : "";
        default:
          return "";
      }
    },
    [authMode, formData.password]
  );

  const handleChange = useCallback(
    (field, value) => {
      setFormData((prev) => ({ ...prev, [field]: value }));
      if (touched[field]) {
        const err = validateField(field, value);
        setErrors((prev) => ({ ...prev, [field]: err || undefined }));
      }
    },
    [touched, validateField]
  );

  const handleBlur = useCallback(
    (field) => {
      setTouched((prev) => ({ ...prev, [field]: true }));
      const err = validateField(field, formData[field]);
      setErrors((prev) => ({ ...prev, [field]: err || undefined }));
    },
    [formData, validateField]
  );

  const validateAll = useCallback(() => {
    const fields = authMode === "signup"
      ? ["username", "email", "password", "confirmPassword", "agreeToTerms"]
      : ["login_id", "password"];
    const newErrors = {};
    fields.forEach((f) => {
      const err = validateField(f, formData[f]);
      if (err) newErrors[f] = err;
    });
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  }, [authMode, formData, validateField]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validateAll()) return;
    setIsLoading(true);
    setErrors({});
    setSuccessMessage("");

    try {
      if (authMode === "login") {
        const res = await fetch(`${API}/api/auth/login`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ login_id: formData.login_id, password: formData.password }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.detail || "Login failed");
        if (formData.rememberMe) {
          localStorage.setItem("cc_user_id", data.user.id);
          localStorage.setItem("cc_user_email", data.user.email);
          localStorage.setItem("cc_user_name", data.user.fullname);
        } else {
          sessionStorage.setItem("cc_user_id", data.user.id);
          sessionStorage.setItem("cc_user_email", data.user.email);
          sessionStorage.setItem("cc_user_name", data.user.fullname);
        }
        setSuccessMessage("Welcome back! Redirecting…");
        setTimeout(() => onSuccess?.(data.user), 800);

      } else if (authMode === "signup") {
        const res = await fetch(`${API}/api/auth/signup`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            username: formData.username,
            email: formData.email,
            password: formData.password,
          }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.detail || "Signup failed");
        sessionStorage.setItem("cc_user_id", data.user.id);
        sessionStorage.setItem("cc_user_email", data.user.email);
        sessionStorage.setItem("cc_user_name", data.user.fullname);
        setSuccessMessage("Account created! Redirecting…");
        setTimeout(() => onSuccess?.(data.user), 800);

      } else {
        // Password reset
        setSuccessMessage("If that email exists, a reset link has been sent.");
        setTimeout(() => setAuthMode("login"), 2500);
      }
    } catch (err) {
      setErrors({ general: err.message || "Something went wrong. Please try again." });
    } finally {
      setIsLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
    setIsGoogleLoading(true);
    setErrors({});
    setSuccessMessage("");
    try {
      const dummyGoogleUser = {
        email: "alex.career@gmail.com",
        fullname: "Alex Career",
        google_id: "google-oauth2|1234567890",
      };

      const res = await fetch(`${API}/api/auth/google`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(dummyGoogleUser),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || "Google authentication failed");

      sessionStorage.setItem("cc_user_id", data.user.id);
      sessionStorage.setItem("cc_user_email", data.user.email);
      sessionStorage.setItem("cc_user_name", data.user.fullname);

      setSuccessMessage("Google sign-in successful! Redirecting…");
      setTimeout(() => onSuccess?.(data.user), 800);
    } catch (err) {
      setErrors({ general: err.message || "Google Authentication failed. Please try again." });
    } finally {
      setIsGoogleLoading(false);
    }
  };

  const inputClass = (field) =>
    cn(
      "w-full pl-10 pr-4 py-3 bg-muted/50 border rounded-xl text-sm placeholder:text-muted-foreground",
      "focus:outline-none focus:ring-2 focus:ring-primary/30 transition-all text-foreground",
      errors[field] ? "border-destructive/60 bg-destructive/5" : "border-input"
    );

  const FieldError = ({ field }) =>
    errors[field] ? (
      <p className="text-destructive text-[11px] mt-1.5 flex items-center gap-1 font-semibold">
        <AlertTriangle className="h-3 w-3 flex-shrink-0" />
        {errors[field]}
      </p>
    ) : null;

  return (
    <div className="w-full">
      {/* Header */}
      <div className="mb-6">
        <h2 className="text-2xl font-extrabold text-foreground tracking-tight">
          {authMode === "login" ? "Welcome Back" : authMode === "signup" ? "Create Account" : "Reset Password"}
        </h2>
        <p className="text-xs text-muted-foreground mt-1.5">
          {authMode === "login"
            ? "Sign in to access your personalised career dashboard"
            : authMode === "signup"
            ? "Get started by creating your profile to check market readiness"
            : "Enter your email to recover access to your profile"}
        </p>
      </div>

      {/* Success */}
      {successMessage && (
        <div className="mb-5 p-3.5 rounded-2xl bg-green-500/10 border border-green-400/30 flex items-center gap-2.5 animate-in fade-in-50">
          <div className="flex h-5 w-5 items-center justify-center rounded-full bg-green-500/20 flex-shrink-0">
            <svg className="h-3 w-3 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <span className="text-green-600 dark:text-green-400 text-xs font-semibold">{successMessage}</span>
        </div>
      )}

      {/* General error */}
      {errors.general && (
        <div className="mb-5 p-3.5 rounded-2xl bg-destructive/10 border border-destructive/30 flex items-center gap-2.5 animate-in fade-in-50">
          <AlertTriangle className="h-4 w-4 text-destructive flex-shrink-0" />
          <span className="text-destructive text-xs font-semibold">{errors.general}</span>
        </div>
      )}

      {/* Mode tabs */}
      {authMode !== "reset" && (
        <div className="flex bg-muted/60 rounded-2xl p-1 mb-6 border border-border/30">
          {["login", "signup"].map((mode) => (
            <button
              key={mode}
              type="button"
              onClick={() => { setAuthMode(mode); setErrors({}); setSuccessMessage(""); }}
              className={cn(
                "flex-1 py-2.5 px-4 rounded-xl text-xs font-bold transition-all",
                authMode === mode
                  ? "bg-background text-foreground shadow-sm border border-border/30"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              {mode === "login" ? "Sign In" : "Sign Up"}
            </button>
          ))}
        </div>
      )}

      {/* Reset mode header */}
      {authMode === "reset" && (
        <div className="text-center mb-6">
          <div className="inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10 text-primary mb-3">
            <KeyRound className="h-6 w-6" />
          </div>
          <h3 className="text-base font-bold text-foreground">Forgot your password?</h3>
          <p className="text-xs text-muted-foreground mt-1">
            Enter your email and we'll send a reset link.
          </p>
        </div>
      )}



      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Username — signup only */}
        {authMode === "signup" && (
          <div>
            <div className="relative">
              <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <input
                type="text"
                placeholder="Username"
                value={formData.username}
                onChange={(e) => handleChange("username", e.target.value)}
                onBlur={() => handleBlur("username")}
                className={inputClass("username")}
                autoComplete="username"
              />
            </div>
            <FieldError field="username" />
          </div>
        )}

        {/* login_id — login only (email or username) */}
        {authMode === "login" && (
          <div>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <input
                type="text"
                placeholder="Username or Email"
                value={formData.login_id}
                onChange={(e) => handleChange("login_id", e.target.value)}
                onBlur={() => handleBlur("login_id")}
                className={inputClass("login_id")}
                autoComplete="username"
              />
            </div>
            <FieldError field="login_id" />
          </div>
        )}

        {/* Email — signup/reset only */}
        {authMode !== "login" && (
          <div>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <input
                type="email"
                placeholder="Email Address"
                value={formData.email}
                onChange={(e) => handleChange("email", e.target.value)}
                onBlur={() => handleBlur("email")}
                className={inputClass("email")}
                autoComplete="email"
              />
            </div>
            <FieldError field="email" />
          </div>
        )}

        {/* Password */}
        {authMode !== "reset" && (
          <div>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <input
                type={showPassword ? "text" : "password"}
                placeholder="Password"
                value={formData.password}
                onChange={(e) => handleChange("password", e.target.value)}
                onBlur={() => handleBlur("password")}
                className={cn(inputClass("password"), "pr-12")}
                autoComplete={authMode === "login" ? "current-password" : "new-password"}
              />
              <button
                type="button"
                onClick={() => setShowPassword((v) => !v)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                aria-label={showPassword ? "Hide password" : "Show password"}
              >
                {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
            <FieldError field="password" />
            {authMode === "signup" && <PasswordStrengthIndicator password={formData.password} />}
          </div>
        )}

        {/* Confirm password — signup only */}
        {authMode === "signup" && (
          <div>
            <div className="relative">
              <Shield className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <input
                type={showConfirm ? "text" : "password"}
                placeholder="Confirm Password"
                value={formData.confirmPassword}
                onChange={(e) => handleChange("confirmPassword", e.target.value)}
                onBlur={() => handleBlur("confirmPassword")}
                className={cn(inputClass("confirmPassword"), "pr-12")}
                autoComplete="new-password"
              />
              <button
                type="button"
                onClick={() => setShowConfirm((v) => !v)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
              >
                {showConfirm ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
            <FieldError field="confirmPassword" />
          </div>
        )}

        {/* Remember me / Forgot / ToS */}
        {authMode === "login" && (
          <div className="flex items-center justify-between">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={formData.rememberMe}
                onChange={(e) => handleChange("rememberMe", e.target.checked)}
                className="w-4 h-4 rounded border-input bg-muted accent-primary"
              />
              <span className="text-xs text-muted-foreground font-semibold">Remember me</span>
            </label>
            <button
              type="button"
              onClick={() => { setAuthMode("reset"); setErrors({}); }}
              className="text-xs text-primary hover:text-primary/80 font-semibold transition-colors"
            >
              Forgot password?
            </button>
          </div>
        )}

        {authMode === "signup" && (
          <div>
            <label className="flex items-start gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={formData.agreeToTerms}
                onChange={(e) => handleChange("agreeToTerms", e.target.checked)}
                className="w-4 h-4 mt-0.5 rounded border-input bg-muted accent-primary flex-shrink-0"
              />
              <span className="text-xs text-muted-foreground">
                I agree to the{" "}
                <a href="#" className="text-primary hover:underline">Terms of Service</a>{" "}
                and{" "}
                <a href="#" className="text-primary hover:underline">Privacy Policy</a>
              </span>
            </label>
            <FieldError field="agreeToTerms" />
          </div>
        )}

        {/* Submit */}
        <button
          type="submit"
          disabled={isLoading || isGoogleLoading}
          className={cn(
            "w-full flex items-center justify-center gap-2 rounded-2xl bg-gradient-primary px-6 py-3.5",
            "text-sm font-bold text-primary-foreground shadow-soft transition-all",
            "hover:-translate-y-0.5 hover:shadow-card",
            "disabled:opacity-60 disabled:cursor-not-allowed disabled:translate-y-0"
          )}
        >
          {isLoading ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : authMode === "login" ? (
            <>Sign In <ArrowRight className="h-4 w-4" /></>
          ) : authMode === "signup" ? (
            <>Create Account <ArrowRight className="h-4 w-4" /></>
          ) : (
            <><KeyRound className="h-4 w-4" /> Send Reset Link</>
          )}
        </button>

        {/* Back to login from reset */}
        {authMode === "reset" && (
          <button
            type="button"
            onClick={() => { setAuthMode("login"); setErrors({}); }}
            className="w-full text-xs font-bold text-muted-foreground hover:text-foreground transition-colors text-center"
          >
            ← Back to Sign In
          </button>
        )}
      </form>
    </div>
  );
}

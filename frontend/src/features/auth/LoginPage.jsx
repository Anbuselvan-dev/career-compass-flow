import { useEffect } from "react";
import { motion } from "motion/react";
import { Sparkles } from "lucide-react";
import { AuthForm } from "./AuthForm";

export function LoginPage({ onAuthenticated }) {
  // On mount, check if user is already logged in
  useEffect(() => {
    const id =
      localStorage.getItem("cc_user_id") ||
      sessionStorage.getItem("cc_user_id");
    const name =
      localStorage.getItem("cc_user_name") ||
      sessionStorage.getItem("cc_user_name");
    const email =
      localStorage.getItem("cc_user_email") ||
      sessionStorage.getItem("cc_user_email");
    if (id && email) {
      onAuthenticated?.({ id, fullname: name || "", email });
    }
  }, [onAuthenticated]);

  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-background relative overflow-hidden px-4 py-12">
      {/* ── Background decoration orbs ───────────────────────────── */}
      <div 
        className="absolute top-[-20%] left-[-10%] w-[50vw] h-[50vw] rounded-full opacity-20 blur-[100px] pointer-events-none"
        style={{
          background: "radial-gradient(circle, hsl(var(--primary)) 0%, transparent 70%)"
        }}
      />
      <div 
        className="absolute bottom-[-20%] right-[-10%] w-[50vw] h-[50vw] rounded-full opacity-20 blur-[100px] pointer-events-none"
        style={{
          background: "radial-gradient(circle, hsl(258 87% 46%) 0%, transparent 70%)"
        }}
      />

      <div className="w-full max-w-md z-10 flex flex-col items-center gap-6">
        {/* Brand Logo header */}
        <motion.div 
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="flex items-center gap-2.5"
        >
          <div className="flex h-9 w-9 items-center justify-center rounded-2xl bg-primary/10 border border-primary/25">
            <Sparkles className="h-4 w-4 text-primary animate-pulse" />
          </div>
          <span className="font-extrabold text-lg text-foreground tracking-tight">
            Career Compass Flow
          </span>
        </motion.div>

        {/* Centralised Auth Card */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.5, ease: "easeOut" }}
          className="w-full rounded-3xl border border-border/60 bg-card/65 p-8 shadow-card backdrop-blur-md"
        >
          <AuthForm
            onSuccess={(user) => onAuthenticated?.(user)}
            initialMode="login"
          />
        </motion.div>

        {/* Terms note */}
        <motion.p 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.3, duration: 0.5 }}
          className="text-center text-[10px] text-muted-foreground leading-relaxed max-w-[280px]"
        >
          By continuing, you agree to our{" "}
          <a href="#" className="text-primary hover:underline font-semibold">Terms of Service</a>{" "}
          and{" "}
          <a href="#" className="text-primary hover:underline font-semibold">Privacy Policy</a>.
        </motion.p>
      </div>
    </div>
  );
}

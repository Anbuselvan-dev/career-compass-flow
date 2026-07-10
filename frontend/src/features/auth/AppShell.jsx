import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import { LogOut, User, Sparkles } from "lucide-react";
import { LoginPage } from "@/features/auth/LoginPage";
import { CareerFlow } from "@/features/flow/CareerFlow";

/**
 * AppShell — top-level auth gate.
 * Shows LoginPage until the user authenticates, then reveals CareerFlow.
 * Persists session in localStorage (Remember Me) or sessionStorage.
 */
export function AppShell() {
  const [user, setUser] = useState(null); // null = not yet checked
  const [ready, setReady] = useState(false);

  // Restore session from storage on mount
  useEffect(() => {
    const id =
      localStorage.getItem("cc_user_id") ||
      sessionStorage.getItem("cc_user_id");
    const email =
      localStorage.getItem("cc_user_email") ||
      sessionStorage.getItem("cc_user_email");
    const fullname =
      localStorage.getItem("cc_user_name") ||
      sessionStorage.getItem("cc_user_name");

    if (id && email) {
      setUser({ id, email, fullname: fullname || email.split("@")[0] });
    }
    setReady(true);
  }, []);

  const handleAuthenticated = (userData) => {
    setUser(userData);
  };

  const handleLogout = () => {
    localStorage.removeItem("cc_user_id");
    localStorage.removeItem("cc_user_email");
    localStorage.removeItem("cc_user_name");
    sessionStorage.removeItem("cc_user_id");
    sessionStorage.removeItem("cc_user_email");
    sessionStorage.removeItem("cc_user_name");
    setUser(null);
  };

  if (!ready) {
    // Prevent flash while checking storage
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-primary/10">
          <Sparkles className="h-5 w-5 text-primary animate-pulse" />
        </div>
      </div>
    );
  }

  return (
    <AnimatePresence mode="wait">
      {!user ? (
        <motion.div
          key="login"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.3 }}
        >
          <LoginPage onAuthenticated={handleAuthenticated} />
        </motion.div>
      ) : (
        <motion.div
          key="app"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.3 }}
          className="min-h-screen bg-background"
        >
          {/* Slim user header bar */}
          <div className="fixed top-0 right-0 z-50 flex items-center gap-3 px-5 py-3">
            <div className="flex items-center gap-2 rounded-2xl border border-border/50 bg-card/80 backdrop-blur-sm px-3.5 py-2 shadow-soft">
              <div className="flex h-6 w-6 items-center justify-center rounded-full bg-primary/15 text-primary flex-shrink-0">
                <User className="h-3.5 w-3.5" />
              </div>
              <span className="text-[11px] font-bold text-foreground hidden sm:block truncate max-w-[140px]">
                {user.fullname || user.email}
              </span>
              <button
                onClick={handleLogout}
                title="Sign out"
                className="ml-1 text-muted-foreground hover:text-destructive transition-colors"
              >
                <LogOut className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>

          {/* The full career app */}
          <CareerFlow key={user.id} user={user} />
        </motion.div>
      )}
    </AnimatePresence>
  );
}

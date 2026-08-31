import React, { useEffect, useState } from "react";
import { createClient } from "@supabase/supabase-js";

/* =========================================================
   SUPABASE
   ========================================================= */

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_PUBLISHABLE_KEY =
  import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;

export const supabase =
  SUPABASE_URL && SUPABASE_PUBLISHABLE_KEY
    ? createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, {
        auth: {
          persistSession: true,
          autoRefreshToken: true,
          detectSessionInUrl: true,
        },
      })
    : null;


/* =========================================================
   SUPABASE CONFIG ERROR
   ========================================================= */

function SupabaseConfigError() {
  return (
    <div
      style={{
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: "#08090d",
        color: "#fff",
        padding: 24,
        fontFamily: "Inter, Arial, sans-serif",
      }}
    >
      <div
        style={{
          width: "100%",
          maxWidth: 520,
          padding: 30,
          borderRadius: 24,
          background: "#11131a",
          border: "1px solid #292d38",
          boxShadow: "0 20px 70px rgba(0,0,0,.35)",
        }}
      >
        <div style={{ fontSize: 34, fontWeight: 900 }}>HEXA</div>

        <h2 style={{ marginTop: 24 }}>
          Supabase configuration missing
        </h2>

        <p style={{ color: "#9ca3af", lineHeight: 1.7 }}>
          Add the following variables to your Vite environment:
        </p>

        <pre
          style={{
            padding: 16,
            borderRadius: 14,
            background: "#08090d",
            overflowX: "auto",
            color: "#d1d5db",
          }}
        >
{`VITE_SUPABASE_URL=your_supabase_url
VITE_SUPABASE_PUBLISHABLE_KEY=your_publishable_key`}
        </pre>

        <p
          style={{
            color: "#737985",
            fontSize: 13,
            lineHeight: 1.6,
          }}
        >
          Restart the Vite development server after changing your
          environment variables.
        </p>
      </div>
    </div>
  );
}


/* =========================================================
   AUTH HELPERS
   ========================================================= */

function getAuthErrorMessage(error) {
  const message = String(error?.message || "").toLowerCase();

  if (message.includes("invalid login credentials")) {
    return "The email or password is incorrect.";
  }

  if (message.includes("email not confirmed")) {
    return "Please verify your email address before signing in.";
  }

  if (message.includes("user already registered")) {
    return "An account with this email already exists.";
  }

  if (message.includes("password")) {
    return error?.message || "Please check your password.";
  }

  if (message.includes("rate limit")) {
    return "Too many attempts. Please wait a moment and try again.";
  }

  return error?.message || "Something went wrong. Please try again.";
}


function getPasswordStrength(password) {
  if (!password) {
    return {
      score: 0,
      label: "",
    };
  }

  let score = 0;

  if (password.length >= 8) score++;
  if (password.length >= 12) score++;
  if (/[A-Z]/.test(password)) score++;
  if (/[a-z]/.test(password)) score++;
  if (/[0-9]/.test(password)) score++;
  if (/[^A-Za-z0-9]/.test(password)) score++;

  if (score <= 2) {
    return { score, label: "Weak" };
  }

  if (score <= 4) {
    return { score, label: "Good" };
  }

  return { score, label: "Strong" };
}


/* =========================================================
   AUTH FIELD
   ========================================================= */

function AuthField({
  label,
  type = "text",
  value,
  onChange,
  placeholder,
  autoComplete,
}) {
  return (
    <label style={{ display: "block", marginBottom: 16 }}>
      <span
        style={{
          display: "block",
          fontSize: 13,
          fontWeight: 700,
          color: "#c8ccd5",
          marginBottom: 8,
        }}
      >
        {label}
      </span>

      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        autoComplete={autoComplete}
        style={{
          width: "100%",
          boxSizing: "border-box",
          height: 50,
          padding: "0 15px",
          borderRadius: 13,
          border: "1px solid #303541",
          outline: "none",
          background: "#0d0f15",
          color: "#fff",
          fontSize: 14,
        }}
      />
    </label>
  );
}


/* =========================================================
   AUTH SCREEN
   ========================================================= */

function AuthScreen() {
  const [mode, setMode] = useState("signin");

  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const passwordStrength = getPasswordStrength(password);

  const clearMessages = () => {
    setMessage("");
    setError("");
  };


  /* ---------------------------------------------------------
     EMAIL SIGN IN
     --------------------------------------------------------- */

  async function handleSignIn(e) {
    e.preventDefault();

    clearMessages();

    if (!supabase) return;

    if (!email.trim() || !password) {
      setError("Enter your email and password.");
      return;
    }

    setLoading(true);

    try {
      const { error } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password,
      });

      if (error) throw error;

      /*
       * Do not manually navigate.
       * onAuthStateChange in App() will receive
       * the authenticated session.
       */
    } catch (err) {
      setError(getAuthErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }


  /* ---------------------------------------------------------
     EMAIL SIGN UP
     --------------------------------------------------------- */

  async function handleSignUp(e) {
    e.preventDefault();

    clearMessages();

    if (!supabase) return;

    if (!fullName.trim()) {
      setError("Enter your name.");
      return;
    }

    if (!email.trim()) {
      setError("Enter your email.");
      return;
    }

    if (password.length < 8) {
      setError("Your password must contain at least 8 characters.");
      return;
    }

    if (password !== confirmPassword) {
      setError("The passwords do not match.");
      return;
    }

    setLoading(true);

    try {
      const {
        data,
        error,
      } = await supabase.auth.signUp({
        email: email.trim(),
        password,
        options: {
          data: {
            full_name: fullName.trim(),
          },
        },
      });

      if (error) throw error;

      /*
       * If email confirmation is enabled in Supabase,
       * data.session will be null until the user verifies
       * their email.
       */

      if (!data.session) {
        setMessage(
          "Account created. Check your email to verify your HEXA account."
        );

        setMode("signin");
        setPassword("");
        setConfirmPassword("");
      }
    } catch (err) {
      setError(getAuthErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }


  /* ---------------------------------------------------------
     GOOGLE
     --------------------------------------------------------- */

  async function handleGoogle() {
    clearMessages();

    if (!supabase) return;

    setGoogleLoading(true);

    try {

     const redirectTo = window.location.origin;

await supabase.auth.signInWithOAuth({
  provider: "google",
  options: {
    redirectTo,
    queryParams: {
      access_type: "offline",
      prompt: "select_account",
    },
  },
});

      if (error) throw error;
    } catch (err) {
      setError(getAuthErrorMessage(err));
      setGoogleLoading(false);
    }
  }


  /* ---------------------------------------------------------
     FORGOT PASSWORD
     --------------------------------------------------------- */

  async function handleForgotPassword() {
    clearMessages();

    if (!supabase) return;

    if (!email.trim()) {
      setError("Enter your email address first.");
      return;
    }

    setLoading(true);

    try {
      const { error } =
        await supabase.auth.resetPasswordForEmail(email.trim(), {
          redirectTo: `${window.location.origin}/reset-password`,
        });

      if (error) throw error;

      setMessage(
        "If an account exists for that email, a password reset link has been sent."
      );
    } catch (err) {
      setError(getAuthErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }


  return (
    <div
      style={{
        minHeight: "100vh",
        width: "100%",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background:
          "radial-gradient(circle at top, #18202f 0%, #090b10 45%, #050609 100%)",
        padding: 20,
        boxSizing: "border-box",
        fontFamily: "Inter, Arial, sans-serif",
      }}
    >
      <div
        style={{
          width: "100%",
          maxWidth: 430,
          background: "rgba(16,18,25,.96)",
          border: "1px solid #292e39",
          borderRadius: 26,
          padding: 28,
          boxSizing: "border-box",
          boxShadow: "0 30px 100px rgba(0,0,0,.45)",
        }}
      >

        {/* BRAND */}

        <div
          style={{
            textAlign: "center",
            marginBottom: 25,
          }}
        >
          <div
            style={{
              fontSize: 42,
              fontWeight: 950,
              letterSpacing: -2,
              color: "#fff",
            }}
          >
            HEXA
          </div>

          <div
            style={{
              marginTop: 5,
              color: "#858b98",
              fontSize: 13,
            }}
          >
            Communication without limits.
          </div>
        </div>


        {/* MODE */}

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "1fr 1fr",
            background: "#0a0c11",
            padding: 4,
            borderRadius: 13,
            marginBottom: 22,
          }}
        >
          <button
            type="button"
            onClick={() => {
              clearMessages();
              setMode("signin");
            }}
            style={{
              height: 42,
              border: 0,
              borderRadius: 10,
              cursor: "pointer",
              background:
                mode === "signin" ? "#ffffff" : "transparent",
              color:
                mode === "signin" ? "#08090d" : "#9298a5",
              fontWeight: 800,
            }}
          >
            Sign In
          </button>

          <button
            type="button"
            onClick={() => {
              clearMessages();
              setMode("signup");
            }}
            style={{
              height: 42,
              border: 0,
              borderRadius: 10,
              cursor: "pointer",
              background:
                mode === "signup" ? "#ffffff" : "transparent",
              color:
                mode === "signup" ? "#08090d" : "#9298a5",
              fontWeight: 800,
            }}
          >
            Sign Up
          </button>
        </div>


        {/* GOOGLE */}

        <button
          type="button"
          onClick={handleGoogle}
          disabled={googleLoading || loading}
          style={{
            width: "100%",
            height: 52,
            borderRadius: 14,
            border: "1px solid #363b46",
            background: "#fff",
            color: "#111",
            fontWeight: 800,
            cursor: googleLoading ? "wait" : "pointer",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: 11,
            marginBottom: 18,
          }}
        >
          <span style={{ fontSize: 19 }}>G</span>

          {googleLoading
            ? "Connecting to Google..."
            : "Continue with Google"}
        </button>


        {/* DIVIDER */}

        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 12,
            margin: "18px 0",
            color: "#656b77",
            fontSize: 12,
          }}
        >
          <div
            style={{
              flex: 1,
              height: 1,
              background: "#292e38",
            }}
          />

          OR

          <div
            style={{
              flex: 1,
              height: 1,
              background: "#292e38",
            }}
          />
        </div>


        {/* FORM */}

        <form
          onSubmit={
            mode === "signin"
              ? handleSignIn
              : handleSignUp
          }
        >
          {mode === "signup" && (
            <AuthField
              label="Full name"
              value={fullName}
              onChange={setFullName}
              placeholder="Your name"
              autoComplete="name"
            />
          )}

          <AuthField
            label="Email"
            type="email"
            value={email}
            onChange={setEmail}
            placeholder="you@example.com"
            autoComplete="email"
          />

          <AuthField
            label="Password"
            type="password"
            value={password}
            onChange={setPassword}
            placeholder="Your password"
            autoComplete={
              mode === "signin"
                ? "current-password"
                : "new-password"
            }
          />

          {mode === "signup" && password && (
            <div
              style={{
                marginTop: -7,
                marginBottom: 15,
                fontSize: 12,
                color:
                  passwordStrength.label === "Strong"
                    ? "#67e8a5"
                    : passwordStrength.label === "Good"
                    ? "#facc15"
                    : "#fb7185",
              }}
            >
              Password strength: {passwordStrength.label}
            </div>
          )}

          {mode === "signup" && (
            <AuthField
              label="Confirm password"
              type="password"
              value={confirmPassword}
              onChange={setConfirmPassword}
              placeholder="Repeat your password"
              autoComplete="new-password"
            />
          )}


          {mode === "signin" && (
            <button
              type="button"
              onClick={handleForgotPassword}
              style={{
                display: "block",
                margin: "-4px 0 17px auto",
                border: 0,
                background: "transparent",
                color: "#aab0bc",
                cursor: "pointer",
                fontSize: 12,
                fontWeight: 700,
              }}
            >
              Forgot password?
            </button>
          )}


          {error && (
            <div
              style={{
                background: "rgba(239,68,68,.1)",
                border: "1px solid rgba(239,68,68,.3)",
                color: "#fca5a5",
                padding: 12,
                borderRadius: 12,
                fontSize: 13,
                lineHeight: 1.5,
                marginBottom: 15,
              }}
            >
              {error}
            </div>
          )}


          {message && (
            <div
              style={{
                background: "rgba(34,197,94,.1)",
                border: "1px solid rgba(34,197,94,.25)",
                color: "#86efac",
                padding: 12,
                borderRadius: 12,
                fontSize: 13,
                lineHeight: 1.5,
                marginBottom: 15,
              }}
            >
              {message}
            </div>
          )}


          <button
            type="submit"
            disabled={loading || googleLoading}
            style={{
              width: "100%",
              height: 52,
              borderRadius: 14,
              border: 0,
              background: "#ffffff",
              color: "#07080b",
              fontWeight: 900,
              cursor: loading ? "wait" : "pointer",
            }}
          >
            {loading
              ? "Please wait..."
              : mode === "signin"
              ? "Sign In to HEXA"
              : "Create HEXA Account"}
          </button>
        </form>


        {/* FOOTER */}

        <div
          style={{
            textAlign: "center",
            marginTop: 20,
            color: "#676d79",
            fontSize: 11,
            lineHeight: 1.6,
          }}
        >
          By continuing, you agree to use HEXA responsibly.
        </div>
      </div>
    </div>
  );
}


/* =========================================================
   AUTOMATIC HEXA PROFILE CREATION
   ========================================================= */

async function ensureHexaProfile(user) {
  if (!supabase || !user) return;

  try {
    const { data: existingProfile, error: selectError } =
      await supabase
        .from("profiles")
        .select("id")
        .eq("id", user.id)
        .maybeSingle();

    if (selectError) {
      /*
       * Do not block authentication if the profiles
       * table/policy is not yet configured.
       */
      console.warn(
        "HEXA profile lookup failed:",
        selectError.message
      );

      return;
    }

    if (existingProfile) return;

    const metadata = user.user_metadata || {};

    const fullName =
      metadata.full_name ||
      metadata.name ||
      "";

    const avatarUrl =
      metadata.avatar_url ||
      metadata.picture ||
      null;

    const usernameBase =
      fullName
        .toLowerCase()
        .replace(/[^a-z0-9]/g, "")
        .slice(0, 18) ||
      `hexa${user.id.slice(0, 8)}`;

    const { error: insertError } =
      await supabase
        .from("profiles")
        .insert({
          id: user.id,
          username: usernameBase,
          full_name: fullName,
          avatar_url: avatarUrl,
          email: user.email || null,
        });

    if (insertError) {
      /*
       * A duplicate username should not prevent login.
       */
      if (
        !String(insertError.message || "")
          .toLowerCase()
          .includes("duplicate")
      ) {
        console.warn(
          "HEXA profile creation failed:",
          insertError.message
        );
      }
    }
  } catch (err) {
    console.warn("Profile initialization failed:", err);
  }
}


/* =========================================================
   AUTHENTICATED APP
   ========================================================= */

function AuthenticatedHEXA({ session }) {
  const user = session?.user;

  /*
   * IMPORTANT:
   *
   * Replace the inside of this component with your existing
   * latest HEXA workspace.
   *
   * The authenticated user is available as:
   *
   * user.id
   * user.email
   * user.user_metadata
   */

  async function signOut() {
    if (!supabase) return;

    await supabase.auth.signOut();
  }

  return (
    <div
      style={{
        minHeight: "100vh",
        background: "#08090d",
        color: "#fff",
        fontFamily: "Inter, Arial, sans-serif",
        padding: 30,
      }}
    >
      <div
        style={{
          maxWidth: 1100,
          margin: "0 auto",
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            marginBottom: 30,
          }}
        >
          <div>
            <div
              style={{
                fontSize: 34,
                fontWeight: 950,
              }}
            >
              HEXA
            </div>

            <div
              style={{
                color: "#7f8693",
                marginTop: 5,
              }}
            >
              HEXA NEXUS
            </div>
          </div>

          <button
            onClick={signOut}
            style={{
              padding: "11px 18px",
              borderRadius: 12,
              border: "1px solid #303540",
              background: "#11131a",
              color: "#fff",
              cursor: "pointer",
              fontWeight: 700,
            }}
          >
            Sign Out
          </button>
        </div>

        <div
          style={{
            padding: 25,
            borderRadius: 20,
            border: "1px solid #292e38",
            background: "#11131a",
          }}
        >
          <h2 style={{ marginTop: 0 }}>
            Welcome to HEXA
          </h2>

          <p style={{ color: "#9ca3af" }}>
            Signed in as:
          </p>

          <strong>
            {user?.email}
          </strong>

          <div
            style={{
              marginTop: 20,
              color: "#737985",
              fontSize: 13,
              wordBreak: "break-all",
            }}
          >
            HEXA User ID: {user?.id}
          </div>
        </div>
      </div>
    </div>
  );
}


/* =========================================================
   MAIN APP
   ========================================================= */

export default function App() {
  const [session, setSession] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!supabase) {
      setLoading(false);
      return;
    }

    let mounted = true;

    /*
     * Restore an existing authenticated session.
     */

    supabase.auth
      .getSession()
      .then(async ({ data }) => {
        if (!mounted) return;

        const currentSession = data?.session || null;

        setSession(currentSession);

        if (currentSession?.user) {
          await ensureHexaProfile(currentSession.user);
        }

        setLoading(false);
      })
      .catch((error) => {
        console.error(
          "Unable to restore HEXA session:",
          error
        );

        if (mounted) {
          setSession(null);
          setLoading(false);
        }
      });


    /*
     * Listen for:
     *
     * SIGNED_IN
     * SIGNED_OUT
     * TOKEN_REFRESHED
     * USER_UPDATED
     *
     * This is especially important after Google OAuth.
     */

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(
      (event, nextSession) => {
        if (!mounted) return;

        setSession(nextSession);

        /*
         * Profile creation is intentionally performed
         * after the auth state has been established.
         */

        if (
          nextSession?.user &&
          event === "SIGNED_IN"
        ) {
          setTimeout(() => {
            ensureHexaProfile(nextSession.user);
          }, 0);
        }
      }
    );

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, []);


  /* ---------------------------------------------------------
     CONFIG
     --------------------------------------------------------- */

  if (!supabase) {
    return <SupabaseConfigError />;
  }


  /* ---------------------------------------------------------
     AUTH LOADING
     --------------------------------------------------------- */

  if (loading) {
    return (
      <div
        style={{
          minHeight: "100vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "#08090d",
          color: "#fff",
          fontFamily: "Inter, Arial, sans-serif",
        }}
      >
        <div style={{ textAlign: "center" }}>
          <div
            style={{
              fontSize: 42,
              fontWeight: 950,
              letterSpacing: -2,
            }}
          >
            HEXA
          </div>

          <div
            style={{
              marginTop: 10,
              color: "#727987",
              fontSize: 13,
            }}
          >
            Checking your session...
          </div>
        </div>
      </div>
    );
  }


  /* ---------------------------------------------------------
     AUTHENTICATED / UNAUTHENTICATED
     --------------------------------------------------------- */

  if (!session) {
    return <AuthScreen />;
  }

  return (
    <AuthenticatedHEXA
      session={session}
    />
  );
}

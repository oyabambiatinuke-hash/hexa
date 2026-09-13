import React, { useState } from "react";
import { supabase } from "./supabase";

const AUTH_REDIRECT_URL =
  typeof window !== "undefined"
    ? `${window.location.origin}/`
    : "/";

export default function Auth() {
  const [mode, setMode] = useState("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  const [loading, setLoading] = useState(false);
  const [resending, setResending] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [confirmationEmail, setConfirmationEmail] = useState("");

  async function handleSubmit(e) {
    e.preventDefault();

    setError("");
    setSuccess("");

    const cleanEmail = email.trim().toLowerCase();

    if (!cleanEmail || !password) {
      setError("Email and password are required.");
      return;
    }

    if (password.length < 6) {
      setError("Password must contain at least 6 characters.");
      return;
    }

    if (mode === "signup" && name.trim().length > 100) {
      setError("Your display name is too long.");
      return;
    }

    setLoading(true);

    try {
      if (mode === "signin") {
        const { data, error } =
          await supabase.auth.signInWithPassword({
            email: cleanEmail,
            password,
          });

        if (error) throw error;

        if (!data?.session) {
          setError(
            "Sign-in did not create a session. Please confirm your email first."
          );
          return;
        }

        setSuccess("Signed in successfully.");
        return;
      }

      /*
       * IMPORTANT:
       * This signup goes directly through Supabase Auth.
       *
       * Supabase is responsible for generating the confirmation
       * email and sending it through the SMTP provider configured
       * in Supabase Authentication settings.
       */
      const { data, error } = await supabase.auth.signUp({
        email: cleanEmail,
        password,
        options: {
          emailRedirectTo: AUTH_REDIRECT_URL,

          data: {
            display_name:
              name.trim() || cleanEmail.split("@")[0],
          },
        },
      });

      if (error) throw error;

      /*
       * Supabase may return a session immediately when email
       * confirmation is disabled.
       *
       * When confirmation is enabled, session will normally be null
       * and Supabase sends the confirmation email.
       */
      if (!data?.session) {
        setConfirmationEmail(cleanEmail);

        setSuccess(
          `Account created. Supabase has sent a confirmation email to ${cleanEmail}.`
        );
      } else {
        setSuccess("Account created and signed in successfully.");
      }
    } catch (err) {
      console.error("hexachi authentication:", err);

      const message = String(
        err?.message || "Authentication failed."
      );

      if (
        message.toLowerCase().includes("user already registered")
      ) {
        setError(
          "An account with this email already exists. Try signing in instead."
        );
      } else if (
        message.toLowerCase().includes("invalid login credentials")
      ) {
        setError(
          "Incorrect email or password."
        );
      } else if (
        message.toLowerCase().includes("email not confirmed")
      ) {
        setError(
          "Your email has not been confirmed yet. Check your inbox or resend the confirmation email."
        );
        setConfirmationEmail(cleanEmail);
      } else {
        setError(message);
      }
    } finally {
      setLoading(false);
    }
  }

  async function handleResendConfirmation() {
    const cleanEmail = email.trim().toLowerCase();

    if (!cleanEmail) {
      setError("Enter your email address first.");
      return;
    }

    setError("");
    setSuccess("");
    setResending(true);

    try {
      const { error } = await supabase.auth.resend({
        type: "signup",
        email: cleanEmail,
        options: {
          emailRedirectTo: AUTH_REDIRECT_URL,
        },
      });

      if (error) throw error;

      setConfirmationEmail(cleanEmail);

      setSuccess(
        `A new confirmation email has been requested for ${cleanEmail}.`
      );
    } catch (err) {
      console.error(
        "hexachi confirmation email:",
        err
      );

      setError(
        err?.message ||
          "Unable to resend the confirmation email."
      );
    } finally {
      setResending(false);
    }
  }

  function switchMode(nextMode) {
    setMode(nextMode);
    setError("");
    setSuccess("");
    setConfirmationEmail("");
  }

  return (
    <div className="auth-screen">
      <div className="auth-background" />

      <div className="auth-orbit auth-orbit-one" />
      <div className="auth-orbit auth-orbit-two" />

      <main className="auth-card">

        <div className="auth-brand">
          <div className="auth-logo">H</div>

          <div>
            <strong>hexachi</strong>
            <span>COMMUNICATION</span>
          </div>
        </div>

        <div className="auth-heading">
          <small>
            {mode === "signin"
              ? "WELCOME BACK"
              : "CREATE YOUR ACCOUNT"}
          </small>

          <h1>
            {mode === "signin"
              ? "Enter hexachi."
              : "Join hexachi."}
          </h1>

          <p>
            {mode === "signin"
              ? "Sign in to continue to your hexachi workspace."
              : "Create your hexachi account and connect with people everywhere."}
          </p>
        </div>

        <div className="auth-divider">
          <span />
          <b>SECURE EMAIL AUTHENTICATION</b>
          <span />
        </div>

        <form onSubmit={handleSubmit}>

          {mode === "signup" && (
            <label className="auth-field">
              <span>DISPLAY NAME</span>

              <input
                type="text"
                placeholder="Your name"
                value={name}
                onChange={(e) =>
                  setName(e.target.value)
                }
                autoComplete="name"
                maxLength={100}
                disabled={loading}
              />
            </label>
          )}

          <label className="auth-field">
            <span>EMAIL ADDRESS</span>

            <input
              type="email"
              placeholder="you@example.com"
              value={email}
              onChange={(e) =>
                setEmail(e.target.value)
              }
              autoComplete="email"
              required
              disabled={loading}
            />
          </label>

          <label className="auth-field">
            <span>PASSWORD</span>

            <div className="password-wrap">
              <input
                type={
                  showPassword
                    ? "text"
                    : "password"
                }
                placeholder="••••••••"
                value={password}
                onChange={(e) =>
                  setPassword(e.target.value)
                }
                autoComplete={
                  mode === "signin"
                    ? "current-password"
                    : "new-password"
                }
                minLength={6}
                required
                disabled={loading}
              />

              <button
                type="button"
                onClick={() =>
                  setShowPassword((v) => !v)
                }
                disabled={loading}
              >
                {showPassword
                  ? "HIDE"
                  : "SHOW"}
              </button>
            </div>
          </label>

          {error && (
            <div className="auth-message auth-error">
              <span>!</span>
              <div>
                {error}

                {confirmationEmail && (
                  <button
                    type="button"
                    className="auth-resend-button"
                    onClick={
                      handleResendConfirmation
                    }
                    disabled={resending}
                  >
                    {resending
                      ? "SENDING..."
                      : "RESEND CONFIRMATION EMAIL"}
                  </button>
                )}
              </div>
            </div>
          )}

          {success && (
            <div className="auth-message auth-success">
              <span>✓</span>

              <div>
                {success}

                {confirmationEmail && (
                  <button
                    type="button"
                    className="auth-resend-button"
                    onClick={
                      handleResendConfirmation
                    }
                    disabled={resending}
                  >
                    {resending
                      ? "SENDING..."
                      : "RESEND EMAIL"}
                  </button>
                )}
              </div>
            </div>
          )}

          <button
            className="auth-submit"
            type="submit"
            disabled={loading || resending}
          >
            {loading
              ? "CONNECTING..."
              : mode === "signin"
                ? "SIGN IN"
                : "CREATE ACCOUNT"}

            {!loading && <span>→</span>}
          </button>
        </form>

        <div className="auth-switch">
          <span>
            {mode === "signin"
              ? "Don't have a hexachi account?"
              : "Already have a hexachi account?"}
          </span>

          <button
            type="button"
            onClick={() =>
              switchMode(
                mode === "signin"
                  ? "signup"
                  : "signin"
              )
            }
            disabled={loading}
          >
            {mode === "signin"
              ? "Create account"
              : "Sign in"}
          </button>
        </div>

        <div className="auth-footer">
          <span>HEXACHI</span>
          <i />
          <span>SUPABASE AUTH</span>
          <i />
          <span>SECURE SESSION</span>
        </div>

      </main>
    </div>
  );
}

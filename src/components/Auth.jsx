import React, { useState } from "react";
import { supabase } from "./supabase";

export default function Auth() {
  const [mode, setMode] = useState("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  async function handleSubmit(e) {
    e.preventDefault();

    setError("");
    setSuccess("");

    if (!email.trim() || !password) {
      setError("Email and password are required.");
      return;
    }

    if (password.length < 6) {
      setError("Password must contain at least 6 characters.");
      return;
    }

    setLoading(true);

    try {
      if (mode === "signin") {
        const { error } = await supabase.auth.signInWithPassword({
          email: email.trim(),
          password,
        });

        if (error) throw error;
      } else {
        const { data, error } = await supabase.auth.signUp({
          email: email.trim(),
          password,
          options: {
            data: {
              display_name: name.trim() || email.split("@")[0],
            },
          },
        });

        if (error) throw error;

        if (!data.session) {
          setSuccess(
            "Account created. Check your email to confirm your account."
          );
        }
      }
    } catch (err) {
      setError(err.message || "Authentication failed.");
    } finally {
      setLoading(false);
    }
  }

  async function handleGoogle() {
    setError("");
    setLoading(true);

    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: {
          redirectTo: window.location.origin,
        },
      });

      if (error) throw error;
    } catch (err) {
      setError(err.message || "Google authentication failed.");
      setLoading(false);
    }
  }

  function switchMode(nextMode) {
    setMode(nextMode);
    setError("");
    setSuccess("");
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
            <strong>HEXA</strong>
            <span>NEXUS</span>
          </div>
        </div>

        <div className="auth-heading">
          <small>
            {mode === "signin" ? "WELCOME BACK" : "JOIN THE NEXUS"}
          </small>

          <h1>
            {mode === "signin"
              ? "Enter your workspace."
              : "Build your world."}
          </h1>

          <p>
            {mode === "signin"
              ? "Sign in to continue to your HEXA workspace."
              : "Create your HEXA account and connect everything in one place."}
          </p>
        </div>

        <button
          className="google-button"
          type="button"
          onClick={handleGoogle}
          disabled={loading}
        >
          <span className="google-icon">G</span>
          Continue with Google
        </button>

        <div className="auth-divider">
          <span />
          <b>OR</b>
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
                onChange={(e) => setName(e.target.value)}
                autoComplete="name"
              />
            </label>
          )}

          <label className="auth-field">
            <span>EMAIL ADDRESS</span>

            <input
              type="email"
              placeholder="you@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              autoComplete="email"
            />
          </label>

          <label className="auth-field">
            <span>PASSWORD</span>

            <div className="password-wrap">
              <input
                type={showPassword ? "text" : "password"}
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete={
                  mode === "signin"
                    ? "current-password"
                    : "new-password"
                }
              />

              <button
                type="button"
                onClick={() => setShowPassword((v) => !v)}
              >
                {showPassword ? "HIDE" : "SHOW"}
              </button>
            </div>
          </label>

          {error && (
            <div className="auth-message auth-error">
              <span>!</span>
              {error}
            </div>
          )}

          {success && (
            <div className="auth-message auth-success">
              <span>✓</span>
              {success}
            </div>
          )}

          <button
            className="auth-submit"
            type="submit"
            disabled={loading}
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
              ? "Don't have a HEXA account?"
              : "Already have a HEXA account?"}
          </span>

          <button
            type="button"
            onClick={() =>
              switchMode(
                mode === "signin" ? "signup" : "signin"
              )
            }
          >
            {mode === "signin" ? "Create account" : "Sign in"}
          </button>
        </div>

        <div className="auth-footer">
          <span>HEXA CORE</span>
          <i />
          <span>SECURE SESSION</span>
        </div>
      </main>
    </div>
  );
}
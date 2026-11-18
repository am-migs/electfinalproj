import { useState } from "react";
import { Boxes, Eye, EyeOff, LoaderCircle } from "lucide-react";
import { requestPasswordReset, signIn, signUp } from "../lib/auth.js";

export default function AuthScreen() {
  const [mode, setMode] = useState("login");
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  async function submit(event) {
    event.preventDefault();
    setBusy(true); setError(""); setMessage("");
    try {
      if (mode === "register") {
        if (password.length < 8) throw new Error("Use a password with at least 8 characters.");
        if (!fullName.trim()) throw new Error("Enter your name.");
        const { data, error: authError } = await signUp({ email, password, fullName });
        if (authError) throw authError;
        setMessage(data.session
          ? "Your account is ready. Your personal workspace has been created."
          : "Registration received. Check your email to confirm your account, then sign in.");
        if (!data.session) setMode("login");
      } else {
        const { error: authError } = await signIn({ email, password });
        if (authError) throw authError;
      }
    } catch (err) {
      setError(err.message || "Unable to complete authentication.");
    } finally { setBusy(false); }
  }

  async function forgotPassword() {
    if (!email.trim()) { setError("Enter your email address first."); return; }
    setBusy(true); setError(""); setMessage("");
    try {
      const { error: authError } = await requestPasswordReset(email, window.location.origin);
      if (authError) throw authError;
      setMessage("If an account exists for that address, a password reset email has been sent.");
    } catch (err) { setError(err.message || "Unable to request a password reset."); }
    finally { setBusy(false); }
  }

  return <main className="auth-shell">
    <section className="auth-card">
      <div className="auth-brand"><div className="auth-mark"><Boxes size={25}/></div><div><h1>PCB Manager</h1><p>Component BOM & Inventory Manager</p></div></div>
      <div className="auth-heading"><h2>{mode === "register" ? "Create your account" : "Welcome back"}</h2><p>{mode === "register" ? "Create a workspace to manage your components and projects." : "Sign in to access your cloud workspace."}</p></div>
      <form onSubmit={submit} className="auth-form">
        {mode === "register" && <label>Full name<input autoComplete="name" value={fullName} onChange={e=>setFullName(e.target.value)} placeholder="Your name" required/></label>}
        <label>Email address<input type="email" autoComplete="email" value={email} onChange={e=>setEmail(e.target.value)} placeholder="you@example.com" required/></label>
        <label>Password<span className="auth-password"><input type={showPassword ? "text" : "password"} autoComplete={mode === "register" ? "new-password" : "current-password"} value={password} onChange={e=>setPassword(e.target.value)} placeholder="At least 8 characters" minLength={8} required/><button type="button" aria-label={showPassword ? "Hide password" : "Show password"} onClick={()=>setShowPassword(v=>!v)}>{showPassword ? <EyeOff size={17}/> : <Eye size={17}/>}</button></span></label>
        {mode === "login" && <button type="button" className="auth-link auth-forgot" onClick={forgotPassword} disabled={busy}>Forgot password?</button>}
        {error && <div className="auth-alert error" role="alert">{error}</div>}
        {message && <div className="auth-alert success" role="status">{message}</div>}
        <button className="auth-submit" type="submit" disabled={busy}>{busy ? <><LoaderCircle className="spin" size={17}/> Please wait…</> : mode === "register" ? "Create account" : "Sign in"}</button>
      </form>
      <p className="auth-switch">{mode === "register" ? "Already have an account?" : "New to PCB Manager?"} <button className="auth-link" onClick={()=>{setMode(mode === "register" ? "login" : "register");setError("");setMessage("");}}>{mode === "register" ? "Sign in" : "Create an account"}</button></p>
      <p className="auth-security">Secure authentication powered by Supabase</p>
    </section>
  </main>;
}

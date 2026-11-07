"use client";

import Link from "next/link";
import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { completeSignup } from "@/app/actions/auth";
import { otpRequest } from "@/lib/auth";
import { createClient } from "@/lib/supabase/client";

type Step = "email" | "verify" | "setup";

export function AuthForm({ mode }: { mode: "signin" | "signup" }) {
  const router = useRouter();
  const [state, setState] = useState<{ error?: string }>({});
  const [pending, setPending] = useState(false);
  const [step, setStep] = useState<Step>("email");
  const [email, setEmail] = useState("");
  const [useOtp, setUseOtp] = useState(mode === "signup");
  const [showPassword, setShowPassword] = useState(false);
  const emailValid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    setPending(true);
    setState({});
    try {
      const supabase = createClient();
      if (mode === "signin" && !useOtp) {
        const nextEmail = String(form.get("email") ?? "").trim();
        const password = String(form.get("password") ?? "");
        const { error } = await supabase.auth.signInWithPassword({ email: nextEmail, password });
        if (error) return setState({ error: "Email atau password tidak sesuai." });
        router.push("/kontributor");
        router.refresh();
        return;
      }
      if (step === "email") {
        const nextEmail = String(form.get("email") ?? "").trim();
        setEmail(nextEmail);
        const { error } = await supabase.auth.signInWithOtp(otpRequest(nextEmail, mode));
        if (error) return setState({ error: "Kode belum dapat dikirim. Periksa alamat email lalu coba lagi." });
        setStep("verify");
        return;
      }
      if (step === "verify") {
        const token = String(form.get("token") ?? "").trim();
        const { error } = await supabase.auth.verifyOtp({ email, token, type: "email" });
        if (error) return setState({ error: "Kode verifikasi tidak sesuai atau sudah kedaluwarsa." });
        if (mode === "signin") {
          router.push("/kontributor");
          router.refresh();
          return;
        }
        setStep("setup");
        return;
      }
      const result = await completeSignup(form);
      if (result.error) return setState(result);
      router.push("/kontributor");
      router.refresh();
    } catch {
      setState({ error: "Layanan akun sedang tidak tersedia. Coba lagi beberapa saat." });
    } finally {
      setPending(false);
    }
  }

  if (step === "verify") return <form onSubmit={submit} className="auth-form auth-verify">
    <h2>Periksa kotak masuk</h2>
    <button type="button" className="verify-email" onClick={() => setStep("email")}>{email} <span>ubah email</span></button>
    <p>Kami telah mengirim email berisi kode ke: <strong>{email}</strong></p><p>Gunakan kode terbaru sebelum kedaluwarsa.</p><p><strong>Masukkan kode 6 digit:</strong></p>
    <label>Kode verifikasi<input name="token" inputMode="numeric" autoComplete="one-time-code" pattern="[0-9]{6}" maxLength={6} required autoFocus /></label>
    {state.error && <p className="form-message error" role="alert">{state.error}</p>}
    <button className="account-continue" disabled={pending}>{pending ? "Memverifikasi…" : "Lanjutkan"}</button>
    <p className="verify-help"><strong>Belum menerima email?</strong> Periksa folder spam.</p><button type="button" className="verify-edit" onClick={() => setStep("email")}>Pastikan alamat email sudah benar</button>
  </form>;

  if (step === "setup") return <form onSubmit={submit} className="auth-form auth-setup">
    <h2>Selesaikan akunmu</h2>
    <p className="setup-email">{email}</p>
    <label>Nama lengkap<input name="full_name" autoComplete="name" minLength={2} maxLength={100} required autoFocus /></label>
    <div className="password-rules"><strong>Password harus memiliki:</strong><ul><li>Minimal 8 karakter</li><li>Minimal satu huruf</li><li>Minimal satu angka atau simbol</li></ul></div>
    <label className="password-field">Password<input name="password" type={showPassword ? "text" : "password"} autoComplete="new-password" minLength={8} required /><button type="button" onClick={() => setShowPassword(value => !value)}>{showPassword ? "Sembunyikan password" : "Tampilkan password"}</button></label>
    {state.error && <p className="form-message error" role="alert">{state.error}</p>}
    <button className="account-continue" disabled={pending}>{pending ? "Menyimpan…" : "Buat akun"}</button>
  </form>;

  return <form onSubmit={submit} className="auth-form">
    <label className={emailValid ? "valid-email" : ""}>Email<input name="email" type="email" autoComplete="email" required autoFocus value={email} onChange={event => setEmail(event.target.value)} />{emailValid && <span className="email-valid">✓</span>}</label>
    {mode === "signin" && !useOtp && <label className="password-field">Password<input name="password" type={showPassword ? "text" : "password"} autoComplete="current-password" required /><button type="button" onClick={() => setShowPassword(value => !value)}>{showPassword ? "Sembunyikan password" : "Tampilkan password"}</button></label>}
    {state.error && <p className="form-message error" role="alert">{state.error}</p>}
    <button className="account-continue" disabled={pending}>{pending ? "Memproses…" : mode === "signin" && !useOtp ? "Masuk" : "Kirim kode"}</button>
    {mode === "signin" && <button type="button" className="auth-method-toggle" onClick={() => { setUseOtp(value => !value); setState({}); }}>{useOtp ? "Masuk dengan password" : "Masuk dengan kode email"}</button>}
    <p className="auth-switch"><Link href={mode === "signin" ? "/daftar" : "/masuk"}>{mode === "signin" ? "Belum memiliki akun? Daftar" : "Sudah memiliki akun?"}</Link></p>
  </form>;
}

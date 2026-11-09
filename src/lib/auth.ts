export function otpRequest(email: string, mode: "signin" | "signup") {
  return { email, options: { shouldCreateUser: mode === "signup", ...(mode === "signup" ? { data: { full_name: email.split("@")[0] } } : {}) } };
}

export function accountDetails(firstName: string, lastName: string, password: string) {
  const first = firstName.trim().replace(/\s+/g, " ");
  const last = lastName.trim().replace(/\s+/g, " ");
  const name = [first, last].filter(Boolean).join(" ");
  if (first.length < 2 || first.length > 100 || last.length > 100) return { error: "Nama depan harus 2–100 karakter dan nama belakang maksimal 100 karakter." };
  if (password.length < 8 || !/[A-Za-z]/.test(password) || !/(?:[0-9]|[^A-Za-z0-9\s])/.test(password)) {
    return { error: "Password minimal 8 karakter serta memiliki huruf dan angka atau simbol." };
  }
  return { name, first, last, password };
}

export function otpRequest(email: string, mode: "signin" | "signup") {
  return { email, options: { shouldCreateUser: mode === "signup", ...(mode === "signup" ? { data: { full_name: email.split("@")[0] } } : {}) } };
}

export function accountDetails(fullName: string, password: string) {
  const name = fullName.trim().replace(/\s+/g, " ");
  if (name.length < 2 || name.length > 100) return { error: "Nama lengkap harus terdiri dari 2–100 karakter." };
  if (password.length < 8 || !/[A-Za-z]/.test(password) || !/(?:[0-9]|[^A-Za-z0-9\s])/.test(password)) {
    return { error: "Password minimal 8 karakter serta memiliki huruf dan angka atau simbol." };
  }
  return { name, password };
}

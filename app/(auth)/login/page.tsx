"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { createClient } from "@/lib/supabase/client"

export default function LoginPage() {
  const supabase = createClient()
  const router = useRouter()

  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [message, setMessage] = useState("")

  // SIGN UP
  const signUp = async () => {
    const { error } = await supabase.auth.signUp({
      email,
      password,
    })

    if (error) {
      alert(error.message)
      return
    }

    alert("Account created. Now log in.")
  }

  // LOGIN
  const login = async () => {
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    })

    if (error) {
      alert("Invalid login credentials")
      return
    }

    router.push("/dashboard") // ✅ redirect after login
  }

  // RESET PASSWORD
  const resetPassword = async () => {
    const { error } = await supabase.auth.resetPasswordForEmail(email)

    if (error) {
      alert(error.message)
      return
    }

    setMessage("Password reset email sent.")
  }

  return (
    <div style={{ padding: 20 }}>
      <h2>Login</h2>

      <input
        placeholder="Email"
        onChange={(e) => setEmail(e.target.value)}
      />
      <br /><br />

      <input
        placeholder="Password"
        type="password"
        onChange={(e) => setPassword(e.target.value)}
      />
      <br /><br />

      <button onClick={signUp}>Sign Up</button>
      <button onClick={login}>Login</button>

      <br /><br />

      <button onClick={resetPassword} style={{ fontSize: 12 }}>
        Forgot password?
      </button>

      <br /><br />

      {message && <p>{message}</p>}
    </div>
  )
}
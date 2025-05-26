'use client'
import React, { useState } from "react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"

export default function LoginForm({
  className,
  ...props
}: React.ComponentPropsWithoutRef<"form">) {
  const [email, setEmail] = useState('');
const [selectedCompany, setSelectedCompany] = useState('');
  const [password, setPassword] = useState('');
  const [acceptTerms, setAcceptTerms] = useState(false);
  const [loading, setLoading] = useState(false);

  const [emailError, setEmailError] = useState('');
  const [passwordError, setPasswordError] = useState('');
  const [generalError, setGeneralError] = useState('');

  const validateEmail = (value: string) => {
    // Simple email regex
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setEmailError('');
    setPasswordError('');
    setGeneralError('');
    let valid = true;

    if (!email) {
      setEmailError('Email is required.');
      valid = false;
    } else if (!validateEmail(email)) {
      setEmailError('Please enter a valid email address.');
      valid = false;
    }

    if (!password) {
      setPasswordError('Password is required.');
      valid = false;
    } else if (password.length < 6) {
      setPasswordError('Password must be at least 6 characters.');
      valid = false;
    }

    if (!valid) {
      return;
    }

    setLoading(true);
    // Simulate async auth and error
    setTimeout(() => {
      setLoading(false);
      // Simulate wrong credentials
      if (email !== "user@example.com" || password !== "password123") {
        setGeneralError("Invalid email or password.");
        setPasswordError(" ");
      }
    }, 1000);
  };

  return (
    <form className={cn("flex flex-col gap-6", className)} onSubmit={handleSubmit} {...props}>
      <div className="flex flex-col items-center gap-2 text-center">
        <h1 className="text-2xl font-bold">Register Account</h1>
        <p className="text-balance text-sm text-muted-foreground">
          Enter your email below to login to your account
        </p>
      </div>
      <div className="grid gap-6">
  <div className="grid gap-2">
    <Label htmlFor="company">Select Company</Label>
    <select
      id="company"
      className="border rounded-md p-2"
      value={selectedCompany}
      onChange={(e) => setSelectedCompany(e.target.value)}
      required
    >
      <option value="" disabled>Select a company</option>
      <option value="Company A">Company A</option>
      <option value="Company B">Company B</option>
      <option value="Company C">Company C</option>
      <option value="Company D">Company D</option>
      <option value="Company E">Company E</option>
      <option value="Company F">Company F</option>
      <option value="Company G">Company G</option>
      <option value="Company H">Company H</option>
      <option value="Company I">Company I</option>
      <option value="Company J">Company J</option>
    </select>
  </div>
        <div className="grid gap-2">
          <Label htmlFor="email">Email</Label>
          <Input
            id="email"
            type="email"
            placeholder="m@example.com"
            value={email}
            onChange={e => {
              setEmail(e.target.value);
              setEmailError('');
              setGeneralError('');
            }}
            required
            aria-invalid={!!emailError}
            aria-describedby="email-error"
          />
          {emailError && (
            <span id="email-error" className="text-red-500 text-xs mt-1">
              {emailError}
            </span>
          )}
        </div>
        <div className="grid gap-2">
          <div className="flex items-center">
            <Label htmlFor="password">Password</Label>
          </div>
          <Input
            id="password"
            type="password"
            value={password}
            onChange={e => {
              setPassword(e.target.value);
              setPasswordError('');
              setGeneralError('');
            }}
            required
            aria-invalid={!!passwordError}
            aria-describedby="password-error"
          />
          {passwordError && (
            <span id="password-error" className="text-red-500 text-xs mt-1">
              {passwordError}
            </span>
          )}
<div className="flex items-center gap-2 mt-2">
  <input
    id="acceptTerms"
    type="checkbox"
    className="accent-primary"
    checked={acceptTerms}
    onChange={() => setAcceptTerms(!acceptTerms)}
    required
    aria-invalid={!acceptTerms}
    aria-describedby="terms-error"
  />
  <Label htmlFor="acceptTerms">Accept Terms and Conditions</Label>
</div>
          {generalError && (
            <span className="text-red-500 text-xs mt-2 block text-center">
              {generalError}
            </span>
          )}
        </div>
        <Button type="submit" className="w-full" disabled={loading}>
          {loading ? "Loading..." : "Login"}
        </Button>
        <div className="relative text-center text-sm after:absolute after:inset-0 after:top-1/2 after:z-0 after:flex after:items-center after:border-t after:border-border">
          <span className="relative z-10 bg-background px-2 text-muted-foreground">
            Or continue with
          </span>
        </div>
        <Button variant="outline" className="w-full flex items-center justify-center gap-2">
          <img src="/github.svg" alt="GitHub logo" className="h-6 w-6" />
          Login with GitHub
        </Button>
        <Button variant="outline" className="w-full flex items-center justify-center gap-2">
          <img src="/google_icon.svg" alt="Google logo" className="h-6 w-6" />
          Login with Google
        </Button>
      </div>
      <div className="text-center text-sm">
        Don&apos;t have an account?{" "}
        <a href="#" className="underline underline-offset-4">
          Sign up
        </a>
      </div>
    </form>
  )
}

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
  const [confirmPassword, setConfirmPassword] = useState('');
  const [confirmPasswordError, setConfirmPasswordError] = useState('');
  const [loading, setLoading] = useState(false);
  const [emailError, setEmailError] = useState('');
  const [passwordError, setPasswordError] = useState('');
  const [generalError, setGeneralError] = useState('');
  const [passwordStrength, setPasswordStrength] = useState('Weak');
  const [showPasswordStrength, setShowPasswordStrength] = useState(false);
  const [showEmailValidation, setShowEmailValidation] = useState(false);
  const [emailRequirements, setEmailRequirements] = useState({
    format: false,
    domain: false,
    noSpaces: false,
  });
  const [passwordRequirements, setPasswordRequirements] = useState({
    length: false,
    uppercase: false,
    lowercase: false,
    number: false,
    specialChar: false,
  });

  const evaluatePasswordStrength = (password: string) => {
    const requirements = {
      length: password.length >= 8,
      uppercase: /[A-Z]/.test(password),
      lowercase: /[a-z]/.test(password),
      number: /[0-9]/.test(password),
      specialChar: /[!@#$%^&*(),.?":{}|<>]/.test(password),
    };

    setPasswordRequirements(requirements);

    const metRequirements = Object.values(requirements).filter(Boolean).length;

    if (metRequirements <= 2) {
      setPasswordStrength('Weak');
    } else if (metRequirements === 3 || metRequirements === 4) {
      setPasswordStrength('Moderate');
    } else {
      setPasswordStrength('Strong');
    }
  };

  const validateEmail = (value: string) => {
    const requirements = {
      format: /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value),
      domain: /^[^\s@]+@[^\s@]+\.[a-zA-Z]{2,}$/.test(value),
      noSpaces: !/\s/.test(value),
    };
    
    setEmailRequirements(requirements);
    return requirements.format && requirements.domain && requirements.noSpaces;
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

    if (password !== confirmPassword) {
      setConfirmPasswordError('Passwords do not match.');
      valid = false;
    }

    if (!valid) {
      setConfirmPasswordError('');
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
            placeholder="mail@example.com"
            value={email}
            onChange={e => {
              setEmail(e.target.value);
              setEmailError('');
              setGeneralError('');
              validateEmail(e.target.value);
              setShowEmailValidation(true);
            }}
            onFocus={() => setShowEmailValidation(true)}
            onBlur={() => {
              if (!email) setShowEmailValidation(false);
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
          <div className={`mt-2 space-y-2 transition-all duration-300 ease-in-out ${
            showEmailValidation 
              ? 'opacity-100 translate-y-0 max-h-[200px]' 
              : 'opacity-0 -translate-y-2 max-h-0 overflow-hidden'
          }`}>
            <div className="grid gap-1 text-xs">
              <div className="flex items-center gap-1.5">
                <div className={`size-1.5 rounded-full transition-colors duration-300 ${
                  emailRequirements.format ? 'bg-green-500' : 'bg-muted'
                }`} />
                <span className={`transition-colors duration-300 ${
                  emailRequirements.format ? 'text-green-500' : 'text-muted-foreground'
                }`}>
                  Valid email format (example@domain.com)
                </span>
              </div>
              <div className="flex items-center gap-1.5">
                <div className={`size-1.5 rounded-full transition-colors duration-300 ${
                  emailRequirements.domain ? 'bg-green-500' : 'bg-muted'
                }`} />
                <span className={`transition-colors duration-300 ${
                  emailRequirements.domain ? 'text-green-500' : 'text-muted-foreground'
                }`}>
                  Valid domain extension (.com, .org, etc.)
                </span>
              </div>
              <div className="flex items-center gap-1.5">
                <div className={`size-1.5 rounded-full transition-colors duration-300 ${
                  emailRequirements.noSpaces ? 'bg-green-500' : 'bg-muted'
                }`} />
                <span className={`transition-colors duration-300 ${
                  emailRequirements.noSpaces ? 'text-green-500' : 'text-muted-foreground'
                }`}>
                  No spaces allowed
                </span>
              </div>
            </div>
          </div>
        </div>
        <div className="grid gap-2">
          <div className="flex items-center">
            <Label htmlFor="password">Password</Label>
          </div>
          <Input
            id="password"
            type="password"
            placeholder="Enter your password"
            value={password}
            onChange={e => {
              setPassword(e.target.value);
              setPasswordError('');
              setGeneralError('');
              evaluatePasswordStrength(e.target.value);
              setShowPasswordStrength(true);
            }}
            onFocus={() => setShowPasswordStrength(true)}
            onBlur={() => {
              if (!password) setShowPasswordStrength(false);
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
          <div className={`mt-2 space-y-2 transition-all duration-300 ease-in-out ${
            showPasswordStrength 
              ? 'opacity-100 translate-y-0 max-h-[200px]' 
              : 'opacity-0 -translate-y-2 max-h-0 overflow-hidden'
          }`}>
            <div className="flex items-center gap-2">
              <div className="h-1.5 flex-1 rounded-full bg-muted overflow-hidden">
                <div 
                  className={`h-full transition-all duration-300 ${
                    passwordStrength === 'Weak' ? 'w-1/3 bg-red-500' : 
                    passwordStrength === 'Moderate' ? 'w-2/3 bg-yellow-500' : 
                    'w-full bg-green-500'
                  }`}
                />
              </div>
              <span className={`text-xs font-medium ${
                passwordStrength === 'Weak' ? 'text-red-500' : 
                passwordStrength === 'Moderate' ? 'text-yellow-500' : 
                'text-green-500'
              }`}>
                {passwordStrength}
              </span>
            </div>
            <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-xs">
              <div className="flex items-center gap-1.5">
                <div className={`size-1.5 rounded-full transition-colors duration-300 ${
                  passwordRequirements.length ? 'bg-green-500' : 'bg-muted'
                }`} />
                <span className={`transition-colors duration-300 ${
                  passwordRequirements.length ? 'text-green-500' : 'text-muted-foreground'
                }`}>
                  8+ characters
                </span>
              </div>
              <div className="flex items-center gap-1.5">
                <div className={`size-1.5 rounded-full transition-colors duration-300 ${
                  passwordRequirements.uppercase ? 'bg-green-500' : 'bg-muted'
                }`} />
                <span className={`transition-colors duration-300 ${
                  passwordRequirements.uppercase ? 'text-green-500' : 'text-muted-foreground'
                }`}>
                  Uppercase
                </span>
              </div>
              <div className="flex items-center gap-1.5">
                <div className={`size-1.5 rounded-full transition-colors duration-300 ${
                  passwordRequirements.lowercase ? 'bg-green-500' : 'bg-muted'
                }`} />
                <span className={`transition-colors duration-300 ${
                  passwordRequirements.lowercase ? 'text-green-500' : 'text-muted-foreground'
                }`}>
                  Lowercase
                </span>
              </div>
              <div className="flex items-center gap-1.5">
                <div className={`size-1.5 rounded-full transition-colors duration-300 ${
                  passwordRequirements.number ? 'bg-green-500' : 'bg-muted'
                }`} />
                <span className={`transition-colors duration-300 ${
                  passwordRequirements.number ? 'text-green-500' : 'text-muted-foreground'
                }`}>
                  Number
                </span>
              </div>
              <div className="flex items-center gap-1.5">
                <div className={`size-1.5 rounded-full transition-colors duration-300 ${
                  passwordRequirements.specialChar ? 'bg-green-500' : 'bg-muted'
                }`} />
                <span className={`transition-colors duration-300 ${
                  passwordRequirements.specialChar ? 'text-green-500' : 'text-muted-foreground'
                }`}>
                  Special char
                </span>
              </div>
            </div>
          </div>
        </div>
        <div className="grid gap-2">
          <div className="flex items-center">
            <Label htmlFor="confirmPassword">Confirm Password</Label>
          </div>
          <Input
            id="confirmPassword"
            type="password"
            placeholder="Confirm your password"
            value={confirmPassword}
            onChange={e => {
              setConfirmPassword(e.target.value);
              setConfirmPasswordError('');
              setGeneralError('');
            }}
            required
            aria-invalid={!!confirmPasswordError}
            aria-describedby="confirm-password-error"
          />
          {confirmPasswordError && (
            <span id="confirm-password-error" className="text-red-500 text-xs mt-1">
              {confirmPasswordError}
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

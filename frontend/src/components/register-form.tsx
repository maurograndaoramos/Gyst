'use client'
import React, { useState } from "react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"

export default function RegisterForm({
  className,
  ...props
}: React.ComponentPropsWithoutRef<"form">) {
  const [email, setEmail] = useState('');
  const [organizationName, setOrganizationName] = useState('');
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
    setConfirmPasswordError('');
    let valid = true;

    if (!email) {
      setEmailError('Email is required.');
      valid = false;
    } else if (!validateEmail(email)) {
      setEmailError('Please enter a valid email address.');
      valid = false;
    }

    if (!organizationName) {
      setGeneralError('Organization name is required.');
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

    if (!acceptTerms) {
      setGeneralError('You must accept the terms and conditions.');
      valid = false;
    }

    if (!valid) {
      return;
    }

    setLoading(true);
    
    try {
      const response = await fetch('/api/auth/register', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email,
          password,
          name: email.split('@')[0], // Use email prefix as name
          company: organizationName,
          role: 'owner', // Set initial role as owner
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        setGeneralError(data.error || 'Registration failed');
        return;
      }

      // Registration successful - automatically sign in and redirect to dashboard
      setGeneralError('');
      
      // Automatically sign in the user
      const { signIn } = await import('next-auth/react');
      const result = await signIn('credentials', {
        email,
        password,
        redirect: false,
      });

      if (result?.ok) {
        // Redirect to organization dashboard
        window.location.href = `/${data.user.organizationId}/dashboard`;
      } else {
        // If auto-login fails, redirect to login with success message
        alert('Registration successful! Please log in.');
        window.location.href = '/login';
      }
      
    } catch (error) {
      console.error('Registration error:', error);
      setGeneralError('Network error. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <form className={cn("flex flex-col gap-6", className)} onSubmit={handleSubmit} {...props}>
      <div className="flex flex-col items-center gap-2 text-center">
        <h1 className="text-2xl font-bold">Create Your Organization</h1>
        <p className="text-balance text-sm text-muted-foreground">
          Register as an organization owner to get started
        </p>
      </div>
      <div className="grid gap-6">
        <div className="grid gap-2">
          <Label htmlFor="organizationName">Organization Name</Label>
          <Input
            id="organizationName"
            type="text"
            placeholder="Enter your organization name"
            value={organizationName}
            onChange={e => {
              setOrganizationName(e.target.value);
              setGeneralError('');
            }}
            required
          />
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
          {loading ? "Creating Organization..." : "Create Organization"}
        </Button>
      </div>
    </form>
  );
}

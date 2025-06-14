'use client'
import React, { useState } from "react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { useAuth } from "@/hooks/use-auth"

export function LoginForm({
  className,
  ...props
}: React.ComponentPropsWithoutRef<"form">) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [rememberMe, setRememberMe] = useState(false);
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
    
    try {
      const { signIn } = await import('next-auth/react');
      const result = await signIn('credentials', {
        email,
        password,
        redirect: false,
      });

      if (result?.ok) {
        // Redirect to callback page which will handle session initialization
        window.location.href = '/auth/callback';
      } else if (result?.error === 'CredentialsSignin') {
        setGeneralError('Invalid email or password.');
      } else {
        setGeneralError('An error occurred during login. Please try again.');
      }
    } catch (error) {
      console.error('Login error:', error);
      setGeneralError('Network error. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <form className={cn("flex flex-col gap-6", className)} onSubmit={handleSubmit} {...props}>
      <div className="flex flex-col items-center gap-2 text-center">
        <h1 className="text-2xl font-bold">Login to your account</h1>
        <p className="text-balance text-sm text-muted-foreground">
          Enter your email below to login to your account
        </p>
      </div>
      <div className="grid gap-6">
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
            <a
              href="#"
              className="ml-auto text-sm underline-offset-4 hover:underline"
            >
              Forgot your password?
            </a>
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
              id="rememberMe"
              type="checkbox"
              className="accent-primary"
              checked={rememberMe}
              onChange={() => setRememberMe(!rememberMe)}
            />
            <Label htmlFor="rememberMe">Remember me</Label>
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
        <Button 
          type="button"
          variant="outline" 
          className="w-full flex items-center justify-center gap-2"
          onClick={async () => {
            try {
              const { signIn } = await import('next-auth/react');
              await signIn('github', { callbackUrl: '/' });
            } catch (error) {
              console.error('GitHub sign in error:', error);
              setGeneralError('Failed to sign in with GitHub. Please try again.');
            }
          }}
        >
          <img src="/github.svg" alt="GitHub logo" className="h-6 w-6" />
          Login with GitHub
        </Button>
        <Button 
          type="button"
          variant="outline" 
          className="w-full flex items-center justify-center gap-2"
          onClick={async () => {
            try {
              const { signIn } = await import('next-auth/react');
              await signIn('google', { callbackUrl: '/' });
            } catch (error) {
              console.error('Google sign in error:', error);
              setGeneralError('Failed to sign in with Google. Please try again.');
            }
          }}
        >
          <img src="/google_icon.svg" alt="Google logo" className="h-6 w-6" />
          Login with Google
        </Button>
      </div>
      <div className="text-center text-sm">
        Don&apos;t have an account?{" "}
        <a href="/register" className="underline underline-offset-4">
          Sign up
        </a>
      </div>
    </form>
  )
}

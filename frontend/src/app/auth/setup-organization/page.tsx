'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useSession } from 'next-auth/react'
import { motion, AnimatePresence } from 'framer-motion'
import { Building2, Sparkles, CheckCircle, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { cn } from '@/lib/utils'

type SetupState = 'welcome' | 'form' | 'creating' | 'success' | 'error'

export default function SetupOrganizationPage() {
  const [state, setState] = useState<SetupState>('welcome')
  const [organizationName, setOrganizationName] = useState('')
  const [error, setError] = useState('')
  const [isValidating, setIsValidating] = useState(false)
  const router = useRouter()
  const { data: session, update } = useSession()

  // Welcome animation delay
  useEffect(() => {
    const timer = setTimeout(() => {
      setState('form')
    }, 1500)
    return () => clearTimeout(timer)
  }, [])

  const validateName = (name: string) => {
    if (!name.trim()) return 'Organization name is required'
    if (name.trim().length < 2) return 'Organization name must be at least 2 characters'
    if (name.trim().length > 50) return 'Organization name must be less than 50 characters'
    if (!/^[a-zA-Z0-9\s\-\_\.]+$/.test(name.trim())) return 'Organization name contains invalid characters'
    return null
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    const validationError = validateName(organizationName)
    if (validationError) {
      setError(validationError)
      return
    }

    setState('creating')
    setError('')

    try {
      const response = await fetch('/api/auth/setup-organization', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          organizationName: organizationName.trim() 
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to create organization')
      }

      setState('success')

      // Update the session with the new organization
      await update({
        organizationId: data.organizationId
      })

      // Redirect to dashboard after celebration
      setTimeout(() => {
        router.push(`/${data.organizationId}/dashboard`)
      }, 2000)

    } catch (error) {
      console.error('Organization creation error:', error)
      setError(error instanceof Error ? error.message : 'Failed to create organization')
      setState('error')
    }
  }

  const handleNameChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value
    setOrganizationName(value)
    setError('')

    // Real-time validation with debounce
    if (value.trim()) {
      setIsValidating(true)
      setTimeout(() => {
        const validationError = validateName(value)
        if (validationError) {
          setError(validationError)
        }
        setIsValidating(false)
      }, 300)
    }
  }

  const pageVariants = {
    initial: { opacity: 0, y: 20 },
    animate: { opacity: 1, y: 0 },
    exit: { opacity: 0, y: -20 }
  }

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        delayChildren: 0.2,
        staggerChildren: 0.1
      }
    }
  }

  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: {
      opacity: 1,
      y: 0,
      transition: {
        type: "spring",
        damping: 12,
        stiffness: 200
      }
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100 dark:from-slate-950 dark:via-slate-900 dark:to-slate-800 relative overflow-hidden">
      {/* Background decorations */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-blue-400/20 rounded-full blur-3xl animate-pulse" />
        <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-indigo-400/20 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '1s' }} />
        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-purple-400/10 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '2s' }} />
      </div>

      <div className="relative z-10 flex items-center justify-center min-h-screen px-4">
        <div className="w-full max-w-md">
          <AnimatePresence mode="wait">
            {state === 'welcome' && (
              <motion.div
                key="welcome"
                variants={pageVariants}
                initial="initial"
                animate="animate"
                exit="exit"
                transition={{ duration: 0.5 }}
                className="text-center"
              >
                <motion.div
                  animate={{ 
                    scale: [1, 1.1, 1],
                    rotate: [0, 5, -5, 0]
                  }}
                  transition={{ 
                    duration: 2,
                    repeat: Infinity,
                    repeatType: "reverse"
                  }}
                  className="mx-auto w-20 h-20 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-2xl flex items-center justify-center mb-6 shadow-xl"
                >
                  <Sparkles className="w-10 h-10 text-white" />
                </motion.div>
                <motion.h1
                  animate={{ opacity: [0.7, 1, 0.7] }}
                  transition={{ duration: 2, repeat: Infinity }}
                  className="text-3xl font-bold text-slate-800 dark:text-slate-200"
                >
                  Welcome aboard! ✨
                </motion.h1>
                <motion.p
                  animate={{ opacity: [0.5, 0.8, 0.5] }}
                  transition={{ duration: 2, repeat: Infinity, delay: 0.5 }}
                  className="text-slate-600 dark:text-slate-400 mt-2"
                >
                  Let's set up your organization...
                </motion.p>
              </motion.div>
            )}

            {state === 'form' && (
              <motion.div
                key="form"
                variants={containerVariants}
                initial="hidden"
                animate="visible"
                exit="exit"
                className="bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl rounded-3xl p-8 shadow-2xl border border-white/20 dark:border-slate-700/50"
              >
                <motion.div variants={itemVariants} className="text-center mb-8">
                  <div className="mx-auto w-16 h-16 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-2xl flex items-center justify-center mb-4 shadow-lg">
                    <Building2 className="w-8 h-8 text-white" />
                  </div>
                  <h1 className="text-3xl font-bold text-slate-800 dark:text-slate-200 mb-2">
                    Create Your Organization
                  </h1>
                  <p className="text-slate-600 dark:text-slate-400">
                    Choose a name for your organization. You can always change this later.
                  </p>
                </motion.div>

                <form onSubmit={handleSubmit} className="space-y-6">
                  <motion.div variants={itemVariants} className="space-y-2">
                    <Label htmlFor="organizationName" className="text-sm font-medium text-slate-700 dark:text-slate-300">
                      Organization Name
                    </Label>
                    <div className="relative">
                      <Input
                        id="organizationName"
                        type="text"
                        value={organizationName}
                        onChange={handleNameChange}
                        placeholder="Enter your organization name"
                        className={cn(
                          "h-12 text-lg transition-all duration-200",
                          "border-2 border-slate-200 dark:border-slate-700",
                          "focus:border-blue-500 focus:ring-blue-500",
                          "bg-white/50 dark:bg-slate-800/50",
                          "placeholder:text-slate-400 dark:placeholder:text-slate-500",
                          error && "border-red-500 focus:border-red-500 focus:ring-red-500"
                        )}
                        autoFocus
                        disabled={state !== 'form'}
                      />
                      {isValidating && (
                        <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
                          <Loader2 className="w-4 h-4 animate-spin text-slate-400" />
                        </div>
                      )}
                    </div>
                    {error && (
                      <motion.p
                        initial={{ opacity: 0, y: -10 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="text-sm text-red-600 dark:text-red-400"
                      >
                        {error}
                      </motion.p>
                    )}
                    <p className="text-xs text-slate-500 dark:text-slate-400">
                      💡 Examples: "Acme Inc", "Design Studio", "My Company"
                    </p>
                  </motion.div>

                  <motion.div variants={itemVariants}>
                    <Button
                      type="submit"
                      disabled={!organizationName.trim() || !!error || isValidating || (state !== 'form')}
                      className={cn(
                        "w-full h-12 text-lg font-semibold",
                        "bg-gradient-to-r from-blue-500 to-indigo-600",
                        "hover:from-blue-600 hover:to-indigo-700",
                        "transform transition-all duration-200",
                        "hover:scale-[1.02] active:scale-[0.98]",
                        "shadow-lg hover:shadow-xl",
                        "disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100"
                      )}
                    >
                      {state !== 'form' ? (
                        <div className="flex items-center gap-2">
                          <Loader2 className="w-5 h-5 animate-spin" />
                          Creating Organization...
                        </div>
                      ) : (
                        <div className="flex items-center gap-2">
                          <Building2 className="w-5 h-5" />
                          Create Organization
                        </div>
                      )}
                    </Button>
                  </motion.div>
                </form>
              </motion.div>
            )}

            {state === 'creating' && (
              <motion.div
                key="creating"
                variants={pageVariants}
                initial="initial"
                animate="animate"
                exit="exit"
                className="text-center"
              >
                <motion.div
                  animate={{ rotate: 360 }}
                  transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
                  className="mx-auto w-20 h-20 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-2xl flex items-center justify-center mb-6 shadow-xl"
                >
                  <Building2 className="w-10 h-10 text-white" />
                </motion.div>
                <h2 className="text-2xl font-bold text-slate-800 dark:text-slate-200 mb-2">
                  Creating Your Organization
                </h2>
                <p className="text-slate-600 dark:text-slate-400">
                  Setting up everything for "{organizationName}"...
                </p>
                <motion.div
                  animate={{ scale: [1, 1.05, 1] }}
                  transition={{ duration: 1.5, repeat: Infinity }}
                  className="mt-4"
                >
                  <Loader2 className="w-8 h-8 animate-spin mx-auto text-blue-500" />
                </motion.div>
              </motion.div>
            )}

            {state === 'success' && (
              <motion.div
                key="success"
                variants={pageVariants}
                initial="initial"
                animate="animate"
                exit="exit"
                className="text-center"
              >
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ 
                    type: "spring",
                    damping: 15,
                    stiffness: 300,
                    delay: 0.2
                  }}
                  className="mx-auto w-20 h-20 bg-gradient-to-br from-green-500 to-emerald-600 rounded-2xl flex items-center justify-center mb-6 shadow-xl"
                >
                  <CheckCircle className="w-10 h-10 text-white" />
                </motion.div>
                <motion.h2
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.4 }}
                  className="text-3xl font-bold text-slate-800 dark:text-slate-200 mb-2"
                >
                  🎉 Organization Created!
                </motion.h2>
                <motion.p
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.6 }}
                  className="text-slate-600 dark:text-slate-400 mb-4"
                >
                  Welcome to "{organizationName}"! Redirecting to your dashboard...
                </motion.p>
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.8 }}
                  className="flex items-center justify-center gap-1"
                >
                  {[0, 1, 2].map((i) => (
                    <motion.div
                      key={i}
                      animate={{ 
                        scale: [1, 1.2, 1],
                        opacity: [0.5, 1, 0.5]
                      }}
                      transition={{
                        duration: 1,
                        repeat: Infinity,
                        delay: i * 0.2
                      }}
                      className="w-2 h-2 bg-green-500 rounded-full"
                    />
                  ))}
                </motion.div>
              </motion.div>
            )}

            {state === 'error' && (
              <motion.div
                key="error"
                variants={pageVariants}
                initial="initial"
                animate="animate"
                exit="exit"
                className="text-center"
              >
                <div className="mx-auto w-20 h-20 bg-gradient-to-br from-red-500 to-red-600 rounded-2xl flex items-center justify-center mb-6 shadow-xl">
                  <Building2 className="w-10 h-10 text-white" />
                </div>
                <h2 className="text-2xl font-bold text-slate-800 dark:text-slate-200 mb-2">
                  Something went wrong
                </h2>
                <p className="text-red-600 dark:text-red-400 mb-4">{error}</p>
                <Button
                  onClick={() => setState('form')}
                  variant="outline"
                  className="border-red-300 text-red-600 hover:bg-red-50"
                >
                  Try Again
                </Button>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  )
}

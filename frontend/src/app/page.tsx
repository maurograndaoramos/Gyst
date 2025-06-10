


"use client"
import React from "react"
import { Button } from "@/components/ui/button"
import { Flag, Brain, Zap } from "lucide-react"
import { useRouter } from "next/navigation"
import { useAuth } from '@/hooks/use-auth'
import { LoadingSpinner } from '@/components/auth/loading-spinner'
import { UserHeader } from '@/components/user-header'
import { UploadSection } from '@/components/upload-section'
import LandingPage from './landing/page'
import { motion, useScroll, useTransform, useInView } from "framer-motion"
import { useRef, useEffect, useState } from "react"
import { AnimatedSection } from '@/components/animated-section'
import { AnimatedFeatureCard } from '@/components/animated-feature-card'

export default function Component() {
  const router = useRouter()
  const { scrollYProgress } = useScroll()
  const [isVisible, setIsVisible] = useState(false)

  const { isLoading, isAuthenticated, role } = useAuth()

  // Smooth reveal on page load
  useEffect(() => {
    const timer = setTimeout(() => setIsVisible(true), 100)
    return () => clearTimeout(timer)
  }, [])

  // Parallax transforms
  const heroY = useTransform(scrollYProgress, [0, 1], [0, -50])
  const demoY = useTransform(scrollYProgress, [0, 1], [0, -100])

  // if (isLoading) {
  //   return (
  //     <div className="min-h-screen flex items-center justify-center">
  //       <LoadingSpinner />
  //     </div>
  //   )
  // }

  // // Show landing page for unauthenticated users
  // if (!isAuthenticated) {
  //   return <LandingPage />
  // }



  return (
    <motion.div 
      className="min-h-screen text-gray-900"
      initial={{ opacity: 0 }}
      animate={{ opacity: isVisible ? 1 : 0 }}
      transition={{ duration: 0.8, ease: "easeOut" }}
    >
      {/* Header */}
      <motion.header 
        className="bg-gray-50 border-b border-gray-200 sticky top-0 z-50 backdrop-blur-sm bg-gray-50/95"
        initial={{ y: -100 }}
        animate={{ y: 0 }}
        transition={{ duration: 0.6, ease: "easeOut" }}
      >
        <div className="max-w-7xl mx-auto flex items-center justify-between px-6 py-4">
          <motion.div 
            className="flex items-center gap-2"
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.6, delay: 0.3 }}
          >
            <motion.img 
              src="/gyst-remake-flip.png" 
              className="w-8 h-8" 
              alt=""
              whileHover={{ rotate: 360 }}
              transition={{ duration: 0.5 }}
            />
            <span className="text-xl font-bold text-gray-900">GYST</span>
          </motion.div>

          <motion.div 
            className="flex items-center gap-3"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.6, delay: 0.3 }}
          >
            <Button 
             onClick={() => { router.push('/login'); }}
            variant="ghost" className="text-gray-700 hover:bg-gray-100 rounded-full px-6 transition-all duration-300 hover:scale-105">
              Login
            </Button>
            <motion.div
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
            >
              <Button className="bg-purple-600 hover:bg-purple-700 text-white rounded-full px-6 transition-all duration-300"
               onClick={() => { router.push('/register'); }}>Get Started Free</Button>
            </motion.div>
          </motion.div>
        </div>
      </motion.header>

      {/* Hero Section */}
      <section className="bg-gradient-to-b from-white via-gray-50 via-gray-100 to-gray-200 py-10 relative overflow-hidden">
        <motion.div 
          className="max-w-7xl mx-auto px-6"
          style={{ y: heroY }}
        >
          <motion.div 
            className="text-center mb-16"
            initial={{ opacity: 0, y: 50 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.4 }}
          >
            <motion.p 
              className="text-gray-600 text-lg mb-6"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.6, delay: 0.6 }}
            >
              Introducing GYST
            </motion.p>

            <motion.h1 
              className="text-4xl sm:text-4xl md:text-5xl lg:text-6xl font-bold leading-tight mb-8 text-gray-900"
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: 0.7 }}
            >
              <span className="block sm:inline">Find <motion.span 
                className="text-purple-600"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.5, delay: 1.2 }}
              >Answers</motion.span></span>{" "}
              <span className="block sm:inline">to Your</span>
              <br className="hidden sm:block" />
              <span className="inline">Documentation — </span>
              <motion.span 
                className="text-purple-600 inline"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.5, delay: 1.4 }}
              >Instantly</motion.span>
            </motion.h1>

            <motion.p 
              className="text-gray-600 text-lg sm:text-xl md:text-2xl max-w-2xl mx-auto mb-12 leading-relaxed"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.9 }}
            >
              <span className="block sm:inline">Turn your scattered docs into an intelligent assistant</span>{" "}
              <span className="block sm:inline">that answers any questions.</span>{" "}
              <span className="block mt-2 sm:mt-0 sm:inline">Stop searching, start building.</span>
            </motion.p>

            <motion.button 
              className="bg-purple-600 hover:bg-purple-700 text-white px-12 py-5 text-xl font-semibold rounded-full shadow-lg hover:shadow-xl transition-all duration-300 transform hover:scale-105"
              onClick={() => { router.push('/register'); }}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 1.1 }}
              whileHover={{ scale: 1.05, y: -2 }}
              whileTap={{ scale: 0.95 }}
            >
              Get Started - It's Free
            </motion.button>
          </motion.div>

          {/* Product Demo */}
          <motion.div 
            className="relative max-w-6xl mx-auto"
            style={{ y: demoY }}
            initial={{ opacity: 0, y: 100 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 1, delay: 1.3 }}
          >
            <style jsx>{`
              @keyframes purpleGlow {
                0%, 100% {
                  box-shadow: 0 0 20px rgba(147, 51, 234, 0.3), 0 0 40px rgba(147, 51, 234, 0.1);
                }
                50% {
                  box-shadow: 0 0 30px rgba(147, 51, 234, 0.5), 0 0 60px rgba(147, 51, 234, 0.2);
                }
              }
              .purple-glow {
                animation: purpleGlow 3s ease-in-out infinite;
              }
            `}</style>
            <motion.div 
              className="relative rounded-xl overflow-hidden shadow-2xl border border-gray-300 purple-glow"
              whileHover={{ scale: 1.02 }}
              transition={{ duration: 0.3 }}
            >
              <motion.img
                src="/dashboard-placeholder.png"
                alt="GYST Dashboard - AI-powered documentation management interface"
                className="w-full h-auto object-cover"
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.8, delay: 1.5 }}
              />
              {/* Overlay for better visual effect */}
              <motion.div 
                className="absolute inset-0 bg-gradient-to-t from-purple-900/20 via-transparent to-transparent pointer-events-none"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 1, delay: 1.8 }}
              />
              {/* Demo Badge */}
              <motion.div 
                className="absolute top-6 left-6 bg-white/90 backdrop-blur-sm px-4 py-2 rounded-full shadow-lg"
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.6, delay: 2 }}
              >
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                  <span className="text-sm font-semibold text-gray-700">Live Demo</span>
                </div>
              </motion.div>
            </motion.div>
          </motion.div>
        </motion.div>
      </section>

      {/* Features Section */}
      <AnimatedSection className="bg-gray-200 py-32">
        <div className="max-w-6xl w-full mx-auto text-center px-4">
          <motion.h2 
            className="text-4xl md:text-5xl font-bold mb-6 text-gray-900"
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            viewport={{ once: true }}
          >
            <motion.span 
              className="text-purple-600"
              initial={{ opacity: 0 }}
              whileInView={{ opacity: 1 }}
              transition={{ duration: 0.5, delay: 0.3 }}
              viewport={{ once: true }}
            >Browse</motion.span> your <motion.span 
              className="text-purple-600"
              initial={{ opacity: 0 }}
              whileInView={{ opacity: 1 }}
              transition={{ duration: 0.5, delay: 0.5 }}
              viewport={{ once: true }}
            >Docs</motion.span> Like
            <br />
            Never <motion.span 
              className="text-purple-600"
              initial={{ opacity: 0 }}
              whileInView={{ opacity: 1 }}
              transition={{ duration: 0.5, delay: 0.7 }}
              viewport={{ once: true }}
            >Before</motion.span>
          </motion.h2>

          <motion.div 
            className="max-w-3xl mx-auto mb-20"
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.2 }}
            viewport={{ once: true }}
          >
            <p className="text-xl text-gray-600 max-w-3xl mx-auto">Navigate, visualize and query your documentation in an instant.</p>
            <p className="text-xl text-gray-600 max-w-3xl mx-auto">
              Focus on the <span className="font-semibold">information</span>, not on the{" "}
              <span className="font-semibold">search</span>.
            </p>
          </motion.div>

          <motion.div 
            className="grid grid-cols-1 md:grid-cols-3 gap-6"
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            transition={{ duration: 0.8, delay: 0.4 }}
            viewport={{ once: true }}
          >
            <AnimatedFeatureCard
              icon={<Flag className="w-10 h-10" />}
              title="Unified Workspace"
              description="View and manage all your documentation in one clean dashboard"
              delay={0.1}
            />

            <AnimatedFeatureCard
              icon={<Brain className="w-10 h-10" />}
              title="AI-Powered Support"
              description="Chat with GYST AI and get accurate answers based on your own docs"
              delay={0.2}
            />

            <AnimatedFeatureCard
              icon={<Zap className="w-10 h-10" />}
              title="Fast Setup"
              description="Upload .txt and .md files and get started in minutes"
              delay={0.3}
            />
          </motion.div>
        </div>
      </AnimatedSection>

      {/* How It Works Section */}
      <AnimatedSection className="bg-white py-32">
        <div className="max-w-6xl mx-auto px-4">
          <motion.div 
            className="text-center mb-16"
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            viewport={{ once: true }}
          >
            <motion.h2 
              className="text-4xl md:text-5xl font-bold mb-6 text-gray-900"
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.1 }}
              viewport={{ once: true }}
            >
              From <motion.span 
                className="text-purple-600"
                initial={{ opacity: 0 }}
                whileInView={{ opacity: 1 }}
                transition={{ duration: 0.5, delay: 0.4 }}
                viewport={{ once: true }}
              >Chaos</motion.span> to <motion.span 
                className="text-purple-600"
                initial={{ opacity: 0 }}
                whileInView={{ opacity: 1 }}
                transition={{ duration: 0.5, delay: 0.6 }}
                viewport={{ once: true }}
              >Clarity</motion.span>
              <br />
              in Three Simple Steps
            </motion.h2>
            <motion.p 
              className="text-xl text-gray-600 max-w-3xl mx-auto"
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.3 }}
              viewport={{ once: true }}
            >
              Stop drowning in scattered documentation. GYST transforms your docs into an intelligent, 
              searchable knowledge base that actually <span className="font-semibold text-gray-900">answers your questions</span>.
            </motion.p>
          </motion.div>

          <motion.div 
            className="grid grid-cols-1 lg:grid-cols-3 gap-8 mb-16"
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            transition={{ duration: 0.8, delay: 0.2 }}
            viewport={{ once: true }}
          >
            {/* Step 1 */}
            <motion.div 
              className="relative"
              initial={{ opacity: 0, x: -50 }}
              whileInView={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.6, delay: 0.3 }}
              viewport={{ once: true }}
            >
              <motion.div 
                className="bg-white border-2 border-purple-100 rounded-2xl p-8 h-full shadow-lg hover:shadow-xl transition-shadow duration-300"
                whileHover={{ y: -5, scale: 1.02 }}
                transition={{ duration: 0.3 }}
              >
                <div className="flex items-center mb-6">
                  <motion.div 
                    className="w-12 h-12 bg-purple-600 rounded-full flex items-center justify-center text-white font-bold text-xl mr-4"
                    initial={{ scale: 0 }}
                    whileInView={{ scale: 1 }}
                    transition={{ duration: 0.5, delay: 0.5 }}
                    viewport={{ once: true }}
                  >
                    1
                  </motion.div>
                  <h3 className="text-2xl font-bold text-gray-900">Upload & Organize</h3>
                </div>
                <motion.div 
                  className="mb-6"
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.5, delay: 0.6 }}
                  viewport={{ once: true }}
                >
                  <div className="w-16 h-16 bg-purple-50 border border-purple-200 rounded-xl flex items-center justify-center mb-4">
                    <motion.svg 
                      className="w-8 h-8 text-purple-600" 
                      fill="none" 
                      stroke="currentColor" 
                      viewBox="0 0 24 24"
                      initial={{ pathLength: 0 }}
                      whileInView={{ pathLength: 1 }}
                      transition={{ duration: 1, delay: 0.7 }}
                      viewport={{ once: true }}
                    >
                      <motion.path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                    </motion.svg>
                  </div>
                </motion.div>
                <p className="text-gray-700 text-lg leading-relaxed">
                  <span className="font-semibold text-purple-600">Drag, drop, done.</span> Upload your .txt and .md files in seconds. 
                  No complex setup, no training required.
                </p>
              </motion.div>
              {/* Animated Arrow */}
              <motion.div 
                className="hidden lg:block absolute top-1/2 -right-4 transform -translate-y-1/2 z-10"
                initial={{ opacity: 0, x: -20 }}
                whileInView={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.5, delay: 1 }}
                viewport={{ once: true }}
              >
                <motion.div 
                  className="w-8 h-8 bg-white rounded-full border-2 border-purple-200 flex items-center justify-center"
                  animate={{ x: [0, 5, 0] }}
                  transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
                >
                  <svg className="w-4 h-4 text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </motion.div>
              </motion.div>
            </motion.div>

            {/* Step 2 */}
            <motion.div 
              className="relative"
              initial={{ opacity: 0, y: 50 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.5 }}
              viewport={{ once: true }}
            >
              <motion.div 
                className="bg-white border-2 border-purple-100 rounded-2xl p-8 h-full shadow-lg hover:shadow-xl transition-shadow duration-300"
                whileHover={{ y: -5, scale: 1.02 }}
                transition={{ duration: 0.3 }}
              >
                <div className="flex items-center mb-6">
                  <motion.div 
                    className="w-12 h-12 bg-purple-600 rounded-full flex items-center justify-center text-white font-bold text-xl mr-4"
                    initial={{ scale: 0 }}
                    whileInView={{ scale: 1 }}
                    transition={{ duration: 0.5, delay: 0.7 }}
                    viewport={{ once: true }}
                  >
                    2
                  </motion.div>
                  <h3 className="text-2xl font-bold text-gray-900">AI Auto-Tags</h3>
                </div>
                <div className="mb-6">
                  <div className="w-16 h-16 bg-purple-50 border border-purple-200 rounded-xl flex items-center justify-center mb-4">
                    <motion.svg 
                      className="w-8 h-8 text-purple-600" 
                      fill="none" 
                      stroke="currentColor" 
                      viewBox="0 0 24 24"
                      initial={{ rotate: 0 }}
                      whileInView={{ rotate: 360 }}
                      transition={{ duration: 1, delay: 0.8 }}
                      viewport={{ once: true }}
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                    </motion.svg>
                  </div>
                </div>
                <p className="text-gray-700 text-lg leading-relaxed">
                  <span className="font-semibold text-purple-600">Watch the magic happen.</span> GYST's AI instantly analyzes your content, 
                  creating smart tags and connections you never knew existed.
                </p>
              </motion.div>
              {/* Animated Arrow */}
              <motion.div 
                className="hidden lg:block absolute top-1/2 -right-4 transform -translate-y-1/2 z-10"
                initial={{ opacity: 0, x: -20 }}
                whileInView={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.5, delay: 1.2 }}
                viewport={{ once: true }}
              >
                <motion.div 
                  className="w-8 h-8 bg-white rounded-full border-2 border-purple-200 flex items-center justify-center"
                  animate={{ x: [0, 5, 0] }}
                  transition={{ duration: 2, repeat: Infinity, ease: "easeInOut", delay: 0.5 }}
                >
                  <svg className="w-4 h-4 text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </motion.div>
              </motion.div>
            </motion.div>

            {/* Step 3 */}
            <motion.div 
              className="relative"
              initial={{ opacity: 0, x: 50 }}
              whileInView={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.6, delay: 0.7 }}
              viewport={{ once: true }}
            >
              <motion.div 
                className="bg-white border-2 border-purple-100 rounded-2xl p-8 h-full shadow-lg hover:shadow-xl transition-shadow duration-300"
                whileHover={{ y: -5, scale: 1.02 }}
                transition={{ duration: 0.3 }}
              >
                <div className="flex items-center mb-6">
                  <motion.div 
                    className="w-12 h-12 bg-purple-600 rounded-full flex items-center justify-center text-white font-bold text-xl mr-4"
                    initial={{ scale: 0 }}
                    whileInView={{ scale: 1 }}
                    transition={{ duration: 0.5, delay: 0.9 }}
                    viewport={{ once: true }}
                  >
                    3
                  </motion.div>
                  <h3 className="text-2xl font-bold text-gray-900">Ask & Get Answers</h3>
                </div>
                <div className="mb-6">
                  <div className="w-16 h-16 bg-purple-50 border border-purple-200 rounded-xl flex items-center justify-center mb-4">
                    <motion.svg 
                      className="w-8 h-8 text-purple-600" 
                      fill="none" 
                      stroke="currentColor" 
                      viewBox="0 0 24 24"
                      initial={{ scale: 0 }}
                      whileInView={{ scale: [0, 1.2, 1] }}
                      transition={{ duration: 0.8, delay: 1 }}
                      viewport={{ once: true }}
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                    </motion.svg>
                  </div>
                </div>
                <p className="text-gray-700 text-lg leading-relaxed">
                  <span className="font-semibold text-purple-600">Just ask, like talking to a colleague.</span> Get precise answers from YOUR documentation, 
                  not generic responses from the internet.
                </p>
              </motion.div>
            </motion.div>
          </motion.div>

          {/* Before/After Comparison */}
          <motion.div 
            className="bg-gradient-to-r from-gray-50 to-gray-100 rounded-3xl p-8 lg:p-12 border border-gray-200"
            initial={{ opacity: 0, scale: 0.95 }}
            whileInView={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.8, delay: 0.6 }}
            viewport={{ once: true }}
          >
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
              {/* Before */}
              <motion.div 
                className="text-center lg:text-left"
                initial={{ opacity: 0, x: -30 }}
                whileInView={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.6, delay: 0.8 }}
                viewport={{ once: true }}
              >
                <div className="inline-flex items-center bg-gray-200 text-gray-700 px-4 py-2 rounded-full text-sm font-semibold mb-6">
                  ⏳ The Old Way (Frustrating)
                </div>
                <ul className="space-y-4 text-gray-600">
                  <motion.li 
                    className="flex items-start"
                    initial={{ opacity: 0, x: -20 }}
                    whileInView={{ opacity: 1, x: 0 }}
                    transition={{ duration: 0.4, delay: 1 }}
                    viewport={{ once: true }}
                  >
                    <span className="text-gray-400 mr-3 mt-1 font-bold">✗</span>
                    <span>Search through 50+ documentation files manually</span>
                  </motion.li>
                  <motion.li 
                    className="flex items-start"
                    initial={{ opacity: 0, x: -20 }}
                    whileInView={{ opacity: 1, x: 0 }}
                    transition={{ duration: 0.4, delay: 1.1 }}
                    viewport={{ once: true }}
                  >
                    <span className="text-gray-400 mr-3 mt-1 font-bold">✗</span>
                    <span>Use generic search terms that miss the right content</span>
                  </motion.li>
                  <motion.li 
                    className="flex items-start"
                    initial={{ opacity: 0, x: -20 }}
                    whileInView={{ opacity: 1, x: 0 }}
                    transition={{ duration: 0.4, delay: 1.2 }}
                    viewport={{ once: true }}
                  >
                    <span className="text-gray-400 mr-3 mt-1 font-bold">✗</span>
                    <span>Waste 30+ minutes finding basic information</span>
                  </motion.li>
                  <motion.li 
                    className="flex items-start"
                    initial={{ opacity: 0, x: -20 }}
                    whileInView={{ opacity: 1, x: 0 }}
                    transition={{ duration: 0.4, delay: 1.3 }}
                    viewport={{ once: true }}
                  >
                    <span className="text-gray-400 mr-3 mt-1 font-bold">✗</span>
                    <span>Give up and ask colleagues (who are also busy)</span>
                  </motion.li>
                </ul>
              </motion.div>

              {/* After */}
              <motion.div 
                className="text-center lg:text-left"
                initial={{ opacity: 0, x: 30 }}
                whileInView={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.6, delay: 0.9 }}
                viewport={{ once: true }}
              >
                <div className="inline-flex items-center bg-purple-100 text-purple-700 px-4 py-2 rounded-full text-sm font-semibold mb-6">
                  🚀 The GYST Way (Effortless)
                </div>
                <ul className="space-y-4 text-gray-600">
                  <motion.li 
                    className="flex items-start"
                    initial={{ opacity: 0, x: 20 }}
                    whileInView={{ opacity: 1, x: 0 }}
                    transition={{ duration: 0.4, delay: 1.1 }}
                    viewport={{ once: true }}
                  >
                    <span className="text-purple-500 mr-3 mt-1 font-bold">✓</span>
                    <span><strong>Ask in plain English:</strong> "How do I configure the API rate limits?"</span>
                  </motion.li>
                  <motion.li 
                    className="flex items-start"
                    initial={{ opacity: 0, x: 20 }}
                    whileInView={{ opacity: 1, x: 0 }}
                    transition={{ duration: 0.4, delay: 1.2 }}
                    viewport={{ once: true }}
                  >
                    <span className="text-purple-500 mr-3 mt-1 font-bold">✓</span>
                    <span><strong>Get instant answers</strong> with exact references to your docs</span>
                  </motion.li>
                  <motion.li 
                    className="flex items-start"
                    initial={{ opacity: 0, x: 20 }}
                    whileInView={{ opacity: 1, x: 0 }}
                    transition={{ duration: 0.4, delay: 1.3 }}
                    viewport={{ once: true }}
                  >
                    <span className="text-purple-500 mr-3 mt-1 font-bold">✓</span>
                    <span><strong>Save 95% of your search time</strong> every single day</span>
                  </motion.li>
                  <motion.li 
                    className="flex items-start"
                    initial={{ opacity: 0, x: 20 }}
                    whileInView={{ opacity: 1, x: 0 }}
                    transition={{ duration: 0.4, delay: 1.4 }}
                    viewport={{ once: true }}
                  >
                    <span className="text-purple-500 mr-3 mt-1 font-bold">✓</span>
                    <span><strong>Stay in flow state</strong> and keep building amazing things</span>
                  </motion.li>
                </ul>
              </motion.div>
            </div>
          </motion.div>
        </div>
      </AnimatedSection>

      {/* Time Advantage Section */}
      <AnimatedSection className="bg-gray-200 py-36">
        <div className="max-w-6xl mx-auto text-center px-4">
          <motion.h2 
            className="text-4xl md:text-5xl font-bold mb-6 text-gray-900"
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            viewport={{ once: true }}
          >
            Stop <motion.span 
              className="text-purple-600"
              initial={{ opacity: 0 }}
              whileInView={{ opacity: 1 }}
              transition={{ duration: 0.5, delay: 0.3 }}
              viewport={{ once: true }}
            >Wasting Time</motion.span> on
            <br />
            Documentation <motion.span 
              className="text-purple-600"
              initial={{ opacity: 0 }}
              whileInView={{ opacity: 1 }}
              transition={{ duration: 0.5, delay: 0.5 }}
              viewport={{ once: true }}
            >Searches</motion.span>
          </motion.h2>
          
          <motion.p 
            className="text-xl text-gray-600 max-w-3xl mx-auto mb-16 leading-relaxed"
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.2 }}
            viewport={{ once: true }}
          >
            The average developer spends <span className="font-semibold text-gray-900">3-4 hours daily</span> searching through documentation.
            <br />
            GYST cuts that time to <span className="font-semibold text-purple-600">minutes</span>, not hours.
          </motion.p>

          <motion.div 
            className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-12"
            initial={{ opacity: 0, y: 50 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.4 }}
            viewport={{ once: true }}
          >
            <motion.div 
              className="bg-white rounded-xl p-8 shadow-lg border border-gray-200"
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.5 }}
              viewport={{ once: true }}
              whileHover={{ y: -5, scale: 1.02 }}
            >
              <motion.div 
                className="text-5xl font-bold text-purple-600 mb-3"
                initial={{ scale: 0 }}
                whileInView={{ scale: 1 }}
                transition={{ duration: 0.5, delay: 0.7 }}
                viewport={{ once: true }}
              >
                10x
              </motion.div>
              <div className="text-lg font-semibold text-gray-900 mb-2">Faster Searches</div>
              <div className="text-gray-600">Find answers instantly instead of browsing through endless pages</div>
            </motion.div>
            
            <motion.div 
              className="bg-white rounded-xl p-8 shadow-lg border border-gray-200"
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.6 }}
              viewport={{ once: true }}
              whileHover={{ y: -5, scale: 1.02 }}
            >
              <motion.div 
                className="text-5xl font-bold text-purple-600 mb-3"
                initial={{ scale: 0 }}
                whileInView={{ scale: 1 }}
                transition={{ duration: 0.5, delay: 0.8 }}
                viewport={{ once: true }}
              >
                95%
              </motion.div>
              <div className="text-lg font-semibold text-gray-900 mb-2">Accuracy Rate</div>
              <div className="text-gray-600">AI responses based on your actual documentation, not generic answers</div>
            </motion.div>
            
            <motion.div 
              className="bg-white rounded-xl p-8 shadow-lg border border-gray-200"
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.7 }}
              viewport={{ once: true }}
              whileHover={{ y: -5, scale: 1.02 }}
            >
              <motion.div 
                className="text-5xl font-bold text-purple-600 mb-3"
                initial={{ scale: 0 }}
                whileInView={{ scale: 1 }}
                transition={{ duration: 0.5, delay: 0.9 }}
                viewport={{ once: true }}
              >
                2min
              </motion.div>
              <div className="text-lg font-semibold text-gray-900 mb-2">Setup Time</div>
              <div className="text-gray-600">Upload your docs and start saving time immediately</div>
            </motion.div>
          </motion.div>

          <motion.div 
            className="bg-gradient-to-r from-purple-50 to-blue-50 rounded-2xl p-8 max-w-4xl mx-auto"
            initial={{ opacity: 0, scale: 0.95 }}
            whileInView={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.8, delay: 0.6 }}
            viewport={{ once: true }}
          >
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-center">
              <motion.div 
                className="text-left"
                initial={{ opacity: 0, x: -30 }}
                whileInView={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.6, delay: 0.8 }}
                viewport={{ once: true }}
              >
                <h3 className="text-2xl font-bold text-gray-900 mb-4">
                  Get Back <span className="text-purple-600">2+ Hours</span> Every Day
                </h3>
                <p className="text-gray-700 text-lg">
                  That's <span className="font-semibold">10+ hours per week</span> you can spend on actual development 
                  instead of hunting through documentation.
                </p>
              </motion.div>
              <motion.div 
                className="text-center md:text-right"
                initial={{ opacity: 0, x: 30 }}
                whileInView={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.6, delay: 1 }}
                viewport={{ once: true }}
              >
                <motion.div 
                  className="text-4xl font-bold text-purple-600 mb-2"
                  initial={{ scale: 0 }}
                  whileInView={{ scale: 1 }}
                  transition={{ duration: 0.5, delay: 1.2 }}
                  viewport={{ once: true }}
                >
                  40+ hrs
                </motion.div>
                <div className="text-gray-600">Saved per month</div>
                <div className="text-sm text-gray-500 mt-2">Based on average developer usage</div>
              </motion.div>
            </div>
          </motion.div>
        </div>
      </AnimatedSection>

      {/* CTA Section */}
      <AnimatedSection className="bg-gradient-to-b from-white to-purple-50 py-36">
        <div className="max-w-3xl mx-auto text-center px-4 py-20">
          <motion.h2 
            className="text-4xl md:text-5xl font-bold mb-6 text-gray-900"
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            viewport={{ once: true }}
          >
            Ready to Get <motion.span 
              className="text-purple-600"
              initial={{ opacity: 0 }}
              whileInView={{ opacity: 1 }}
              transition={{ duration: 0.5, delay: 0.3 }}
              viewport={{ once: true }}
            >Your</motion.span> <br />
            Stuff <motion.span 
              className="text-purple-600"
              initial={{ opacity: 0 }}
              whileInView={{ opacity: 1 }}
              transition={{ duration: 0.5, delay: 0.5 }}
              viewport={{ once: true }}
            >Together</motion.span>?
          </motion.h2>

          <motion.p 
            className="text-lg md:text-xl mb-12 max-w-2xl mx-auto text-gray-700"
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.2 }}
            viewport={{ once: true }}
          >
            Join GYST <span className="font-medium">today</span> and <span className="font-medium">skyrocket</span> your
            problem solving, productivity and documentation management.
          </motion.p>

          <motion.button 
           onClick={() => { router.push('/register'); }}
          className="bg-purple-600 hover:bg-purple-700 text-white px-12 py-5 text-xl font-semibold rounded-full shadow-lg hover:shadow-xl transition-all duration-300 transform hover:scale-105"
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.4 }}
          viewport={{ once: true }}
          whileHover={{ scale: 1.05, y: -2 }}
          whileTap={{ scale: 0.95 }}
          >
            Start Free Today
          </motion.button>
        </div>
      </AnimatedSection>

      {/* Footer */}
      <footer className="bg-gray-900 text-white">
        <div className="max-w-7xl mx-auto px-6 py-24">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
            {/* Brand Section */}
            <div className="col-span-1 md:col-span-2">
              <div className="flex items-center gap-2 mb-4">
                <img className="w-8 h-8" src="/gyst-remake-flip-white.png" alt="" />
                <span className="text-xl font-bold text-white">GYST</span>
              </div>
              <p className="text-gray-300 max-w-md mb-6">
                Organize your technical documentation and query it with integrated AI. 
                Never lose time searching through docs again.
              </p>
              <div className="flex items-center gap-4">
                <a href="#" className="text-gray-400 hover:text-white transition-colors">
                  <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M24 4.557c-.883.392-1.832.656-2.828.775 1.017-.609 1.798-1.574 2.165-2.724-.951.564-2.005.974-3.127 1.195-.897-.957-2.178-1.555-3.594-1.555-3.179 0-5.515 2.966-4.797 6.045-4.091-.205-7.719-2.165-10.148-5.144-1.29 2.213-.669 5.108 1.523 6.574-.806-.026-1.566-.247-2.229-.616-.054 2.281 1.581 4.415 3.949 4.89-.693.188-1.452.232-2.224.084.626 1.956 2.444 3.379 4.6 3.419-2.07 1.623-4.678 2.348-7.29 2.04 2.179 1.397 4.768 2.212 7.548 2.212 9.142 0 14.307-7.721 13.995-14.646.962-.695 1.797-1.562 2.457-2.549z"/>
                  </svg>
                </a>
                <a href="#" className="text-gray-400 hover:text-white transition-colors">
                  <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M12.017 0C5.396 0 .029 5.367.029 11.987c0 5.079 3.158 9.417 7.618 11.174-.105-.949-.199-2.403.041-3.439.219-.937 1.406-5.957 1.406-5.957s-.359-.72-.359-1.781c0-1.663.967-2.911 2.168-2.911 1.024 0 1.518.769 1.518 1.688 0 1.029-.653 2.567-.992 3.992-.285 1.193.6 2.165 1.775 2.165 2.128 0 3.768-2.245 3.768-5.487 0-2.861-2.063-4.869-5.008-4.869-3.41 0-5.409 2.562-5.409 5.199 0 1.033.394 2.143.889 2.741.099.120.112.225.083.402-.09.375-.293 1.199-.334 1.363-.053.225-.172.271-.402.165-1.495-.69-2.433-2.878-2.433-4.646 0-3.776 2.748-7.252 7.92-7.252 4.158 0 7.392 2.967 7.392 6.923 0 4.135-2.607 7.462-6.233 7.462-1.214 0-2.357-.629-2.748-1.378l-.748 2.853c-.271 1.043-1.002 2.35-1.492 3.146C9.57 23.812 10.763 24.009 12.017 24.009c6.624 0 11.99-5.367 11.99-11.988C24.007 5.367 18.641.001.012.001 12.017 0z"/>
                  </svg>
                </a>
                <a href="#" className="text-gray-400 hover:text-white transition-colors">
                  <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/>
                  </svg>
                </a>
                <a href="#" className="text-gray-400 hover:text-white transition-colors">
                  <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z"/>
                  </svg>
                </a>
              </div>
            </div>

            {/* Product Links */}
            <div>
              <h3 className="text-white font-semibold mb-4">Product</h3>
              <ul className="space-y-3">
                <li><a href="#" className="text-gray-300 hover:text-white transition-colors">Features</a></li>
                <li><a href="#" className="text-gray-300 hover:text-white transition-colors">Pricing</a></li>
                <li><a href="#" className="text-gray-300 hover:text-white transition-colors">Documentation</a></li>
                <li><a href="#" className="text-gray-300 hover:text-white transition-colors">API Reference</a></li>
                <li><a href="#" className="text-gray-300 hover:text-white transition-colors">Changelog</a></li>
              </ul>
            </div>

            {/* Company Links */}
            <div>
              <h3 className="text-white font-semibold mb-4">Company</h3>
              <ul className="space-y-3">
                <li><a href="#" className="text-gray-300 hover:text-white transition-colors">About</a></li>
                <li><a href="#" className="text-gray-300 hover:text-white transition-colors">Blog</a></li>
                <li><a href="#" className="text-gray-300 hover:text-white transition-colors">Careers</a></li>
                <li><a href="#" className="text-gray-300 hover:text-white transition-colors">Contact</a></li>
                <li><a href="#" className="text-gray-300 hover:text-white transition-colors">Support</a></li>
              </ul>
            </div>
          </div>

          {/* Bottom Bar */}
          <div className="border-t border-gray-700 mt-12 pt-8 flex flex-col md:flex-row justify-between items-center">
            <div className="text-gray-400 text-sm mb-4 md:mb-0">
              © 2025 GYST. All rights reserved.
            </div>
            <div className="flex items-center gap-6 text-sm">
              <a href="#" className="text-gray-400 hover:text-white transition-colors">Privacy Policy</a>
              <a href="#" className="text-gray-400 hover:text-white transition-colors">Terms of Service</a>
              <a href="#" className="text-gray-400 hover:text-white transition-colors">Cookie Policy</a>
            </div>
          </div>
        </div>
      </footer>
    </motion.div>
  )
}

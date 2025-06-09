


"use client"
import { Button } from "@/components/ui/button"
import { Flag, Brain, Zap } from "lucide-react"
import { useRouter } from "next/navigation"
import { useAuth } from '@/hooks/use-auth'
import { LoadingSpinner } from '@/components/auth/loading-spinner'
import { UserHeader } from '@/components/user-header'
import { UploadSection } from '@/components/upload-section'
import LandingPage from './landing/page'

export default function Component() {

  const router = useRouter()

  const { isLoading, isAuthenticated, role } = useAuth()

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
    <div className="min-h-screen text-gray-900">
      {/* Header */}
      <header className="bg-gray-50 border-b border-gray-200">
        <div className="max-w-7xl mx-auto flex items-center justify-between px-6 py-4">
          <div className="flex items-center gap-2">
            <img src="/gyst-remake-flip.png" className="w-8 h-8" alt="" />
            <span className="text-xl font-bold text-gray-900">GYST</span>
          </div>

          <div className="flex items-center gap-3">
            <Button 
             onClick={() => { router.push('/login'); }}
            variant="ghost" className="text-gray-700 hover:bg-gray-100 rounded-full px-6">
              Login
            </Button>
            <Button className="bg-purple-600 hover:bg-purple-700 text-white rounded-full px-6"
             onClick={() => { router.push('/register'); }}>Get Started Free</Button>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="bg-gradient-to-b from-white via-gray-50 via-gray-100 to-gray-200 py-32">
        <div className="max-w-7xl mx-auto px-6">
          <div className="text-center mb-16">
            <p className="text-gray-600 text-lg mb-6">Introducing GYST</p>

            <h1 className="text-5xl md:text-6xl lg:text-7xl font-bold leading-tight mb-8 text-gray-900">
              Find <span className="text-purple-600">Answers</span> to Your
              <br />
              Documentation — <span className="text-purple-600">Instantly</span>
            </h1>

            <p className="text-gray-600 text-2xl max-w-2xl mx-auto mb-12 leading-relaxed">
              Turn your scattered docs into an intelligent assistant that
              
              answers any questions. Stop searching, start building.
            </p>

            {/* <Button className="bg-purple-600 hover:bg-purple-700 text-white px-12 py-5 text-xl font-semibold rounded-full shadow-lg hover:shadow-xl transition-all duration-300 transform hover:scale-105">
              Transform My Docs with AI
            </Button> */}
            <button className="bg-purple-600 hover:bg-purple-700 text-white px-12 py-5 text-xl font-semibold rounded-full shadow-lg hover:shadow-xl transition-all duration-300 transform hover:scale-105"
            onClick={() => { router.push('/register'); }}>
            
            Get Started - It's Free
          </button>
          </div>

          {/* Product Demo Placeholder */}
          <div className="relative max-w-6xl mx-auto">
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
            <div className="bg-gray-200 rounded-lg overflow-hidden shadow-2xl border border-gray-300 h-[650px] flex items-center justify-center purple-glow">
              <div className="text-center">
                <div className="w-24 h-24 mx-auto mb-6 bg-gray-400 rounded-lg flex items-center justify-center">
                  <svg className="w-12 h-12 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                </div>
                <h3 className="text-2xl font-semibold text-gray-700 mb-2">Product Demo</h3>
                <p className="text-gray-500 max-w-md mx-auto">
                  Interactive demonstration of GYST's AI-powered documentation chat interface will be displayed here.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="bg-gray-200 py-32">
        <div className="max-w-6xl w-full mx-auto text-center px-4">
          <h2 className="text-4xl md:text-5xl font-bold mb-6 text-gray-900">
            <span className="text-purple-600">Browse</span> your <span className="text-purple-600">Docs</span> Like
            <br />
            Never <span className="text-purple-600">Before</span>
          </h2>

          <div className="max-w-3xl mx-auto mb-20">
            <p className="text-xl text-gray-600 max-w-3xl mx-auto">Navigate, visualize and query your documentation in an instant.</p>
            <p className="text-xl text-gray-600 max-w-3xl mx-auto">
              Focus on the <span className="font-semibold">information</span>, not on the{" "}
              <span className="font-semibold">search</span>.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <FeatureCard
              icon={<Flag className="w-10 h-10" />}
              title="Unified Workspace"
              description="View and manage all your documentation in one clean dashboard"
            />

            <FeatureCard
              icon={<Brain className="w-10 h-10" />}
              title="AI-Powered Support"
              description="Chat with GYST AI and get accurate answers based on your own docs"
            />

            <FeatureCard
              icon={<Zap className="w-10 h-10" />}
              title="Fast Setup"
              description="Upload .txt and .md files and get started in minutes"
            />
          </div>
        </div>
      </section>

      {/* How It Works Section */}
      <section className="bg-white py-32">
        <div className="max-w-6xl mx-auto px-4">
          <div className="text-center mb-16">
            <h2 className="text-4xl md:text-5xl font-bold mb-6 text-gray-900">
              From <span className="text-purple-600">Chaos</span> to <span className="text-purple-600">Clarity</span>
              <br />
              in Three Simple Steps
            </h2>
            <p className="text-xl text-gray-600 max-w-3xl mx-auto">
              Stop drowning in scattered documentation. GYST transforms your docs into an intelligent, 
              searchable knowledge base that actually <span className="font-semibold text-gray-900">answers your questions</span>.
            </p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mb-16">
            {/* Step 1 */}
            <div className="relative">
              <div className="bg-white border-2 border-purple-100 rounded-2xl p-8 h-full shadow-lg hover:shadow-xl transition-shadow duration-300">
                <div className="flex items-center mb-6">
                  <div className="w-12 h-12 bg-purple-600 rounded-full flex items-center justify-center text-white font-bold text-xl mr-4">
                    1
                  </div>
                  <h3 className="text-2xl font-bold text-gray-900">Upload & Organize</h3>
                </div>
                <div className="mb-6">
                  <div className="w-16 h-16 bg-purple-50 border border-purple-200 rounded-xl flex items-center justify-center mb-4">
                    <svg className="w-8 h-8 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                    </svg>
                  </div>
                </div>
                <p className="text-gray-700 text-lg leading-relaxed">
                  <span className="font-semibold text-purple-600">Drag, drop, done.</span> Upload your .txt and .md files in seconds. 
                  No complex setup, no training required.
                </p>
              </div>
              {/* Arrow for desktop */}
              <div className="hidden lg:block absolute top-1/2 -right-4 transform -translate-y-1/2 z-10">
                <div className="w-8 h-8 bg-white rounded-full border-2 border-purple-200 flex items-center justify-center">
                  <svg className="w-4 h-4 text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </div>
              </div>
            </div>

            {/* Step 2 */}
            <div className="relative">
              <div className="bg-white border-2 border-purple-100 rounded-2xl p-8 h-full shadow-lg hover:shadow-xl transition-shadow duration-300">
                <div className="flex items-center mb-6">
                  <div className="w-12 h-12 bg-purple-600 rounded-full flex items-center justify-center text-white font-bold text-xl mr-4">
                    2
                  </div>
                  <h3 className="text-2xl font-bold text-gray-900">AI Auto-Tags</h3>
                </div>
                <div className="mb-6">
                  <div className="w-16 h-16 bg-purple-50 border border-purple-200 rounded-xl flex items-center justify-center mb-4">
                    <svg className="w-8 h-8 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                    </svg>
                  </div>
                </div>
                <p className="text-gray-700 text-lg leading-relaxed">
                  <span className="font-semibold text-purple-600">Watch the magic happen.</span> GYST's AI instantly analyzes your content, 
                  creating smart tags and connections you never knew existed.
                </p>
              </div>
              {/* Arrow for desktop */}
              <div className="hidden lg:block absolute top-1/2 -right-4 transform -translate-y-1/2 z-10">
                <div className="w-8 h-8 bg-white rounded-full border-2 border-purple-200 flex items-center justify-center">
                  <svg className="w-4 h-4 text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </div>
              </div>
            </div>

            {/* Step 3 */}
            <div className="relative">
              <div className="bg-white border-2 border-purple-100 rounded-2xl p-8 h-full shadow-lg hover:shadow-xl transition-shadow duration-300">
                <div className="flex items-center mb-6">
                  <div className="w-12 h-12 bg-purple-600 rounded-full flex items-center justify-center text-white font-bold text-xl mr-4">
                    3
                  </div>
                  <h3 className="text-2xl font-bold text-gray-900">Ask & Get Answers</h3>
                </div>
                <div className="mb-6">
                  <div className="w-16 h-16 bg-purple-50 border border-purple-200 rounded-xl flex items-center justify-center mb-4">
                    <svg className="w-8 h-8 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                    </svg>
                  </div>
                </div>
                <p className="text-gray-700 text-lg leading-relaxed">
                  <span className="font-semibold text-purple-600">Just ask, like talking to a colleague.</span> Get precise answers from YOUR documentation, 
                  not generic responses from the internet.
                </p>
              </div>
            </div>
          </div>

          {/* Before/After Comparison */}
          <div className="bg-gradient-to-r from-gray-50 to-gray-100 rounded-3xl p-8 lg:p-12 border border-gray-200">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
              {/* Before */}
              <div className="text-center lg:text-left">
                <div className="inline-flex items-center bg-gray-200 text-gray-700 px-4 py-2 rounded-full text-sm font-semibold mb-6">
                  ⏳ The Old Way (Frustrating)
                </div>
                <ul className="space-y-4 text-gray-600">
                  <li className="flex items-start">
                    <span className="text-gray-400 mr-3 mt-1 font-bold">✗</span>
                    <span>Search through 50+ documentation files manually</span>
                  </li>
                  <li className="flex items-start">
                    <span className="text-gray-400 mr-3 mt-1 font-bold">✗</span>
                    <span>Use generic search terms that miss the right content</span>
                  </li>
                  <li className="flex items-start">
                    <span className="text-gray-400 mr-3 mt-1 font-bold">✗</span>
                    <span>Waste 30+ minutes finding basic information</span>
                  </li>
                  <li className="flex items-start">
                    <span className="text-gray-400 mr-3 mt-1 font-bold">✗</span>
                    <span>Give up and ask colleagues (who are also busy)</span>
                  </li>
                </ul>
              </div>

              {/* After */}
              <div className="text-center lg:text-left">
                <div className="inline-flex items-center bg-purple-100 text-purple-700 px-4 py-2 rounded-full text-sm font-semibold mb-6">
                  🚀 The GYST Way (Effortless)
                </div>
                <ul className="space-y-4 text-gray-600">
                  <li className="flex items-start">
                    <span className="text-purple-500 mr-3 mt-1 font-bold">✓</span>
                    <span><strong>Ask in plain English:</strong> "How do I configure the API rate limits?"</span>
                  </li>
                  <li className="flex items-start">
                    <span className="text-purple-500 mr-3 mt-1 font-bold">✓</span>
                    <span><strong>Get instant answers</strong> with exact references to your docs</span>
                  </li>
                  <li className="flex items-start">
                    <span className="text-purple-500 mr-3 mt-1 font-bold">✓</span>
                    <span><strong>Save 95% of your search time</strong> every single day</span>
                  </li>
                  <li className="flex items-start">
                    <span className="text-purple-500 mr-3 mt-1 font-bold">✓</span>
                    <span><strong>Stay in flow state</strong> and keep building amazing things</span>
                  </li>
                </ul>
              </div>
            </div>
          </div>

          
        </div>
      </section>

      {/* Time Advantage Section */}
      <section className="bg-gray-200 py-36">
        <div className="max-w-6xl mx-auto text-center px-4">
          <h2 className="text-4xl md:text-5xl font-bold mb-6 text-gray-900">
            Stop <span className="text-purple-600">Wasting Time</span> on
            <br />
            Documentation <span className="text-purple-600">Searches</span>
          </h2>
          
          <p className="text-xl text-gray-600 max-w-3xl mx-auto mb-16 leading-relaxed">
            The average developer spends <span className="font-semibold text-gray-900">3-4 hours daily</span> searching through documentation.
            <br />
            GYST cuts that time to <span className="font-semibold text-purple-600">minutes</span>, not hours.
          </p>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-12">
            <div className="bg-white rounded-xl p-8 shadow-lg border border-gray-200">
              <div className="text-5xl font-bold text-purple-600 mb-3">10x</div>
              <div className="text-lg font-semibold text-gray-900 mb-2">Faster Searches</div>
              <div className="text-gray-600">Find answers instantly instead of browsing through endless pages</div>
            </div>
            <div className="bg-white rounded-xl p-8 shadow-lg border border-gray-200">
              <div className="text-5xl font-bold text-purple-600 mb-3">95%</div>
              <div className="text-lg font-semibold text-gray-900 mb-2">Accuracy Rate</div>
              <div className="text-gray-600">AI responses based on your actual documentation, not generic answers</div>
            </div>
            <div className="bg-white rounded-xl p-8 shadow-lg border border-gray-200">
              <div className="text-5xl font-bold text-purple-600 mb-3">2min</div>
              <div className="text-lg font-semibold text-gray-900 mb-2">Setup Time</div>
              <div className="text-gray-600">Upload your docs and start saving time immediately</div>
            </div>
          </div>

          <div className="bg-gradient-to-r from-purple-50 to-blue-50 rounded-2xl p-8 max-w-4xl mx-auto">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-center">
              <div className="text-left">
                <h3 className="text-2xl font-bold text-gray-900 mb-4">
                  Get Back <span className="text-purple-600">2+ Hours</span> Every Day
                </h3>
                <p className="text-gray-700 text-lg">
                  That's <span className="font-semibold">10+ hours per week</span> you can spend on actual development 
                  instead of hunting through documentation.
                </p>
              </div>
              <div className="text-center md:text-right">
                <div className="text-4xl font-bold text-purple-600 mb-2">40+ hrs</div>
                <div className="text-gray-600">Saved per month</div>
                <div className="text-sm text-gray-500 mt-2">Based on average developer usage</div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="bg-gradient-to-b from-white to-purple-50 py-36">
        <div className="max-w-3xl mx-auto text-center px-4 py-20">
          <h2 className="text-4xl md:text-5xl font-bold mb-6 text-gray-900">
            Ready to Get <span className="text-purple-600">Your</span> <br />
            Stuff <span className="text-purple-600">Together</span>?
          </h2>

          <p className="text-lg md:text-xl mb-12 max-w-2xl mx-auto text-gray-700">
            Join GYST <span className="font-medium">today</span> and <span className="font-medium">skyrocket</span> your
            problem solving, productivity and documentation management.
          </p>

          <button 
           onClick={() => { router.push('/register'); }}
          className="bg-purple-600 hover:bg-purple-700 text-white px-12 py-5 text-xl font-semibold rounded-full shadow-lg hover:shadow-xl transition-all duration-300 transform hover:scale-105">
            Start Free Today
          </button>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-gray-900 text-white">
        <div className="max-w-7xl mx-auto px-6 py-24">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
            {/* Brand Section */}
            <div className="col-span-1 md:col-span-2">
              <div className="flex items-center gap-2 mb-4">
                <div className="w-8 h-8 bg-white rounded-full flex items-center justify-center">
                  <div className="w-6 h-6 bg-gray-900 rounded-full flex items-center justify-center">
                    <div className="w-3 h-3 bg-white rounded-full"></div>
                  </div>
                </div>
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
    </div>
  )
}

function FeatureCard({
  icon,
  title,
  description,
}: {
  icon: React.ReactNode
  title: string
  description: string
}) {
  return (
    <div className="bg-white border-2 border-purple-100 rounded-2xl p-8 flex flex-col items-center text-center shadow-lg hover:shadow-xl transition-all duration-300 hover:border-purple-200 group">
      <div className="w-16 h-16 bg-purple-50 border border-purple-200 rounded-xl flex items-center justify-center mb-6 group-hover:bg-purple-100 transition-colors duration-300">
        <div className="text-purple-600">{icon}</div>
      </div>
      <h3 className="text-2xl font-bold mb-4 text-gray-900">{title}</h3>
      <p className="text-gray-600 leading-relaxed">{description}</p>
    </div>
  )
}

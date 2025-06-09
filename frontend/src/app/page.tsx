


"use client"
import { Button } from "@/components/ui/button"
import { Flag, Brain, Zap } from "lucide-react"

import { useAuth } from '@/hooks/use-auth'
import { LoadingSpinner } from '@/components/auth/loading-spinner'
import { UserHeader } from '@/components/user-header'
import { UploadSection } from '@/components/upload-section'
import LandingPage from './landing/page'

export default function Component() {



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
    <div className="min-h-screen bg-[#0e0f11] text-white">
      {/* Header */}
      <header className="flex items-center justify-between px-6 py-4 max-w-7xl mx-auto">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-white rounded-full flex items-center justify-center">
            <div className="w-6 h-6 bg-[#0e0f11] rounded-full flex items-center justify-center">
              <div className="w-3 h-3 bg-white rounded-full"></div>
            </div>
          </div>
          <span className="text-xl font-bold">GYST</span>
        </div>

        <div className="flex items-center gap-3">
          <Button variant="ghost" className="text-white hover:bg-white/10 rounded-full px-6">
            Login
          </Button>
          <Button className="bg-[#1a1a1a] hover:bg-[#2a2a2a] text-white rounded-full px-6">Sign Up</Button>
        </div>
      </header>

      {/* Hero Section */}
      <main className="max-w-7xl mx-auto px-6 pt-16 pb-12">
        <div className="text-center mb-16">
          <p className="text-[#eaeaea] text-lg mb-6">Introducing GYST</p>

          <h1 className="text-5xl md:text-6xl lg:text-7xl font-bold leading-tight mb-8">
            Find <span className="text-purple-500">Answers</span> to Your
            <br />
            Documentation — <span className="text-purple-500">Instantly</span>
          </h1>

          <p className="text-[#eaeaea] text-xl max-w-2xl mx-auto mb-12 leading-relaxed">
            GYST Organizes your technical docs and queries them
            <br />
            with an integrated AI. Never lose time searching again.
          </p>

          <Button className="bg-purple-600 hover:bg-purple-700 text-white px-8 py-4 text-lg rounded-full">
            Get early Access
          </Button>
        </div>

        {/* VS Code Mockup */}
        <div className="relative max-w-6xl mx-auto">
          <div className="bg-[#1a1a1a] rounded-lg overflow-hidden shadow-2xl">
            {/* VS Code Header */}
            <div className="bg-[#2d2d30] px-4 py-2 flex items-center gap-2">
              <div className="flex gap-2">
                <div className="w-3 h-3 bg-red-500 rounded-full"></div>
                <div className="w-3 h-3 bg-yellow-500 rounded-full"></div>
                <div className="w-3 h-3 bg-green-500 rounded-full"></div>
              </div>
              <div className="flex-1 text-center">
                <span className="text-[#eaeaea] text-sm">
                  vscode-remote-try-python [SSH: vscode-remote-try-python.devpod]
                </span>
              </div>
            </div>

            {/* VS Code Content */}
            <div className="flex h-[600px]">
              {/* Sidebar */}
              <div className="w-64 bg-[#252526] border-r border-[#3e3e42]">
                <div className="p-3">
                  <div className="text-[#cccccc] text-sm font-medium mb-2">WELCOME</div>
                  <div className="text-blue-400 text-sm mb-4">app.docs</div>

                  <div className="space-y-2 text-sm">
                    <div className="flex items-center gap-2 text-[#cccccc]">
                      <span className="text-xs">○</span>
                      <span>Accept an autocomplete</span>
                    </div>
                    <div className="flex items-center gap-2 text-[#cccccc]">
                      <span className="text-xs">○</span>
                      <span>Prompt an edit</span>
                    </div>
                    <div className="flex items-center gap-2 text-[#cccccc]">
                      <span className="text-xs">○</span>
                      <span>Chat with your codebase</span>
                    </div>
                  </div>
                </div>

                {/* File Explorer */}
                <div className="px-3 py-2">
                  <div className="text-[#cccccc] text-xs font-medium mb-2">VSCODE-REMOTE-TRY-PYTHON [SSH-...</div>
                  <div className="space-y-1 text-sm">
                    <div className="flex items-center gap-1 text-[#cccccc]">
                      <span className="text-blue-400">📁</span>
                      <span>.devcontainer</span>
                    </div>
                    <div className="flex items-center gap-1 text-[#cccccc] ml-4">
                      <span>📄</span>
                      <span>devcontainer.json</span>
                    </div>
                    <div className="flex items-center gap-1 text-[#cccccc]">
                      <span className="text-blue-400">📁</span>
                      <span>.github</span>
                    </div>
                    <div className="flex items-center gap-1 text-[#cccccc]">
                      <span className="text-blue-400">📁</span>
                      <span>.vscode</span>
                    </div>
                    <div className="flex items-center gap-1 text-[#cccccc]">
                      <span className="text-blue-400">📁</span>
                      <span>static</span>
                    </div>
                    <div className="flex items-center gap-1 text-[#cccccc]">
                      <span className="text-yellow-400">📄</span>
                      <span>app.py</span>
                    </div>
                    <div className="flex items-center gap-1 text-[#cccccc]">
                      <span>📄</span>
                      <span>CODE_OF_CONDUCT.md</span>
                    </div>
                    <div className="flex items-center gap-1 text-[#cccccc]">
                      <span>📄</span>
                      <span>LICENSE</span>
                    </div>
                    <div className="flex items-center gap-1 text-[#cccccc]">
                      <span>📄</span>
                      <span>README.md</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Code Editor */}
              <div className="flex-1 bg-[#1e1e1e]">
                <div className="bg-[#2d2d30] px-4 py-2 border-b border-[#3e3e42]">
                  <span className="text-[#cccccc] text-sm">app.py</span>
                </div>

                <div className="p-4 font-mono text-sm">
                  <div className="space-y-1">
                    <div className="text-[#6a9955]"># Copyright (c) Microsoft Corporation. All</div>
                    <div className="text-[#6a9955]"># Licensed under the MIT License. See LICENSE</div>
                    <div className="text-[#6a9955]"># in the project root for license information.</div>
                    <div></div>
                    <div>
                      <span className="text-[#c586c0]">from</span>
                      <span className="text-[#cccccc]"> flask </span>
                      <span className="text-[#c586c0]">import</span>
                      <span className="text-[#cccccc]"> Flask</span>
                    </div>
                    <div>
                      <span className="text-[#cccccc]">app = Flask(</span>
                      <span className="text-[#ce9178]">__name__</span>
                      <span className="text-[#cccccc]">)</span>
                    </div>
                    <div></div>
                    <div>
                      <span className="text-[#cccccc]">@app.route(</span>
                      <span className="text-[#ce9178]">"/"</span>
                      <span className="text-[#cccccc]">)</span>
                    </div>
                    <div>
                      <span className="text-[#c586c0]">def</span>
                      <span className="text-[#dcdcaa]"> hello</span>
                      <span className="text-[#cccccc]">():</span>
                    </div>
                    <div className="ml-4">
                      <span className="text-[#c586c0]">return</span>
                      <span className="text-[#cccccc]"> app.send_static_file(</span>
                      <span className="text-[#ce9178]">"index.html"</span>
                      <span className="text-[#cccccc]">)</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Chat Panel */}
              <div className="w-80 bg-[#252526] border-l border-[#3e3e42]">
                <div className="bg-[#2d2d30] px-4 py-2 border-b border-[#3e3e42]">
                  <span className="text-[#cccccc] text-sm font-medium">CHAT</span>
                </div>

                <div className="p-4 space-y-4 text-sm">
                  <div>
                    <div className="text-blue-400 font-medium mb-1">app.py Current File</div>
                    <div className="text-[#cccccc]">what's this code doing</div>
                  </div>

                  <div className="bg-[#1e1e1e] p-3 rounded">
                    <div className="text-[#cccccc] leading-relaxed">
                      This code is setting up a basic Flask web application. Let's break it down:
                      <br />
                      <br />
                      1. First, there's a copyright notice and license information in the comments at the top.
                      <br />
                      <br />
                      2. The code imports the Flask class from the flask module:
                      <br />
                      <br />
                      <span className="text-[#c586c0]">from</span> <span className="text-[#cccccc]">flask</span>{" "}
                      <span className="text-[#c586c0]">import</span> <span className="text-[#cccccc]">Flask</span>
                      <br />
                      <br />
                      3. It creates a Flask application instance:
                      <br />
                      <br />
                      <span className="text-[#cccccc]">app = Flask(</span>
                      <span className="text-[#ce9178]">__name__</span>
                      <span className="text-[#cccccc]">)</span>
                      <br />
                      <br />
                      This line initializes a new Flask application. The{" "}
                      <span className="text-[#ce9178]">__name__</span> argument is a Python special variable that gets
                      as value the string "main" when you're executing the script directly.
                      <br />
                      <br />
                      4. The code defines a route for the root URL ("/"):
                      <br />
                      <br />
                      <span className="text-[#cccccc]">@app.route(</span>
                      <span className="text-[#ce9178]">"/"</span>
                      <span className="text-[#cccccc]">)</span>
                      <br />
                      <span className="text-[#c586c0]">def</span> <span className="text-[#dcdcaa]">hello</span>
                      <span className="text-[#cccccc]">():</span>
                      <br />
                      <span className="ml-4">
                        <span className="text-[#c586c0]">return</span>{" "}
                        <span className="text-[#cccccc]">app.send_static_file(</span>
                        <span className="text-[#ce9178]">"index.html"</span>
                        <span className="text-[#cccccc]">)</span>
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 text-xs text-[#888888]">
                    <span>Ask followup (⌘↵)</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Bottom Status Bar */}
            <div className="bg-[#007acc] px-4 py-1 flex items-center justify-between text-xs text-white">
              <div className="flex items-center gap-4">
                <span>SSH: vscode-remote-try-python.devpod</span>
                <span>⚠ 0</span>
                <span>✗ 0</span>
              </div>
              <div className="flex items-center gap-4">
                <span>Ln 12, Col 1</span>
                <span>Spaces: 4</span>
                <span>UTF-8</span>
                <span>LF</span>
                <span>Python</span>
                <span>Cursor Tab</span>
              </div>
            </div>
          </div>
        </div>
        <section>
        <div className="min-h-screen bg-[#0e0f11] text-white flex flex-col items-center justify-center px-4 py-16">
      <div className="max-w-6xl w-full mx-auto text-center">
        <h1 className="text-4xl md:text-6xl font-bold mb-12">
          <span className="text-purple-600">Browse</span> your <span className="text-purple-600">Docs</span> Like
          <br />
          Never <span className="text-purple-600">Before</span>
        </h1>

        <div className="max-w-3xl mx-auto mb-20">
          <p className="text-xl md:text-2xl mb-2">Navigate, visualize and query your documentation in an instant.</p>
          <p className="text-xl md:text-2xl">
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
    </div>
        </section>
        <section>
        
      <div className="max-w-3xl mx-auto text-center">
        <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold mb-6">
          Ready to Get <span className="text-purple">Your</span> <br />
          Stuff <span className="text-purple">Together</span>?
        </h1>

        <p className="text-lg md:text-xl mb-12 max-w-2xl mx-auto">
          Join GYST <span className="font-medium">today</span> and <span className="font-medium">skyrocket</span> your
          problem solving, productivity and documentation management.
        </p>

        <button className="bg-purple hover:bg-purple/90 text-white font-medium py-4 px-12 rounded-full text-lg md:text-xl transition-colors">
          Let's do This!
        </button>
      </div>
    
      </section>
      </main>

      {/* Footer - Moved outside main container for full width */}
      <footer className="bg-[#1a1a1a] border-t border-[#3e3e42] mt-16">
        <div className="max-w-7xl mx-auto px-6 py-12">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
            {/* Brand Section */}
            <div className="col-span-1 md:col-span-2">
              <div className="flex items-center gap-2 mb-4">
                <div className="w-8 h-8 bg-white rounded-full flex items-center justify-center">
                  <div className="w-6 h-6 bg-[#0e0f11] rounded-full flex items-center justify-center">
                    <div className="w-3 h-3 bg-white rounded-full"></div>
                  </div>
                </div>
                <span className="text-xl font-bold">GYST</span>
              </div>
              <p className="text-[#888888] max-w-md mb-6">
                Organize your technical documentation and query it with integrated AI. 
                Never lose time searching through docs again.
              </p>
              <div className="flex items-center gap-4">
                <a href="#" className="text-[#888888] hover:text-white transition-colors">
                  <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M24 4.557c-.883.392-1.832.656-2.828.775 1.017-.609 1.798-1.574 2.165-2.724-.951.564-2.005.974-3.127 1.195-.897-.957-2.178-1.555-3.594-1.555-3.179 0-5.515 2.966-4.797 6.045-4.091-.205-7.719-2.165-10.148-5.144-1.29 2.213-.669 5.108 1.523 6.574-.806-.026-1.566-.247-2.229-.616-.054 2.281 1.581 4.415 3.949 4.89-.693.188-1.452.232-2.224.084.626 1.956 2.444 3.379 4.6 3.419-2.07 1.623-4.678 2.348-7.29 2.04 2.179 1.397 4.768 2.212 7.548 2.212 9.142 0 14.307-7.721 13.995-14.646.962-.695 1.797-1.562 2.457-2.549z"/>
                  </svg>
                </a>
                <a href="#" className="text-[#888888] hover:text-white transition-colors">
                  <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M12.017 0C5.396 0 .029 5.367.029 11.987c0 5.079 3.158 9.417 7.618 11.174-.105-.949-.199-2.403.041-3.439.219-.937 1.406-5.957 1.406-5.957s-.359-.72-.359-1.781c0-1.663.967-2.911 2.168-2.911 1.024 0 1.518.769 1.518 1.688 0 1.029-.653 2.567-.992 3.992-.285 1.193.6 2.165 1.775 2.165 2.128 0 3.768-2.245 3.768-5.487 0-2.861-2.063-4.869-5.008-4.869-3.41 0-5.409 2.562-5.409 5.199 0 1.033.394 2.143.889 2.741.099.120.112.225.083.402-.09.375-.293 1.199-.334 1.363-.053.225-.172.271-.402.165-1.495-.69-2.433-2.878-2.433-4.646 0-3.776 2.748-7.252 7.92-7.252 4.158 0 7.392 2.967 7.392 6.923 0 4.135-2.607 7.462-6.233 7.462-1.214 0-2.357-.629-2.748-1.378l-.748 2.853c-.271 1.043-1.002 2.35-1.492 3.146C9.57 23.812 10.763 24.009 12.017 24.009c6.624 0 11.99-5.367 11.99-11.988C24.007 5.367 18.641.001.012.001 12.017 0z"/>
                  </svg>
                </a>
                <a href="#" className="text-[#888888] hover:text-white transition-colors">
                  <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/>
                  </svg>
                </a>
                <a href="#" className="text-[#888888] hover:text-white transition-colors">
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
                <li><a href="#" className="text-[#888888] hover:text-white transition-colors">Features</a></li>
                <li><a href="#" className="text-[#888888] hover:text-white transition-colors">Pricing</a></li>
                <li><a href="#" className="text-[#888888] hover:text-white transition-colors">Documentation</a></li>
                <li><a href="#" className="text-[#888888] hover:text-white transition-colors">API Reference</a></li>
                <li><a href="#" className="text-[#888888] hover:text-white transition-colors">Changelog</a></li>
              </ul>
            </div>

            {/* Company Links */}
            <div>
              <h3 className="text-white font-semibold mb-4">Company</h3>
              <ul className="space-y-3">
                <li><a href="#" className="text-[#888888] hover:text-white transition-colors">About</a></li>
                <li><a href="#" className="text-[#888888] hover:text-white transition-colors">Blog</a></li>
                <li><a href="#" className="text-[#888888] hover:text-white transition-colors">Careers</a></li>
                <li><a href="#" className="text-[#888888] hover:text-white transition-colors">Contact</a></li>
                <li><a href="#" className="text-[#888888] hover:text-white transition-colors">Support</a></li>
              </ul>
            </div>
          </div>

          {/* Bottom Bar */}
          <div className="border-t border-[#3e3e42] mt-12 pt-8 flex flex-col md:flex-row justify-between items-center">
            <div className="text-[#888888] text-sm mb-4 md:mb-0">
              © 2025 GYST. All rights reserved.
            </div>
            <div className="flex items-center gap-6 text-sm">
              <a href="#" className="text-[#888888] hover:text-white transition-colors">Privacy Policy</a>
              <a href="#" className="text-[#888888] hover:text-white transition-colors">Terms of Service</a>
              <a href="#" className="text-[#888888] hover:text-white transition-colors">Cookie Policy</a>
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
    <div className="bg-white text-black rounded-lg p-8 flex flex-col items-center text-center">
      <div className="mb-4">{icon}</div>
      <h3 className="text-2xl font-bold mb-3">{title}</h3>
      <p>{description}</p>
    </div>
  )
}

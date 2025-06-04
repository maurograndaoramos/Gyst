// "use client"

// import Link from 'next/link'
// import Image from 'next/image'

// export default function LandingPage() {
//   return (
//     <div className="min-h-screen bg-gradient-to-b from-[#3F3F3F] to-[#0E0F11] text-white">
//       {/* Header */}
//       <header className="container mx-auto px-4 py-6 flex items-center justify-between">
//         {/* Logo */}
//         <div className="flex items-center gap-2 md:gap-3">
//           <Image 
//             src="/gyst-logo-white.png" 
//             alt="GYST Logo" 
//             width={69} 
//             height={58}
//             className="w-auto h-10 md:h-14"
//           />
//           <span className="text-2xl md:text-3xl font-bold text-white">GYST</span>
//         </div>

//         {/* Navigation Buttons */}
//         <div className="flex items-center gap-2 md:gap-4">
//           <Link href="/login">
//             <button className="bg-white text-black px-4 md:px-8 py-2 rounded-full text-lg md:text-xl font-normal hover:bg-gray-100 transition-colors shadow-inner">
//               Login
//             </button>
//           </Link>
//           <Link href="/register">
//             <button className="bg-[#1A1A1A] text-white px-6 md:px-12 py-2 rounded-full text-lg md:text-xl font-normal hover:bg-[#2A2A2A] transition-colors">
//               Sign Up
//             </button>
//           </Link>
//         </div>
//       </header>

//       {/* Hero Section */}
//       <main className="container mx-auto px-4 pt-8 md:pt-16 pb-8 text-center">
//         {/* Subtitle */}
//         <p 
//           className="text-xl md:text-3xl font-light mb-6 md:mb-11 text-white"
//           style={{ 
//             fontFamily: 'Inter, sans-serif',
//             fontWeight: 275,
//             textShadow: '0px 4px 4px rgba(0, 0, 0, 0.25)'
//           }}
//         >
//           Introducing GYST
//         </p>

//         {/* Main Headline */}
//         <h1 
//           className="text-4xl md:text-6xl lg:text-7xl font-bold mb-6 md:mb-12 text-white leading-tight max-w-4xl mx-auto px-2"
//           style={{ 
//             fontFamily: 'Inter, sans-serif',
//             fontWeight: 700,
//             lineHeight: '1.21'
//           }}
//         >
//           Find Answers to Your<br className="hidden sm:block" />
//           <span className="sm:hidden"> </span>Documentation — Instantly
//         </h1>

//         {/* Description */}
//         <p 
//           className="text-lg md:text-2xl lg:text-3xl font-light mb-8 md:mb-16 text-[#EAEAEA] max-w-3xl mx-auto leading-relaxed px-2"
//           style={{ 
//             fontFamily: 'Inter, sans-serif',
//             fontWeight: 300,
//             lineHeight: '1.5'
//           }}
//         >
//           GYST Organizes your technical docs and queries them with an integrated AI. Never lose time searching again.
//         </p>

//         {/* CTA Button */}
//         <Link href="/register">
//           <button 
//             className="bg-gradient-to-r from-[#BD0CCA] to-[#A620D9] text-white px-8 md:px-16 lg:px-24 py-3 md:py-4 rounded-full text-xl md:text-3xl lg:text-4xl font-bold hover:from-[#C91AD7] hover:to-[#B12DE6] transition-all duration-200 transform hover:scale-105 shadow-lg"
//             style={{ 
//               fontFamily: 'Inter, sans-serif',
//               fontWeight: 700,
//               boxShadow: '0px 4px 4px rgba(0, 0, 0, 0.25)'
//             }}
//           >
//             Get early Access
//           </button>
//         </Link>

//         {/* Demo Image */}
//         <div className="mt-12 md:mt-20 max-w-5xl mx-auto px-2">
//           <div className="relative rounded-lg overflow-hidden shadow-2xl">
//             <Image 
//               src="/gyst-remake.png" 
//               alt="GYST Platform Demo" 
//               width={1304} 
//               height={978}
//               className="w-full h-auto"
//               priority
//             />
//           </div>
//         </div>
//       </main>
//     </div>
//   )
// }
'"use client"'
import { Button } from "@/components/ui/button"

export default function Component() {
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
      </main>
    </div>
  )
}

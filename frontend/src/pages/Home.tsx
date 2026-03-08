import { Link } from "react-router-dom";
import { ArrowRight, Zap, ShieldCheck, Mail, Image as ImageIcon } from "lucide-react";
import { Logo } from "../components/Logo";

export default function Home() {
    return (
        <div className="min-h-screen bg-[#0B0F19] text-slate-200 font-sans selection:bg-indigo-500/30 overflow-x-hidden">

            {/* Navigation Bar */}
            <nav className="fixed top-0 w-full z-50 bg-[#0B0F19]/80 backdrop-blur-md border-b border-white/10 transition-all duration-300">
                <div className="max-w-7xl mx-auto px-6 h-20 flex items-center justify-between">
                    <div className="flex items-center">
                        <Logo className="h-10 w-auto text-white" />
                    </div>
                    <div className="hidden md:flex items-center gap-8 text-sm font-medium text-slate-400">
                        <a href="#features" className="hover:text-white transition-colors">Features</a>
                        <a href="#how-it-works" className="hover:text-white transition-colors">How it Works</a>
                        <a href="#pricing" className="hover:text-white transition-colors">Pricing</a>
                    </div>
                    <div className="flex items-center gap-4">
                        <Link to="/dashboard" className="text-sm font-medium text-slate-300 hover:text-white transition-colors hidden sm:block">
                            Sign In
                        </Link>
                        <Link
                            to="/dashboard"
                            className="px-5 py-2.5 rounded-full bg-white text-slate-900 text-sm font-bold hover:bg-slate-200 transition-all active:scale-95 flex items-center gap-2"
                        >
                            Get Started <ArrowRight size={16} />
                        </Link>
                    </div>
                </div>
            </nav>

            {/* Hero Section */}
            <section className="relative pt-40 pb-24 md:pt-52 md:pb-32 px-6">
                {/* Abstract Background Elements */}
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-indigo-600/20 rounded-full blur-[120px] pointer-events-none"></div>
                <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-cyan-600/10 rounded-full blur-[100px] pointer-events-none"></div>

                <div className="max-w-5xl mx-auto text-center relative z-10 animate-in fade-in slide-in-from-bottom-8 duration-1000">
                    <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/5 border border-white/10 text-sm font-medium text-indigo-300 mb-8 backdrop-blur-sm">
                        <span className="flex h-2 w-2 rounded-full bg-indigo-400 animate-pulse"></span>
                        Credify 1.0 is now live
                    </div>

                    <h1 className="text-6xl md:text-8xl font-black tracking-tighter text-white mb-8 leading-[1.1]">
                        Automate your <br className="hidden md:block" />
                        <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 via-cyan-400 to-indigo-400 animate-gradient-x">
                            Certificates.
                        </span>
                    </h1>

                    <p className="text-lg md:text-2xl text-slate-400 max-w-3xl mx-auto leading-relaxed mb-12 font-medium">
                        Upload your template, map your data visually, and dispatch thousands of cryptographically-verified credentials directly to your community's inboxes.
                    </p>

                    <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
                        <Link
                            to="/dashboard"
                            className="w-full sm:w-auto px-8 py-4 rounded-full bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-lg transition-all hover:scale-105 shadow-[0_0_30px_rgba(79,70,229,0.3)] flex items-center justify-center gap-2 group"
                        >
                            Start Generating Free
                            <ArrowRight size={20} className="group-hover:translate-x-1 transition-transform" />
                        </Link>
                        <a
                            href="#features"
                            className="w-full sm:w-auto px-8 py-4 rounded-full bg-white/5 hover:bg-white/10 border border-white/10 text-white font-bold text-lg transition-all backdrop-blur-sm flex items-center justify-center"
                        >
                            Discover Features
                        </a>
                    </div>
                </div>

                {/* Hero UI Mockup */}
                <div className="mt-24 max-w-6xl mx-auto relative animate-in fade-in slide-in-from-bottom-12 duration-1000 delay-300 fill-mode-both">
                    <div className="absolute inset-0 bg-gradient-to-t from-[#0B0F19] via-transparent to-transparent z-10 bottom-0 top-1/2"></div>
                    <div className="rounded-2xl border border-white/10 bg-[#121827] shadow-2xl shadow-indigo-500/10 overflow-hidden relative">
                        {/* Windows controls */}
                        <div className="h-10 border-b border-white/5 bg-white/[0.02] flex items-center px-4 gap-2">
                            <div className="w-3 h-3 rounded-full bg-red-500/80"></div>
                            <div className="w-3 h-3 rounded-full bg-yellow-500/80"></div>
                            <div className="w-3 h-3 rounded-full bg-green-500/80"></div>
                        </div>
                        {/* Dashboard preview fake UI */}
                        <div className="p-8 grid grid-cols-1 md:grid-cols-3 gap-6 opacity-60">
                            <div className="col-span-2 h-64 bg-slate-800/50 rounded-xl border border-white/5 flex items-center justify-center">
                                <div className="text-center">
                                    <ImageIcon size={48} className="mx-auto text-slate-600 mb-4" />
                                    <div className="w-48 h-4 bg-slate-700/50 rounded-full mx-auto mb-2"></div>
                                    <div className="w-32 h-4 bg-slate-700/50 rounded-full mx-auto"></div>
                                </div>
                            </div>
                            <div className="flex flex-col gap-6">
                                <div className="h-28 bg-slate-800/50 rounded-xl border border-white/5"></div>
                                <div className="h-28 bg-slate-800/50 rounded-xl border border-white/5"></div>
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            {/* Features Section */}
            <section id="features" className="py-24 px-6 border-t border-white/5 bg-white/[0.02]">
                <div className="max-w-7xl mx-auto">
                    <div className="text-center mb-16">
                        <h2 className="text-3xl md:text-5xl font-bold text-white mb-6">Everything you need to issue credentials at scale.</h2>
                        <p className="text-lg text-slate-400 max-w-2xl mx-auto">Stop editing PDFs one by one. Our infrastructure handles the heavy lifting so you can focus on building your community.</p>
                    </div>

                    <div className="grid md:grid-cols-3 gap-6">
                        {/* Feature 1 */}
                        <div className="p-8 rounded-3xl bg-white/5 border border-white/10 hover:bg-white/10 transition-colors group">
                            <div className="w-12 h-12 rounded-xl bg-indigo-500/20 flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                                <Zap className="text-indigo-400" size={24} />
                            </div>
                            <h3 className="text-xl font-bold text-white mb-3">Lightning Fast Mapping</h3>
                            <p className="text-slate-400 leading-relaxed">Visually drag and drop dynamic text boxes onto your image template. Auto-scaling fonts ensure long names never break the design.</p>
                        </div>

                        {/* Feature 2 */}
                        <div className="p-8 rounded-3xl bg-white/5 border border-white/10 hover:bg-white/10 transition-colors group">
                            <div className="w-12 h-12 rounded-xl bg-cyan-500/20 flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                                <Mail className="text-cyan-400" size={24} />
                            </div>
                            <h3 className="text-xl font-bold text-white mb-3">Automated Email Dispatch</h3>
                            <p className="text-slate-400 leading-relaxed">Upload a CSV of thousands of participants and blast them all personalized emails simultaneously with our async SMTP queues.</p>
                        </div>

                        {/* Feature 3 */}
                        <div className="p-8 rounded-3xl bg-white/5 border border-white/10 hover:bg-white/10 transition-colors group">
                            <div className="w-12 h-12 rounded-xl bg-purple-500/20 flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                                <ShieldCheck className="text-purple-400" size={24} />
                            </div>
                            <h3 className="text-xl font-bold text-white mb-3">Hosted Verification</h3>
                            <p className="text-slate-400 leading-relaxed">Every certificate is injected with a cryptographically secure QR code linking directly to a live, immutable verification page.</p>
                        </div>
                    </div>
                </div>
            </section>

            {/* CTA Section */}
            <section className="py-24 px-6 relative overflow-hidden">
                <div className="absolute inset-0 bg-indigo-600/10"></div>
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-4xl h-full bg-gradient-to-r from-indigo-500/20 to-cyan-500/20 blur-[100px] pointer-events-none"></div>

                <div className="max-w-4xl mx-auto text-center relative z-10 bg-[#121827]/80 backdrop-blur-xl border border-white/10 rounded-3xl p-12 shadow-2xl shadow-indigo-500/10">
                    <h2 className="text-4xl font-bold text-white mb-6">Ready to upgrade your credentials?</h2>
                    <p className="text-xl text-slate-300 mb-10 max-w-2xl mx-auto">Join hundreds of modern event organizers and universities automating their certificate pipeline today.</p>
                    <Link
                        to="/dashboard"
                        className="inline-flex items-center gap-2 px-8 py-4 rounded-full bg-white text-slate-900 font-bold text-lg transition-all hover:scale-105 shadow-xl hover:shadow-white/20"
                    >
                        Create your first Project <ArrowRight size={20} />
                    </Link>
                </div>
            </section>

            {/* Footer */}
            <footer className="border-t border-white/10 bg-[#0B0F19] py-12 px-6 text-center">
                <Logo className="h-10 w-auto text-white mb-6 mx-auto opacity-80" />
                <p className="text-slate-500 text-sm">© {new Date().getFullYear()} Credify Inc. All rights reserved.</p>
            </footer>
        </div>
    );
}

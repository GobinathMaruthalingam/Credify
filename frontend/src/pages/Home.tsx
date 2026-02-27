import { Link } from "react-router-dom";
import { ArrowRight, FileSignature } from "lucide-react";

export default function Home() {
    return (
        <div className="flex flex-col items-center justify-center min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 text-white p-6">
            <div className="max-w-3xl text-center space-y-8 animate-in fade-in slide-in-from-bottom-8 duration-1000">
                <div className="flex justify-center mb-6">
                    <div className="p-4 bg-indigo-500/20 rounded-full border border-indigo-500/30">
                        <FileSignature size={48} className="text-indigo-400" />
                    </div>
                </div>

                <h1 className="text-5xl md:text-7xl font-extrabold tracking-tight">
                    Automate your <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 to-cyan-400">Certificates</span>
                </h1>

                <p className="text-xl text-slate-300 max-w-2xl mx-auto leading-relaxed">
                    Upload your template, map your data, and dispatch hundreds of personalized certificates in minutes. Built for modern teams.
                </p>

                <div className="pt-8 flex flex-col sm:flex-row gap-4 justify-center">
                    <Link
                        to="/dashboard"
                        className="flex items-center gap-2 px-8 py-4 bg-indigo-600 hover:bg-indigo-500 text-white rounded-full font-medium transition-all hover:scale-105 shadow-[0_0_20px_rgba(79,70,229,0.4)]"
                    >
                        Go to Dashboard <ArrowRight size={20} />
                    </Link>
                    <button className="px-8 py-4 bg-slate-800 hover:bg-slate-700 border border-slate-700 text-white rounded-full font-medium transition-all">
                        View Live Demo
                    </button>
                </div>
            </div>
        </div>
    );
}

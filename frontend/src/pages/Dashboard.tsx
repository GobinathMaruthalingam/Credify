import { Link } from "react-router-dom";
import { LayoutDashboard, FileImage, Settings, Send, LogOut } from "lucide-react";

export default function Dashboard() {
    return (
        <div className="flex h-screen bg-slate-50">
            {/* Sidebar */}
            <aside className="w-64 bg-white border-r border-slate-200 flex flex-col">
                <div className="p-6 border-b border-slate-100 pb-5">
                    <h2 className="text-2xl font-bold text-slate-800 tracking-tight">Credify<span className="text-indigo-600">.</span></h2>
                </div>
                <nav className="flex-1 p-4 space-y-1">
                    <a href="#" className="flex items-center gap-3 px-3 py-2.5 bg-indigo-50 text-indigo-700 rounded-lg font-medium">
                        <LayoutDashboard size={20} /> Dashboard
                    </a>
                    <a href="#" className="flex items-center gap-3 px-3 py-2.5 text-slate-600 hover:bg-slate-50 hover:text-slate-900 rounded-lg font-medium transition-colors">
                        <FileImage size={20} /> Templates
                    </a>
                    <a href="#" className="flex items-center gap-3 px-3 py-2.5 text-slate-600 hover:bg-slate-50 hover:text-slate-900 rounded-lg font-medium transition-colors">
                        <Send size={20} /> Dispatches
                    </a>
                    <a href="#" className="flex items-center gap-3 px-3 py-2.5 text-slate-600 hover:bg-slate-50 hover:text-slate-900 rounded-lg font-medium transition-colors">
                        <Settings size={20} /> Settings
                    </a>
                </nav>
                <div className="p-4 border-t border-slate-100">
                    <button className="flex items-center gap-3 px-3 py-2 text-slate-500 hover:text-red-600 w-full rounded-lg font-medium transition-colors">
                        <LogOut size={20} /> Log Out
                    </button>
                </div>
            </aside>

            {/* Main Content */}
            <main className="flex-1 overflow-auto">
                <header className="bg-white border-b border-slate-200 px-8 py-5 flex justify-between items-center sticky top-0 z-10">
                    <h1 className="text-xl font-semibold text-slate-800">Projects Dashboard</h1>
                    <div className="flex items-center gap-4">
                        <div className="h-9 w-9 bg-indigo-100 text-indigo-700 rounded-full flex items-center justify-center font-bold text-sm">
                            JD
                        </div>
                    </div>
                </header>

                <div className="p-8 max-w-6xl mx-auto space-y-6">
                    <div className="bg-white p-8 rounded-2xl border border-slate-200 shadow-sm flex flex-col items-center justify-center text-center space-y-4 py-16">
                        <div className="h-16 w-16 bg-slate-100 rounded-full flex items-center justify-center text-slate-400 mb-2">
                            <FileImage size={32} />
                        </div>
                        <h3 className="text-xl font-semibold text-slate-800">No projects yet</h3>
                        <p className="text-slate-500 max-w-md">Get started by creating a new project. You'll need a template image and a CSV of participants.</p>
                        <button className="mt-4 px-6 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg font-medium transition-colors shadow-sm">
                            Create First Project
                        </button>
                    </div>
                </div>
            </main>
        </div>
    );
}

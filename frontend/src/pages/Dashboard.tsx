import { useState } from "react";
import { LayoutDashboard, FileImage, Settings, Send, LogOut } from "lucide-react";
import TemplateUpload from "../components/TemplateUpload";
import EditorCanvas from "../components/EditorCanvas";

export default function Dashboard() {
    const [templateUrl, setTemplateUrl] = useState<string | null>(null);

    return (
        <div className="flex h-screen bg-slate-50">
            {/* Sidebar */}
            <aside className="w-64 bg-white border-r border-slate-200 flex flex-col z-20 shadow-sm relative">
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
            <main className="flex-1 overflow-auto flex flex-col relative z-0">
                <header className="bg-white/80 backdrop-blur-md border-b border-slate-200 px-8 py-5 flex justify-between items-center sticky top-0 z-10 w-full">
                    <h1 className="text-xl font-semibold text-slate-800">Projects Dashboard</h1>
                    <div className="flex items-center gap-4">
                        <div className="h-9 w-9 bg-gradient-to-tr from-indigo-500 to-cyan-400 text-white rounded-full flex items-center justify-center font-bold text-sm shadow-md">
                            JD
                        </div>
                    </div>
                </header>

                <div className="p-8 max-w-[1200px] w-full mx-auto space-y-6 flex-1">
                    {!templateUrl ? (
                        <div className="max-w-3xl mx-auto mt-12 animate-in fade-in zoom-in-95 duration-500">
                            <TemplateUpload onUpload={(url) => setTemplateUrl(url)} />
                        </div>
                    ) : (
                        <div className="h-full flex flex-col animate-in fade-in slide-in-from-bottom-4 duration-500">
                            <div className="flex justify-between items-center mb-4">
                                <h2 className="text-2xl font-bold text-slate-800">Map Certificate</h2>
                                <div className="flex gap-3">
                                    <button onClick={() => setTemplateUrl(null)} className="px-4 py-2 text-slate-600 hover:bg-slate-200 bg-slate-100 rounded-lg font-medium transition-colors">
                                        Re-upload
                                    </button>
                                    <button className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg font-medium transition-colors shadow-sm">
                                        Continue to Dispatch
                                    </button>
                                </div>
                            </div>
                            <EditorCanvas templateUrl={templateUrl} />
                        </div>
                    )}
                </div>
            </main>
        </div>
    );
}

import { useState, useEffect } from "react";
import { LayoutDashboard, FileImage, Settings, Send, LogOut, FileSignature, Activity, FolderKanban, History } from "lucide-react";
import axios from "axios";
import TemplateUpload from "../components/TemplateUpload";
import EditorCanvas from "../components/EditorCanvas";
import { useNavigate } from "react-router-dom";
import { Logo } from "../components/Logo";
import { API_BASE_URL } from "../lib/api";

export default function Dashboard() {
    const navigate = useNavigate();
    const [templateUrl, setTemplateUrl] = useState<string | null>(null);
    const [projectId, setProjectId] = useState<number | null>(null);
    const [projectsList, setProjectsList] = useState<any[]>([]);
    const [initialMappingData, setInitialMappingData] = useState<any[] | null>(null);
    const [kpiData, setKpiData] = useState<any>(null);
    const [jobsList, setJobsList] = useState<any[]>([]);

    useEffect(() => {
        const fetchProjects = async () => {
            try {
                const token = localStorage.getItem("token") || "mock_token";
                const [projRes, kpiRes, jobsRes] = await Promise.all([
                    axios.get(`${API_BASE_URL}/api/projects/`, { headers: { Authorization: `Bearer ${token}` } }),
                    axios.get(`${API_BASE_URL}/api/projects/kpi`, { headers: { Authorization: `Bearer ${token}` } }),
                    axios.get(`${API_BASE_URL}/api/projects/jobs`, { headers: { Authorization: `Bearer ${token}` } })
                ]);

                setProjectsList(projRes.data);
                setKpiData(kpiRes.data);
                setJobsList(jobsRes.data);
            } catch (err) {
                console.error("Failed to fetch projects list", err);
            }
        };
        fetchProjects();
    }, []);

    const handleUploadComplete = async (url: string) => {
        // Just set the template URL to enter "Editor Mode" without creating a DB record yet
        setTemplateUrl(url);
        setProjectId(null); // Explicitly null signals a fresh, unsaved project
        setInitialMappingData([]);
    };

    return (
        <div className="flex h-screen bg-slate-50">
            {/* Sidebar */}
            <aside className="w-64 bg-white border-r border-slate-200 flex flex-col z-20 shadow-sm relative">
                <div className="pt-6 pb-5 pl-[28px] border-b border-slate-100">
                    <Logo className="h-10 w-auto text-slate-800" />
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
                        <div className="max-w-5xl mx-auto mt-4 animate-in fade-in zoom-in-95 duration-500 space-y-8 pb-12">

                            {/* Dashboard KPIs */}
                            {kpiData && (
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                                    <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex flex-col justify-between hover:shadow-md transition-shadow">
                                        <div className="flex items-center gap-3 text-slate-500 mb-2">
                                            <div className="p-2 bg-indigo-50 rounded-lg"><FileSignature size={20} className="text-indigo-500" /></div>
                                            <span className="font-semibold text-sm">Total Dispatched</span>
                                        </div>
                                        <div className="text-4xl font-black text-slate-800 mt-2">{kpiData.total_certificates.toLocaleString()}</div>
                                    </div>
                                    <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex flex-col justify-between hover:shadow-md transition-shadow">
                                        <div className="flex items-center gap-3 text-slate-500 mb-2">
                                            <div className="p-2 bg-cyan-50 rounded-lg"><Activity size={20} className="text-cyan-500" /></div>
                                            <span className="font-semibold text-sm">Average Open Rate</span>
                                        </div>
                                        <div className="text-4xl font-black text-slate-800 mt-2">{kpiData.hit_rate_percentage}%</div>
                                    </div>
                                    <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex flex-col justify-between hover:shadow-md transition-shadow">
                                        <div className="flex items-center gap-3 text-slate-500 mb-2">
                                            <div className="p-2 bg-purple-50 rounded-lg"><FolderKanban size={20} className="text-purple-500" /></div>
                                            <span className="font-semibold text-sm">Active Campaigns</span>
                                        </div>
                                        <div className="text-4xl font-black text-slate-800 mt-2">{kpiData.total_projects}</div>
                                    </div>
                                </div>
                            )}

                            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
                                {/* Left Column: Action Items & History */}
                                <div className="lg:col-span-2 space-y-8">
                                    {/* Canvas upload */}
                                    <div className="bg-white rounded-2xl border border-slate-200 p-8 shadow-sm">
                                        <h3 className="text-lg font-bold text-slate-800 mb-6">Launch New Campaign</h3>
                                        <TemplateUpload onUpload={handleUploadComplete} />
                                    </div>

                                    {/* Dispatch History Table */}
                                    {jobsList.length > 0 && (
                                        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden mt-8">
                                            <div className="px-6 py-5 border-b border-slate-100 bg-slate-50/50">
                                                <h3 className="font-bold text-slate-800 flex items-center gap-2">
                                                    <History size={18} className="text-slate-400" />
                                                    Dispatch History
                                                </h3>
                                            </div>
                                            <div className="overflow-x-auto">
                                                <table className="w-full text-left text-sm whitespace-nowrap">
                                                    <thead className="text-xs text-slate-500 uppercase bg-white border-b border-slate-100">
                                                        <tr>
                                                            <th className="px-6 py-4 font-semibold">Job ID</th>
                                                            <th className="px-6 py-4 font-semibold">Date Dispatched</th>
                                                            <th className="px-6 py-4 font-semibold">Delivery Status</th>
                                                            <th className="px-6 py-4 font-semibold">Volume</th>
                                                        </tr>
                                                    </thead>
                                                    <tbody className="divide-y divide-slate-100">
                                                        {jobsList.map(job => (
                                                            <tr key={job.id} className="hover:bg-slate-50/80 transition-colors">
                                                                <td className="px-6 py-4 font-medium text-slate-900">#CRD-{String(job.id).padStart(4, '0')}</td>
                                                                <td className="px-6 py-4 text-slate-500">
                                                                    {new Date(job.created_at).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}
                                                                </td>
                                                                <td className="px-6 py-4">
                                                                    <span className={`px-2.5 py-1 rounded-full text-xs font-bold inline-flex items-center gap-1 ${job.status === 'completed' ? 'bg-emerald-100 text-emerald-700' :
                                                                        job.status === 'failed' ? 'bg-rose-100 text-rose-700' :
                                                                            'bg-amber-100 text-amber-700 animate-pulse'
                                                                        }`}>
                                                                        {job.status === 'completed' ? '✓' : job.status === 'pending' ? '⚡' : '✕'} {job.status.toUpperCase()}
                                                                    </span>
                                                                </td>
                                                                <td className="px-6 py-4 text-slate-500 font-medium">
                                                                    {job.total_certificates.toLocaleString()} Certs
                                                                </td>
                                                            </tr>
                                                        ))}
                                                    </tbody>
                                                </table>
                                            </div>
                                        </div>
                                    )}
                                </div>

                                {/* Right Column: Recent Projects Drawer */}
                                <div className="lg:col-span-1">
                                    {projectsList.length > 0 ? (
                                        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 sticky top-24">
                                            <h3 className="text-sm font-bold text-slate-500 uppercase tracking-widest mb-4">Resume Drafts</h3>
                                            <div className="flex flex-col gap-3">
                                                {projectsList.map(p => (
                                                    <div
                                                        key={p.id}
                                                        onClick={() => {
                                                            setTemplateUrl(p.template_url);
                                                            setProjectId(p.id);
                                                            setInitialMappingData(p.mapping_data || []);
                                                        }}
                                                        className="bg-slate-50 p-4 rounded-xl border border-slate-200 hover:border-indigo-400 hover:shadow-md cursor-pointer transition-all flex items-center gap-4 group"
                                                    >
                                                        <div className="w-10 h-10 bg-white rounded-lg flex items-center justify-center shrink-0 border border-slate-200 group-hover:border-indigo-300 transition-colors">
                                                            <FileImage className="w-5 h-5 text-indigo-500" />
                                                        </div>
                                                        <div className="truncate">
                                                            <h4 className="font-bold text-slate-700 truncate text-sm">{p.name || "Untitled Draft"}</h4>
                                                            <p className="text-[11px] text-slate-400 mt-0.5 uppercase tracking-wide">ID: {p.id}</p>
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    ) : (
                                        <div className="bg-white rounded-2xl border border-slate-200 border-dashed shadow-sm p-8 text-center text-slate-500 sticky top-24">
                                            <FileImage className="w-12 h-12 mx-auto text-slate-300 mb-3" />
                                            <p className="font-medium text-sm">No recent drafts found. Upload a template to start.</p>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    ) : (
                        <div className="h-full flex flex-col animate-in fade-in slide-in-from-bottom-4 duration-500">
                            <div className="flex justify-between items-center mb-4">
                                <h2 className="text-2xl font-bold text-slate-800">Map Certificate</h2>
                                <div className="flex gap-3">
                                    <button
                                        onClick={() => {
                                            setTemplateUrl(null);
                                            setProjectId(null);
                                            setInitialMappingData(null);
                                        }}
                                        className="px-4 py-2 text-slate-600 hover:bg-slate-200 bg-slate-100 rounded-lg font-medium transition-colors"

                                    >
                                        Re-upload
                                    </button>
                                    <button
                                        onClick={() => navigate(`/dispatch/${projectId}`)}
                                        className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg font-medium transition-colors shadow-sm"
                                    >
                                        Continue to Dispatch
                                    </button>
                                </div>
                            </div>
                            <EditorCanvas
                                key={projectId || 'new'}
                                templateUrl={templateUrl!}
                                projectId={projectId}
                                initialMappingData={initialMappingData}
                                onSave={(newId) => setProjectId(newId)}
                            />
                        </div>
                    )}
                </div>
            </main>
        </div>
    );
}

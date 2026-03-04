import { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import { Loader2, CheckCircle2, XCircle, Send, UploadCloud, FileSpreadsheet, Edit3, ArrowLeft } from 'lucide-react';
import Papa from 'papaparse';
import ReactQuill from 'react-quill-new';
import 'react-quill-new/dist/quill.snow.css';
import { useParams, useNavigate } from 'react-router-dom';

const quillModules = {
    toolbar: [
        [{ 'header': [1, 2, 3, 4, 5, 6, false] }],
        [{ 'font': [] }],
        [{ 'size': ['small', false, 'large', 'huge'] }],
        ['bold', 'italic', 'underline', 'strike'],
        [{ 'color': [] }, { 'background': [] }],
        [{ 'align': [] }],
        [{ 'list': 'ordered' }, { 'list': 'bullet' }],
        [{ 'indent': '-1' }, { 'indent': '+1' }],
        ['link', 'image', 'video'],
        ['clean']
    ]
};

export default function DispatchPage() {
    const { id } = useParams<{ id: string }>();
    const projectId = parseInt(id || "0", 10);
    const navigate = useNavigate();

    const [step, setStep] = useState<'upload' | 'compose' | 'dispatching'>('upload');
    const [projectName, setProjectName] = useState("Loading Project...");

    // Upload State
    const [csvData, setCsvData] = useState<any[]>([]);
    const [fileName, setFileName] = useState<string | null>(null);
    const [fileError, setFileError] = useState<string | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

    // Compose State
    const [emailSubject, setEmailSubject] = useState("");
    const [emailBody, setEmailBody] = useState("");
    const [editorMode, setEditorMode] = useState<'lexical' | 'html'>('lexical');
    const [previewHtml, setPreviewHtml] = useState(false);
    const [showTestModal, setShowTestModal] = useState(false);
    const [testEmails, setTestEmails] = useState("");
    // Dispatching State
    const [jobId, setJobId] = useState<number | null>(null);
    const [status, setStatus] = useState<'idle' | 'starting' | 'processing' | 'completed' | 'failed'>('idle');
    const [stats, setStats] = useState({
        total: 0,
        processed: 0,
        success: 0,
        failed: 0
    });

    useEffect(() => {
        const fetchProject = async () => {
            if (!projectId) return;
            try {
                const token = localStorage.getItem("token") || "mock_token";
                // Optionally fetch project details if we need project name
                const res = await axios.get(`http://localhost:8000/api/projects/`, {
                    headers: { Authorization: `Bearer ${token}` }
                });
                const proj = res.data.find((p: any) => p.id === projectId);
                if (proj) setProjectName(proj.name || "Untitled Credential");
            } catch (err) {
                console.error(err);
            }
        };
        fetchProject();
    }, [projectId]);

    useEffect(() => {
        if (!jobId || status === 'completed' || status === 'failed') return;
        const token = localStorage.getItem("token") || "mock_token";

        const interval = setInterval(async () => {
            try {
                const res = await axios.get(`http://localhost:8000/api/projects/jobs/${jobId}`, {
                    headers: { Authorization: `Bearer ${token}` }
                });
                const job = res.data;

                setStats({
                    total: job.total_certificates,
                    processed: job.processed_certificates,
                    success: job.successful_deliveries,
                    failed: job.failed_deliveries
                });

                if (job.status === 'completed' || job.status === 'failed') {
                    setStatus(job.status);
                    clearInterval(interval);
                }
            } catch (error) {
                console.error("Polling error:", error);
            }
        }, 2000);

        return () => clearInterval(interval);
    }, [jobId, status]);

    const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        if (!file.name.endsWith('.csv')) {
            setFileError("Upload a valid .csv file.");
            return;
        }

        setFileName(file.name);
        setFileError(null);

        Papa.parse(file, {
            header: true,
            skipEmptyLines: true,
            complete: (results) => {
                if (results.errors.length) {
                    setFileError("Failed to parse CSV file formatting.");
                    return;
                }
                setCsvData(results.data);
                setStats(prev => ({ ...prev, total: results.data.length }));
            }
        });
    };

    const handleDispatch = async () => {
        if (!projectId || csvData.length === 0) return;
        setStep('dispatching');
        setStatus('starting');
        try {
            const token = localStorage.getItem("token") || "mock_token";
            const res = await axios.post(`http://localhost:8000/api/projects/${projectId}/dispatch`, {
                csv_data: csvData,
                email_subject: emailSubject,
                email_body: emailBody
            }, {
                headers: { Authorization: `Bearer ${token}` }
            });
            setJobId(res.data.id);
            setStatus('processing');
        } catch (error: any) {
            console.error("Dispatch failed:", error);
            setStatus('failed');
            alert(error.response?.data?.detail || "Failed to start dispatch. Ensure your layout mapping is saved.");
            setStep('compose');
        }
    };

    const progressPercent = stats.total > 0 ? Math.round((stats.processed / stats.total) * 100) : 0;

    return (
        <div className="min-h-screen bg-slate-50 flex flex-col items-center py-12 px-4 sm:px-6 lg:px-8">
            <div className={`w-full transition-all duration-300 ${step === 'compose' ? 'max-w-5xl' : 'max-w-xl'}`}>

                <button
                    onClick={() => navigate('/dashboard')}
                    className="mb-6 flex items-center gap-2 text-slate-500 hover:text-indigo-600 font-semibold transition-colors"
                >
                    <ArrowLeft size={18} /> Back to Dashboard
                </button>

                <div className="bg-white rounded-2xl shadow-xl border border-slate-200 overflow-hidden">
                    <div className="px-8 py-6 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
                        <div>
                            <h2 className="text-2xl font-black text-slate-800 tracking-tight flex items-center gap-3">
                                <Send className="w-6 h-6 text-indigo-500" />
                                {step === 'compose' ? 'Design Email Template' : 'Dispatch Configuration'}
                            </h2>
                            <p className="text-slate-500 text-sm mt-1 font-medium">Project: <span className="text-indigo-600">{projectName}</span></p>
                        </div>
                    </div>

                    <div className="p-8">
                        {step === 'upload' && (
                            <div className="space-y-8 max-w-md mx-auto py-4">
                                {!csvData.length ? (
                                    <div className="text-center space-y-5">
                                        <div className="w-20 h-20 bg-slate-50 rounded-full flex flex-col items-center justify-center mx-auto shadow-inner border border-slate-100">
                                            <FileSpreadsheet className="w-10 h-10 text-slate-400" />
                                        </div>
                                        <div>
                                            <h4 className="text-xl font-bold text-slate-800">Assign Recipient Dataset</h4>
                                            <p className="text-slate-500 text-sm mt-2 leading-relaxed">Upload the dataset containing recipient Names and Emails to dispatch mapping. Ensure proper column headers.</p>
                                        </div>

                                        <input
                                            type="file"
                                            accept=".csv"
                                            className="hidden"
                                            ref={fileInputRef}
                                            onChange={handleFileUpload}
                                        />
                                        <button
                                            onClick={() => fileInputRef.current?.click()}
                                            className="w-full py-4 mt-2 bg-white border-2 border-dashed border-indigo-200 hover:border-indigo-400 hover:bg-indigo-50 text-indigo-600 font-bold text-lg rounded-xl transition-all flex items-center justify-center gap-2"
                                        >
                                            <UploadCloud className="w-6 h-6" />
                                            Upload CSV file
                                        </button>
                                        {fileError && <p className="text-red-500 text-sm font-semibold animate-pulse">{fileError}</p>}
                                    </div>
                                ) : (
                                    <div className="text-center space-y-5 animate-in slide-in-from-bottom-4 duration-300">
                                        <div className="w-20 h-20 bg-emerald-50 rounded-full flex items-center justify-center mx-auto shadow-inner border border-emerald-100">
                                            <CheckCircle2 className="w-10 h-10 text-emerald-500" />
                                        </div>
                                        <div>
                                            <h4 className="text-xl font-bold text-slate-800">Ready for Launch</h4>
                                            <p className="text-slate-500 text-sm mt-2">Dataset successfully compiled and mapped.</p>
                                        </div>
                                        <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 text-left flex items-center justify-between">
                                            <div className="truncate">
                                                <p className="font-bold text-slate-700 truncate">{fileName}</p>
                                                <p className="text-indigo-600 font-semibold text-sm mt-0.5">{csvData.length} recipients identified</p>
                                            </div>
                                            <button onClick={() => setCsvData([])} className="text-sm font-bold text-slate-400 hover:text-red-500 transition-colors">Change</button>
                                        </div>

                                        <button
                                            onClick={() => setStep('compose')}
                                            className="w-full py-4 mt-4 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-lg rounded-xl shadow-lg shadow-indigo-200 transition-all flex justify-center items-center gap-3"
                                        >
                                            <Edit3 className="w-5 h-5" />
                                            Next: Design Email
                                        </button>
                                    </div>
                                )}
                            </div>
                        )}

                        {step === 'compose' && (
                            <div className="space-y-6 animate-in slide-in-from-right-4 duration-300">
                                <div className="flex items-center gap-3 bg-white border border-slate-300 rounded-lg py-2 px-4 w-full lg:w-2/3 focus-within:ring-2 focus-within:ring-indigo-500 transition-shadow">
                                    <label className="text-sm font-bold text-slate-800 shrink-0 select-none flex items-center gap-1">Subject <span className="text-red-500">*</span></label>
                                    <div className="w-px h-5 bg-slate-200"></div>
                                    <input
                                        type="text"
                                        placeholder="Enter Email Subject"
                                        value={emailSubject}
                                        onChange={e => setEmailSubject(e.target.value)}
                                        className="w-full h-full outline-none text-slate-800 font-medium placeholder:text-slate-400 bg-transparent"
                                    />
                                </div>

                                <div className="bg-[#f0f4fc] p-5 rounded-xl border border-indigo-100 text-left">
                                    <h4 className="text-sm font-bold text-slate-800 mb-1">Personalised Tags</h4>
                                    <p className="text-xs text-slate-500 mb-4">These tags can be used to dynamically add matching data to each outbound email.</p>
                                    <div className="flex flex-wrap gap-6 text-sm">
                                        <span className="flex items-center gap-2 text-slate-700"><span className="w-1.5 h-1.5 rounded-full bg-slate-800"></span> <code className="font-semibold bg-white px-1.5 py-0.5 rounded border border-slate-200 text-indigo-700">{"{name}"}</code> adds the Recipient Name</span>
                                        <span className="flex items-center gap-2 text-slate-700"><span className="w-1.5 h-1.5 rounded-full bg-slate-800"></span> <code className="font-semibold bg-white px-1.5 py-0.5 rounded border border-slate-200 text-indigo-700">{"{project_name}"}</code> adds the Initiative Name</span>
                                        <span className="flex items-center gap-2 text-slate-700"><span className="w-1.5 h-1.5 rounded-full bg-slate-800"></span> <code className="font-semibold bg-white px-1.5 py-0.5 rounded border border-slate-200 text-indigo-700">{"{credential_button}"}</code> embeds the Verification Link Button</span>
                                    </div>
                                </div>

                                <div className="space-y-0 relative z-0">
                                    <div className="flex items-end justify-between relative z-10">
                                        <div className="flex">
                                            <button
                                                onClick={() => { setEditorMode('lexical'); setPreviewHtml(false); }}
                                                className={`px-6 py-3.5 text-sm font-bold transition-all duration-300 border border-slate-200 rounded-tl-xl ${editorMode === 'lexical' ? 'bg-white text-indigo-700 border-b-white mb-[-1px] z-20 relative' : 'bg-slate-50 text-slate-500 border-b-transparent mb-[-1px] relative z-10 hover:bg-slate-100 hover:text-slate-700'}`}
                                            >
                                                Rich Text Builder
                                            </button>
                                            <button
                                                onClick={() => { setEditorMode('html'); setPreviewHtml(false); }}
                                                className={`px-6 py-3.5 text-sm font-bold transition-all duration-300 border border-l-0 border-slate-200 rounded-tr-xl ${editorMode === 'html' ? 'bg-white text-indigo-700 border-b-white mb-[-1px] z-20 relative' : 'bg-slate-50 text-slate-500 border-b-transparent mb-[-1px] relative z-10 hover:bg-slate-100 hover:text-slate-700'}`}
                                            >
                                                Developer HTML
                                            </button>
                                        </div>
                                        <div className={`transition-opacity duration-300 pb-3 ${editorMode === 'html' ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}>
                                            <button
                                                onClick={() => setPreviewHtml(!previewHtml)}
                                                className={`px-5 py-2 text-xs font-bold rounded-lg transition-colors border ${previewHtml ? 'bg-indigo-600 border-indigo-600 text-white shadow-md' : 'bg-indigo-50 border-indigo-200 text-indigo-600 hover:bg-indigo-100'}`}
                                            >
                                                {previewHtml ? 'Edit Code' : 'Preview HTML'}
                                            </button>
                                        </div>
                                    </div>
                                    <div className="border border-slate-200 rounded-b-xl rounded-tr-xl bg-white relative z-0 overflow-hidden shadow-sm">
                                        <div className="relative w-full h-[450px]">
                                            <div className={`absolute inset-0 transition-opacity duration-300 ${editorMode === 'lexical' ? 'opacity-100 z-10' : 'opacity-0 z-0 pointer-events-none'}`}>
                                                <ReactQuill
                                                    theme="snow"
                                                    value={emailBody}
                                                    onChange={setEmailBody}
                                                    modules={quillModules}
                                                    className="h-[407px] border-none [&_.ql-toolbar]:border-x-0 [&_.ql-toolbar]:border-t-0 [&_.ql-toolbar]:border-b-slate-200 [&_.ql-container]:border-none [&_.ql-toolbar]:bg-white [&_.ql-toolbar]:py-3"
                                                />
                                            </div>
                                            <div className={`absolute inset-0 transition-opacity duration-300 ${editorMode === 'html' ? 'opacity-100 z-10' : 'opacity-0 z-0 pointer-events-none'}`}>
                                                {previewHtml ? (
                                                    <div className="w-full h-full p-6 bg-white overflow-auto">
                                                        <div dangerouslySetInnerHTML={{ __html: emailBody }} />
                                                    </div>
                                                ) : (
                                                    <textarea
                                                        value={emailBody}
                                                        onChange={e => setEmailBody(e.target.value)}
                                                        className="w-full h-full p-6 font-mono text-[13px] text-slate-700 outline-none resize-none leading-relaxed bg-slate-50/50"
                                                        placeholder="<h1>Write your raw HTML template here...</h1>&#10;<p>Make sure to include {credential_button}</p>"
                                                    ></textarea>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                <div className="flex justify-between items-center pt-8">
                                    <button
                                        onClick={() => setStep('upload')}
                                        className="px-6 py-3 rounded-xl font-bold text-slate-500 hover:text-slate-800 hover:bg-slate-100 transition-colors"
                                    >
                                        Return to Details
                                    </button>
                                    <div className="flex items-center gap-4">
                                        <button
                                            onClick={() => setShowTestModal(true)}
                                            className="px-6 py-3 rounded-xl font-bold bg-white border-2 border-slate-200 text-indigo-600 hover:border-indigo-200 hover:bg-indigo-50 transition-all focus:ring-4 focus:ring-indigo-100"
                                        >
                                            Send Test Email
                                        </button>

                                        <button
                                            onClick={handleDispatch}
                                            disabled={!emailSubject || !emailBody}
                                            className="px-8 py-3 rounded-xl font-black bg-indigo-600 hover:bg-indigo-700 text-white shadow-xl shadow-indigo-200/50 disabled:opacity-50 disabled:shadow-none disabled:cursor-not-allowed flex items-center gap-2 transition-all hover:-translate-y-0.5 active:translate-y-0"
                                        >
                                            <Send className="w-5 h-5" />
                                            Dispatch Batch
                                        </button>

                                    </div>
                                </div>
                            </div>
                        )}

                        {step === 'dispatching' && (
                            <div className="space-y-8 max-w-2xl mx-auto py-8 text-center animate-in zoom-in-95 duration-500">
                                <div>
                                    <p className="text-sm font-bold text-slate-400 uppercase tracking-widest mb-2">Delivery Progress</p>
                                    <div className="flex justify-center items-end gap-3">
                                        <h4 className="text-5xl font-black text-slate-800 tracking-tight">
                                            {Math.min(stats.processed, stats.total)}
                                        </h4>
                                        <span className="text-slate-400 text-2xl font-bold mb-1">/ {stats.total}</span>
                                    </div>
                                </div>

                                {/* Progress Bar */}
                                <div className="w-full h-6 bg-slate-100 rounded-full overflow-hidden shrink-0 shadow-inner">
                                    <div
                                        className="h-full bg-gradient-to-r from-indigo-500 to-cyan-400 transition-all duration-300 ease-out"
                                        style={{ width: `${progressPercent}%` }}
                                    />
                                </div>

                                <div className="grid grid-cols-2 gap-6 text-left">
                                    <div className="bg-emerald-50 rounded-2xl p-6 border border-emerald-100 shadow-sm">
                                        <div className="flex items-center gap-2 text-emerald-600 font-bold mb-2">
                                            <CheckCircle2 className="w-5 h-5" /> Delivered Successfully
                                        </div>
                                        <p className="text-4xl font-black text-emerald-700">{stats.success}</p>
                                    </div>
                                    <div className="bg-rose-50 rounded-2xl p-6 border border-rose-100 shadow-sm">
                                        <div className="flex items-center gap-2 text-rose-600 font-bold mb-2">
                                            <XCircle className="w-5 h-5" /> Blocks / Bounces
                                        </div>
                                        <p className="text-4xl font-black text-rose-700">{stats.failed}</p>
                                    </div>
                                </div>

                                <div className="pt-6">
                                    {status === 'processing' || status === 'starting' ? (
                                        <div className="inline-flex items-center gap-3 text-indigo-600 font-bold text-lg px-6 py-3 bg-indigo-50 border border-indigo-100 rounded-full animate-pulse">
                                            <Loader2 className="w-5 h-5 animate-spin" />
                                            Milling Certificates in Background Pipeline...
                                        </div>
                                    ) : status === 'completed' ? (
                                        <div className="inline-flex flex-col items-center gap-4 w-full">
                                            <div className="w-full flex items-center justify-center gap-3 text-emerald-600 font-black text-xl px-6 py-4 bg-emerald-50 border-2 border-emerald-200 rounded-2xl">
                                                <CheckCircle2 className="w-8 h-8" />
                                                Dispatch Sequence Finished!
                                            </div>
                                            <button onClick={() => navigate('/dashboard')} className="mt-4 px-6 py-2 text-slate-500 font-bold hover:text-slate-800 transition-colors">Return to Dashboard</button>
                                        </div>
                                    ) : (
                                        <div className="text-rose-500 font-bold bg-rose-50 px-6 py-4 rounded-xl border-2 border-rose-100 flex flex-col items-center gap-2">
                                            <XCircle className="w-8 h-8" />
                                            <p>Background Job Failed. Check Server Logs.</p>
                                        </div>
                                    )}
                                </div>
                            </div>
                        )}
                    </div>
                </div>

                {/* Test Email Modal */}
                {showTestModal && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-sm animate-in fade-in duration-200">
                        <div className="bg-white rounded-xl shadow-2xl w-full max-w-xl overflow-hidden animate-in zoom-in-95 duration-200 border border-slate-100">
                            <div className="flex items-center justify-between px-6 py-5 border-b border-slate-100 bg-white">
                                <h3 className="text-xl font-bold text-slate-800 tracking-tight">Enter Upto 5 emails</h3>
                                <button onClick={() => setShowTestModal(false)} className="text-slate-400 hover:text-slate-600 transition-colors">
                                    <XCircle className="w-6 h-6" />
                                </button>
                            </div>
                            <div className="p-6 bg-white shrink-0">
                                <label className="block text-sm font-bold text-slate-700 mb-2">Email</label>
                                <input
                                    type="text"
                                    placeholder="Enter Email here..."
                                    value={testEmails}
                                    onChange={e => setTestEmails(e.target.value.substring(0, 256))}
                                    className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:outline-none focus:border-[#3b5998] focus:ring-1 focus:ring-[#3b5998] text-sm text-slate-800 placeholder:text-slate-400"
                                />
                                <div className="text-right text-xs text-slate-400 mt-2 font-medium">
                                    {testEmails.length}/256
                                </div>
                            </div>
                            <div className="px-6 py-5 flex items-center justify-end gap-3 bg-white border-t border-slate-100">
                                <button
                                    onClick={() => setShowTestModal(false)}
                                    className="px-6 py-2.5 rounded-lg font-bold text-slate-500 bg-white border border-slate-300 hover:bg-slate-50 hover:text-slate-700 transition-colors text-sm"
                                >
                                    Cancel
                                </button>

                                <button
                                    onClick={() => {
                                        // handle send logic
                                        setShowTestModal(false);
                                    }}
                                    className="px-6 py-2.5 rounded-lg font-bold text-white bg-indigo-600 hover:bg-indigo-700 shadow-md transition-colors text-sm"
                                >
                                    Send Email
                                </button>

                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}

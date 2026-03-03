import { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import { Loader2, CheckCircle2, XCircle, Send, UploadCloud, FileSpreadsheet } from 'lucide-react';
import Papa from 'papaparse';

interface DispatchModalProps {
    projectId: number;
    isOpen: boolean;
    onClose: () => void;
}

export default function DispatchModal({ projectId, isOpen, onClose }: DispatchModalProps) {
    const [csvData, setCsvData] = useState<any[]>([]);
    const [fileName, setFileName] = useState<string | null>(null);
    const [fileError, setFileError] = useState<string | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const [jobId, setJobId] = useState<number | null>(null);
    const [status, setStatus] = useState<'idle' | 'starting' | 'processing' | 'completed' | 'failed'>('idle');
    const [stats, setStats] = useState({
        total: 0,
        processed: 0,
        success: 0,
        failed: 0
    });

    useEffect(() => {
        if (isOpen && status !== 'processing' && status !== 'starting') {
            setJobId(null);
            setStatus('idle');
            setCsvData([]);
            setFileName(null);
            setFileError(null);
            setStats({ total: 0, processed: 0, success: 0, failed: 0 });
        }
    }, [isOpen]);

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
        setStatus('starting');
        try {
            const token = localStorage.getItem("token") || "mock_token";
            const res = await axios.post(`http://localhost:8000/api/projects/${projectId}/dispatch`, {
                csv_data: csvData
            }, {
                headers: { Authorization: `Bearer ${token}` }
            });
            setJobId(res.data.id);
            setStatus('processing');
        } catch (error: any) {
            console.error("Dispatch failed:", error);
            setStatus('failed');
            alert(error.response?.data?.detail || "Failed to start dispatch. Ensure your layout mapping is saved.");
        }
    };

    if (!isOpen) return null;

    const progressPercent = stats.total > 0 ? Math.round((stats.processed / stats.total) * 100) : 0;

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden animate-in zoom-in-95 duration-200">
                <div className="px-6 py-5 border-b border-slate-100 flex items-center justify-between bg-slate-50">
                    <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                        <Send className="w-5 h-5 text-indigo-500" />
                        Email Dispatch Engine
                    </h3>
                    {status !== 'processing' && status !== 'starting' && (
                        <button onClick={onClose} className="text-slate-400 hover:text-red-500 transition-colors">
                            <XCircle className="w-6 h-6" />
                        </button>
                    )}
                </div>

                <div className="p-6 space-y-6">
                    {status === 'idle' ? (
                        <div className="space-y-6">

                            {!csvData.length ? (
                                <div className="text-center space-y-4">
                                    <div className="w-16 h-16 bg-slate-50 rounded-full flex flex-col items-center justify-center mx-auto shadow-inner border border-slate-100">
                                        <FileSpreadsheet className="w-8 h-8 text-slate-400" />
                                    </div>
                                    <h4 className="text-xl font-bold text-slate-800">Assign Dataset</h4>
                                    <p className="text-slate-500 text-sm">Upload the dataset containing recipient Names and Emails to dispatch mapping.</p>

                                    <input
                                        type="file"
                                        accept=".csv"
                                        className="hidden"
                                        ref={fileInputRef}
                                        onChange={handleFileUpload}
                                    />
                                    <button
                                        onClick={() => fileInputRef.current?.click()}
                                        className="w-full py-3 bg-white border-2 border-dashed border-indigo-200 hover:border-indigo-400 hover:bg-indigo-50 text-indigo-600 font-bold rounded-xl transition-all flex items-center justify-center gap-2"
                                    >
                                        <UploadCloud className="w-5 h-5" />
                                        Upload CSV Sheet
                                    </button>
                                    {fileError && <p className="text-red-500 text-xs font-semibold">{fileError}</p>}
                                </div>
                            ) : (
                                <div className="text-center space-y-4">
                                    <div className="w-16 h-16 bg-indigo-50 rounded-full flex items-center justify-center mx-auto shadow-inner">
                                        <Send className="w-8 h-8 text-indigo-500" />
                                    </div>
                                    <h4 className="text-xl font-bold text-slate-800">Ready for Launch</h4>
                                    <div className="p-3 bg-slate-50 rounded-lg border border-slate-100">
                                        <p className="text-slate-500 text-sm">
                                            Dataset <span className="font-bold text-slate-700 truncate inline-block max-w-[150px] align-bottom">"{fileName}"</span> loaded.
                                        </p>
                                        <p className="font-semibold text-indigo-600 mt-1">{csvData.length} recipients parsed.</p>
                                    </div>

                                    <button
                                        onClick={handleDispatch}
                                        className="w-full py-3 px-4 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl shadow-lg shadow-indigo-200 transition-all flex justify-center items-center gap-2"
                                    >
                                        <Send className="w-4 h-4" />
                                        Initiate Dispatch Sequence
                                    </button>
                                </div>
                            )}
                        </div>
                    ) : (
                        <div className="space-y-6">
                            <div className="flex justify-between items-end mb-2">
                                <div>
                                    <p className="text-sm font-bold text-slate-500 uppercase tracking-widest">Progress</p>
                                    <h4 className="text-2xl font-black text-slate-800 tracking-tight">
                                        {Math.min(stats.processed, stats.total)} <span className="text-slate-400 text-lg font-medium">/ {stats.total}</span>
                                    </h4>
                                </div>
                                <div className="text-right">
                                    <span className="text-3xl font-bold text-indigo-600">{progressPercent}%</span>
                                </div>
                            </div>

                            {/* Progress Bar */}
                            <div className="w-full h-4 bg-slate-100 rounded-full overflow-hidden shrink-0">
                                <div
                                    className="h-full bg-indigo-500 rounded-full transition-all duration-300 ease-out"
                                    style={{ width: `${progressPercent}%` }}
                                />
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div className="bg-emerald-50 rounded-xl p-4 border border-emerald-100">
                                    <div className="flex items-center gap-2 text-emerald-600 font-semibold mb-1">
                                        <CheckCircle2 className="w-4 h-4" /> Delivered
                                    </div>
                                    <p className="text-2xl font-bold text-emerald-700">{stats.success}</p>
                                </div>
                                <div className="bg-red-50 rounded-xl p-4 border border-red-100">
                                    <div className="flex items-center gap-2 text-red-600 font-semibold mb-1">
                                        <XCircle className="w-4 h-4" /> Bounced / Failed
                                    </div>
                                    <p className="text-2xl font-bold text-red-700">{stats.failed}</p>
                                </div>
                            </div>

                            <div className="text-center pt-2">
                                {status === 'processing' || status === 'starting' ? (
                                    <div className="inline-flex items-center gap-2 text-indigo-600 font-medium px-4 py-2 bg-indigo-50 rounded-full">
                                        <Loader2 className="w-4 h-4 animate-spin" />
                                        Milling Certificates in Background...
                                    </div>
                                ) : status === 'completed' ? (
                                    <div className="inline-flex flex-col items-center gap-2 w-full">
                                        <div className="w-full flex items-center justify-center gap-2 text-emerald-600 font-bold px-4 py-3 bg-emerald-50 border border-emerald-200 rounded-xl">
                                            <CheckCircle2 className="w-5 h-5" />
                                            Dispatch Sequence Finished
                                        </div>
                                    </div>
                                ) : (
                                    <div className="text-red-500 font-bold bg-red-50 px-4 py-2 rounded-lg border border-red-100">Background Job Failed. Check Server Logs.</div>
                                )}
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}

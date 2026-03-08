import { useState, useEffect, useRef, useCallback } from 'react';
import axios from 'axios';
import { API_BASE_URL } from '../lib/api';
import {
    Loader2, CheckCircle2,
    XCircle, Send, UploadCloud, FileSpreadsheet, Edit3, ArrowLeft, Plus, Trash2
} from 'lucide-react';
import Papa from 'papaparse';
import ReactQuill, { Quill } from 'react-quill-new';
import 'react-quill-new/dist/quill.snow.css';
import { useParams, useNavigate } from 'react-router-dom';
import '../App.css';
import ColorPickerButton from '../components/ColorPickerButton';
import FontSizeController from '../components/FontSizeController';

// Register custom inline style size attributor so we can use arbitrary pixel sizes (8px - 100px)
const Size = Quill.import('attributors/style/size') as any;
Size.whitelist = Array.from({ length: 93 }, (_, i) => `${i + 8}px`);
Quill.register(Size, true);

const TOOLBAR_ID = 'credify-quill-toolbar';

const quillModules = {
    toolbar: {
        container: `#${TOOLBAR_ID}`,
    },
    history: {
        delay: 400,
        maxStack: 100,
        userOnly: true,
    },
};

const quillFormats = [
    'header', 'font', 'size',
    'bold', 'italic', 'underline', 'strike', 'code',
    'blockquote', 'code-block',
    'color', 'background',
    'align',
    'list', 'bullet', 'indent',
    'link', 'image', 'video',
    'script',
    'clean',
];

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
    const quillRef = useRef<ReactQuill>(null);

    const handleUndo = useCallback(() => {
        const editor = (quillRef.current as any)?.getEditor?.();
        editor?.history?.undo();
    }, []);

    const handleRedo = useCallback(() => {
        const editor = (quillRef.current as any)?.getEditor?.();
        editor?.history?.redo();
    }, []);

    // Strip Quill-generated native `title` attributes from toolbar after mount
    // Quill auto-adds `title` to its picker spans which causes the browser white tooltip
    useEffect(() => {
        const stripTitles = () => {
            const toolbar = document.getElementById(TOOLBAR_ID);
            if (!toolbar) return;
            // Strip all auto-generated title attrs and migrate to data-tooltip
            toolbar.querySelectorAll('[title]').forEach((el) => {
                const text = el.getAttribute('title');
                if (text && !el.getAttribute('data-tooltip')) {
                    el.setAttribute('data-tooltip', text);
                }
                el.removeAttribute('title');
            });
            // Color pickers get no auto-title from Quill — label them explicitly
            const colorLabel = toolbar.querySelector('.ql-color .ql-picker-label');
            if (colorLabel && !colorLabel.getAttribute('data-tooltip'))
                colorLabel.setAttribute('data-tooltip', 'Text Color');
            const bgLabel = toolbar.querySelector('.ql-background .ql-picker-label');
            if (bgLabel && !bgLabel.getAttribute('data-tooltip'))
                bgLabel.setAttribute('data-tooltip', 'Highlight Color');
        };
        // Run after Quill has fully rendered its picker UI
        const t = setTimeout(stripTitles, 300);
        return () => clearTimeout(t);
    }, []);

    // Compose State
    const [emailSubject, setEmailSubject] = useState("");
    const [emailBody, setEmailBody] = useState("");
    const [editorMode, setEditorMode] = useState<'lexical' | 'html'>('lexical');
    const [previewHtml, setPreviewHtml] = useState(false);
    const [showTestModal, setShowTestModal] = useState(false);
    const [testEmails, setTestEmails] = useState<string[]>([""]); // Array for multi-recipient support
    const [isTestingEmail, setIsTestingEmail] = useState(false);

    // Dispatching State
    const [jobId, setJobId] = useState<number | null>(null);
    const [status, setStatus] = useState<'idle' | 'starting' | 'processing' | 'completed' | 'failed'>('idle');
    const [stats, setStats] = useState({
        total: 0,
        processed: 0,
        success: 0,
        failed: 0
    });

    const handleSendTestEmail = async () => {
        const validEmails = testEmails.map(e => e.trim()).filter(e => e !== "");
        if (validEmails.length === 0) return alert("Please enter at least one email.");
        if (validEmails.length > 5) return alert("Maximum 5 test emails allowed.");

        setIsTestingEmail(true);
        try {
            const token = localStorage.getItem("token") || "mock_token";
            const sampleData = csvData.length > 0 ? csvData[0] : {};

            await axios.post(`${API_BASE_URL}/api/projects/${projectId}/test-email`, {
                emails: validEmails,
                subject: emailSubject,
                body: emailBody,
                sample_data: sampleData
            }, {
                headers: { Authorization: `Bearer ${token}` }
            });

            alert("Test email(s) sent successfully!");
            setShowTestModal(false);
            setTestEmails([""]); // Reset to initial state
        } catch (err: any) {
            console.error("Test email failed", err);
            alert(err.response?.data?.detail || "Failed to send test email.");
        } finally {
            setIsTestingEmail(false);
        }
    };

    const addTestEmailField = () => {
        if (testEmails.length < 5) {
            setTestEmails([...testEmails, ""]);
        }
    };

    const removeTestEmailField = (index: number) => {
        if (testEmails.length > 1) {
            const newEmails = [...testEmails];
            newEmails.splice(index, 1);
            setTestEmails(newEmails);
        }
    };

    const updateTestEmailField = (index: number, value: string) => {
        const newEmails = [...testEmails];
        newEmails[index] = value;
        setTestEmails(newEmails);
    };

    useEffect(() => {
        const fetchProject = async () => {
            if (!projectId) return;
            try {
                const token = localStorage.getItem("token") || "mock_token";
                // Optionally fetch project details if we need project name
                const res = await axios.get(`${API_BASE_URL}/api/projects/`, {
                    headers: { Authorization: `Bearer ${token}` }
                });
                const proj = res.data.find((p: any) => p.id === projectId);
                if (proj) {
                    setProjectName(proj.name || "Untitled Credential");
                }
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
                const res = await axios.get(`${API_BASE_URL}/api/projects/jobs/${jobId}`, {
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
            const res = await axios.post(`${API_BASE_URL}/api/projects/${projectId}/dispatch`, {
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
            // Try to extract the most descriptive error possible
            const errorDetail = error.response?.data?.detail;
            const axiosMessage = error.message;
            const fallbackMsg = "Connection failed. Please check if the backend is awake (Render free tier can sleep) and your internet is stable.";

            let finalMsg = errorDetail || axiosMessage || fallbackMsg;
            if (finalMsg.includes("502")) finalMsg = "Server is currently rebooting or overloaded (502 Gateway Error). Please wait 1 minute.";

            alert(finalMsg);
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
                                    <div className="flex flex-wrap gap-x-6 gap-y-3 text-sm">
                                        {csvData.length > 0 && Object.keys(csvData[0]).map((key) => (
                                            <span key={key} className="flex items-center gap-2 text-slate-700">
                                                <span className="w-1.5 h-1.5 rounded-full bg-indigo-400"></span>
                                                <code className="font-semibold bg-white px-1.5 py-0.5 rounded border border-slate-200 text-indigo-700">{"{"}{key}{"}"}</code>
                                                <span className="text-[10px] text-slate-400 hidden sm:inline">from CSV</span>
                                            </span>
                                        ))}
                                        {csvData.length === 0 && (
                                            <span className="flex items-center gap-2 text-slate-700"><span className="w-1.5 h-1.5 rounded-full bg-slate-800"></span> <code className="font-semibold bg-white px-1.5 py-0.5 rounded border border-slate-200 text-indigo-700">{"{name}"}</code> adds the Recipient Name</span>
                                        )}
                                        <span className="flex items-center gap-2 text-slate-700"><span className="w-1.5 h-1.5 rounded-full bg-slate-800"></span> <code className="font-semibold bg-white px-1.5 py-0.5 rounded border border-slate-200 text-indigo-700">{"{project_name}"}</code> adds the Initiative Name</span>
                                        <span className="flex items-center gap-2 text-slate-700"><span className="w-1.5 h-1.5 rounded-full bg-slate-800"></span> <code className="font-semibold bg-white px-1.5 py-0.5 rounded border border-slate-200 text-indigo-700">{"{credential_button}"}</code> embeds the Verification Link Button</span>
                                    </div>
                                </div>

                                <div className="space-y-0 relative">
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
                                    <div className="border border-slate-200 rounded-b-xl rounded-tr-xl bg-white relative shadow-sm" style={{ overflow: 'visible' }}>
                                        <div className="relative w-full h-[450px]">
                                            <div className={`absolute inset-0 transition-opacity duration-300 ${editorMode === 'lexical' ? 'opacity-100 z-10' : 'opacity-0 z-0 pointer-events-none'}`}>
                                                <div id={TOOLBAR_ID} className="ql-toolbar ql-snow" style={{ position: 'relative', zIndex: 50, overflow: 'visible' }}>
                                                    {/* Group 1: Undo / Redo */}
                                                    <span className="ql-formats" data-group="undo-redo">
                                                        <button className="ql-undo" data-tooltip="Undo (Ctrl+Z)" onClick={handleUndo}>
                                                            <svg viewBox="0 0 18 18"><polygon className="ql-fill ql-stroke" points="6 10 4 12 2 10 6 10" /><path className="ql-stroke" d="M8.09,13.91A4.6,4.6,0,0,0,9,14,5,5,0,1,0,4,9" /></svg>
                                                        </button>
                                                        <button className="ql-redo" data-tooltip="Redo (Ctrl+Y)" onClick={handleRedo}>
                                                            <svg viewBox="0 0 18 18"><polygon className="ql-fill ql-stroke" points="12 10 14 12 16 10 12 10" /><path className="ql-stroke" d="M9.91,13.91A4.6,4.6,0,0,1,9,14,5,5,0,1,1,14,9" /></svg>
                                                        </button>
                                                    </span>

                                                    {/* Group 2: Text Style (heading/list/blockquote/code-block) */}
                                                    <span className="ql-formats">
                                                        <select className="ql-header" data-tooltip="Text Style" defaultValue="">
                                                            <option value="">Normal</option>
                                                            <option value="1">Heading 1</option>
                                                            <option value="2">Heading 2</option>
                                                            <option value="3">Heading 3</option>
                                                            <option value="4">Heading 4</option>
                                                            <option value="5">Heading 5</option>
                                                            <option value="6">Heading 6</option>
                                                        </select>
                                                    </span>
                                                    <span className="ql-formats">
                                                        <button className="ql-list" value="bullet" data-tooltip="Bulleted List" />
                                                        <button className="ql-list" value="ordered" data-tooltip="Numbered List" />
                                                        <button className="ql-blockquote" data-tooltip="Quote" />
                                                        <button className="ql-code-block" data-tooltip="Code Block" />
                                                    </span>

                                                    {/* Group 3: Insert */}
                                                    <span className="ql-formats">
                                                        <button className="ql-link" data-tooltip="Insert Link" />
                                                        <button className="ql-image" data-tooltip="Insert Image" />
                                                        <button className="ql-video" data-tooltip="Insert YouTube / Video" />
                                                    </span>

                                                    {/* Group 4: Alignment — use buttons instead of select to avoid Quill picker title */}
                                                    <span className="ql-formats">
                                                        <button className="ql-align" value="" data-tooltip="Left Align" />
                                                        <button className="ql-align" value="center" data-tooltip="Center Align" />
                                                        <button className="ql-align" value="right" data-tooltip="Right Align" />
                                                        <button className="ql-align" value="justify" data-tooltip="Justify" />
                                                    </span>

                                                    {/* Group 5: Font Size */}
                                                    <span className="ql-formats">
                                                        <FontSizeController quillRef={quillRef} defaultSize={15} />
                                                    </span>

                                                    {/* Group 6: Text Formatting */}
                                                    <span className="ql-formats">
                                                        <button className="ql-bold" data-tooltip="Bold" />
                                                        <button className="ql-italic" data-tooltip="Italic" />
                                                        <button className="ql-underline" data-tooltip="Underline" />
                                                        <button className="ql-strike" data-tooltip="Strikethrough" />
                                                        <button className="ql-code" data-tooltip="Inline Code" />
                                                    </span>
                                                    <span className="ql-formats" style={{ borderRight: 'none' }}>
                                                        {/* Custom Text Color picker */}
                                                        <ColorPickerButton
                                                            format="color"
                                                            defaultColor="#000000"
                                                            label="Text Color"
                                                            quillRef={quillRef}
                                                            icon={
                                                                <svg viewBox="0 0 18 18" width="16" height="16">
                                                                    {/* Bold geometric A: two legs + crossbar */}
                                                                    <path
                                                                        d="M4 14 L9 3 L14 14"
                                                                        fill="none"
                                                                        stroke="currentColor"
                                                                        strokeWidth="2.5"
                                                                        strokeLinecap="round"
                                                                        strokeLinejoin="round"
                                                                    />
                                                                    <line
                                                                        x1="6.5" y1="10"
                                                                        x2="11.5" y2="10"
                                                                        stroke="currentColor"
                                                                        strokeWidth="2"
                                                                        strokeLinecap="round"
                                                                    />
                                                                </svg>
                                                            }
                                                        />
                                                        {/* Custom Highlight Color picker */}
                                                        <ColorPickerButton
                                                            format="background"
                                                            defaultColor="#FFFF00"
                                                            label="Highlight Color"
                                                            quillRef={quillRef}
                                                            icon={
                                                                <svg width="16" height="16" viewBox="0 0 24 24" version="1.1" xmlns="http://www.w3.org/2000/svg">

                                                                    <title>ic_fluent_highlight_24_regular</title>
                                                                    <desc>Created with Sketch.</desc>
                                                                    <g id="🔍-Product-Icons" stroke="none" stroke-width="1" fill="none" fill-rule="evenodd">
                                                                        <g id="ic_fluent_highlight_24_regular" fill="#212121" fill-rule="nonzero">
                                                                            <path d="M20.2585648,2.00438474 C20.6382605,2.00472706 20.9518016,2.28716326 21.0011348,2.65328337 L21.0078899,2.75506004 L21.0038407,7.25276883 C21.0009137,8.40908568 20.1270954,9.36072944 19.0029371,9.48671858 L19.0024932,11.7464847 C19.0024932,12.9373487 18.0773316,13.9121296 16.906542,13.9912939 L16.7524932,13.9964847 L16.501,13.9963847 L16.5017549,16.7881212 C16.5017549,17.6030744 16.0616895,18.349347 15.3600767,18.7462439 L15.2057929,18.8258433 L8.57108142,21.9321389 C8.10484975,22.1504232 7.57411944,21.8450614 7.50959937,21.3535767 L7.50306874,21.2528982 L7.503,13.9963847 L7.25,13.9964847 C6.05913601,13.9964847 5.08435508,13.0713231 5.00519081,11.9005335 L5,11.7464847 L5.00043957,9.4871861 C3.92882124,9.36893736 3.08392302,8.49812196 3.0058865,7.41488149 L3,7.25086975 L3,2.75438506 C3,2.3401715 3.33578644,2.00438474 3.75,2.00438474 C4.12969577,2.00438474 4.44349096,2.28653894 4.49315338,2.6526145 L4.5,2.75438506 L4.5,7.25086975 C4.5,7.63056552 4.78215388,7.94436071 5.14822944,7.99402313 L5.25,8.00086975 L18.7512697,8.00087075 C19.1315998,8.00025031 19.4461483,7.71759877 19.4967392,7.3518545 L19.5038434,7.25019537 L19.5078902,2.75371008 C19.508263,2.33949668 19.8443515,2.00401258 20.2585648,2.00438474 Z M15.001,13.9963847 L9.003,13.9963847 L9.00306874,20.0736262 L14.5697676,17.4673619 C14.8004131,17.3593763 14.9581692,17.1431606 14.9940044,16.89581 L15.0017549,16.7881212 L15.001,13.9963847 Z M17.502,9.50038474 L6.5,9.50038474 L6.5,11.7464847 C6.5,12.1261805 6.78215388,12.4399757 7.14822944,12.4896381 L7.25,12.4964847 L16.7524932,12.4964847 C17.1321889,12.4964847 17.4459841,12.2143308 17.4956465,11.8482552 L17.5024932,11.7464847 L17.502,9.50038474 Z" id="🎨-Color"></path>
                                                                        </g>
                                                                    </g>
                                                                </svg>
                                                            }
                                                        />
                                                    </span>
                                                    <span className="ql-formats">
                                                        <button className="ql-script" value="sub" data-tooltip="Subscript" />
                                                        <button className="ql-script" value="super" data-tooltip="Superscript" />
                                                    </span>
                                                    <span className="ql-formats">
                                                        <button className="ql-indent" value="-1" data-tooltip="Decrease Indent" />
                                                        <button className="ql-indent" value="+1" data-tooltip="Increase Indent" />
                                                    </span>

                                                    {/* Clear formatting + Clear All editor */}
                                                    <span className="ql-formats">
                                                        <button className="ql-clean" data-tooltip="Clear Formatting" />
                                                        <button
                                                            data-tooltip="Clear All Text"
                                                            onClick={() => setEmailBody('')}
                                                            style={{ width: 28, height: 28, display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'relative' }}
                                                        >
                                                            <svg viewBox="0 0 18 18" style={{ width: 16, height: 16 }}>
                                                                <polyline className="ql-stroke" points="3 3 15 15" />
                                                                <polyline className="ql-stroke" points="15 3 3 15" />
                                                            </svg>
                                                        </button>
                                                    </span>
                                                </div>
                                                <ReactQuill
                                                    ref={quillRef}
                                                    theme="snow"
                                                    value={emailBody}
                                                    onChange={setEmailBody}
                                                    modules={quillModules}
                                                    formats={quillFormats}
                                                    className="credify-quill h-[390px] border-none [&_.ql-toolbar]:hidden [&_.ql-container]:border-none [&_.ql-editor]:min-h-[340px] [&_.ql-editor]:text-slate-800 [&_.ql-editor]:leading-relaxed [&_.ql-editor]:text-[15px] [&_.ql-editor]:p-5"
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
                            <div className="max-w-3xl mx-auto py-8 text-center animate-in zoom-in-95 duration-500">
                                {/* Analytics Panel */}
                                {status !== 'idle' && (
                                    <div className="w-full bg-white/80 backdrop-blur-2xl border border-white/40 rounded-[2.5rem] shadow-[0_20px_60px_-15px_rgba(0,0,0,0.05)] p-12 flex flex-col justify-center text-center animate-in slide-in-from-right-8 duration-500 ring-1 ring-slate-900/5">
                                        <div className="space-y-1 mb-8">
                                            <h3 className="text-3xl font-black tracking-tight text-slate-800 mb-2">
                                                Live Dispatch Sequence
                                            </h3>
                                            <p className="text-slate-500 font-medium text-[15px]">
                                                Processing delivery for <span className="font-bold text-indigo-600 px-1 py-0.5 bg-indigo-50 rounded-md">{csvData.length} recipients</span>.
                                            </p>
                                        </div>

                                        {/* Progress Bar */}
                                        <div className="w-full mb-10 relative">
                                            <div className="flex justify-between text-xs font-bold text-slate-400 mb-3 px-1 uppercase tracking-wider">
                                                <span>Progress</span>
                                                <span>{Math.round(progressPercent)}%</span>
                                            </div>
                                            <div className="w-full h-4 bg-slate-100 rounded-full overflow-hidden shadow-inner ring-1 ring-inset ring-slate-200/50">
                                                <div
                                                    className="h-full bg-gradient-to-r from-indigo-500 via-purple-500 to-emerald-400 transition-all duration-700 ease-out relative"
                                                    style={{ width: `${progressPercent}%` }}
                                                >
                                                    <div className="absolute inset-0 bg-white/20 animate-[shimmer_2s_infinite] w-full" style={{ backgroundImage: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.4), transparent)' }} />
                                                </div>
                                            </div>
                                        </div>

                                        <div className="grid grid-cols-2 gap-5 text-left mb-10">
                                            <div className="bg-[#f2fdf7] rounded-3xl p-6 border border-[#dcfce3] shadow-sm transform transition-all duration-300 hover:scale-[1.03] hover:shadow-md relative overflow-hidden group">
                                                <div className="absolute top-0 right-0 p-4 opacity-0 group-hover:opacity-10 transition-opacity">
                                                    <CheckCircle2 className="w-24 h-24 text-[#059669]" />
                                                </div>
                                                <div className="flex items-center gap-2 mb-6 text-[#059669]">
                                                    <CheckCircle2 className="w-7 h-7 stroke-[2.5]" />
                                                    <div className="font-bold text-[15px] leading-tight tracking-tight">
                                                        Delivered<br />Successfully
                                                    </div>
                                                </div>
                                                <p className="text-[44px] font-black text-[#047857] leading-none tracking-tighter">{stats.success}</p>
                                            </div>
                                            <div className="bg-[#fff6f7] rounded-3xl p-6 border border-[#fce8eb] shadow-sm transform transition-all duration-300 hover:scale-[1.03] hover:shadow-md relative overflow-hidden group">
                                                <div className="absolute top-0 right-0 p-4 opacity-0 group-hover:opacity-10 transition-opacity">
                                                    <XCircle className="w-24 h-24 text-[#e11d48]" />
                                                </div>
                                                <div className="flex items-center gap-2 mb-6 text-[#e11d48]">
                                                    <XCircle className="w-7 h-7 stroke-[2.5]" />
                                                    <div className="font-bold text-[15px] leading-tight tracking-tight">
                                                        Blocks / Bounces
                                                    </div>
                                                </div>
                                                <p className="text-[44px] font-black text-[#be123c] leading-none tracking-tighter">{stats.failed}</p>
                                            </div>
                                        </div>

                                        <div className="pt-2">
                                            {status === 'processing' || status === 'starting' ? (
                                                <div className="inline-flex items-center gap-3 text-indigo-700 font-bold text-[15px] px-8 py-4 bg-indigo-50/80 border border-indigo-100 rounded-2xl animate-pulse shadow-sm w-full justify-center">
                                                    <Loader2 className="w-5 h-5 animate-spin text-indigo-500" />
                                                    Milling Pipeline Engine...
                                                </div>
                                            ) : status === 'completed' ? (
                                                <div className="flex flex-col items-center gap-4 w-full animate-in fade-in slide-in-from-bottom-2 duration-500">
                                                    <div className="w-full flex items-center justify-center gap-3 text-emerald-700 font-black text-lg px-8 py-5 bg-[#f0fdf4] border border-[#bbf7d0] rounded-2xl shadow-sm">
                                                        <CheckCircle2 className="w-6 h-6" />
                                                        Dispatch Sequence Finished!
                                                    </div>
                                                    <button onClick={() => navigate('/dashboard')} className="w-full px-6 py-4 text-slate-500 font-bold hover:text-slate-800 bg-slate-50 hover:bg-slate-100 rounded-2xl transition-all border border-slate-200">
                                                        Return to Dashboard
                                                    </button>
                                                </div>
                                            ) : (
                                                <div className="text-rose-600 font-bold bg-[#fff1f2] px-8 py-5 rounded-2xl border border-[#fecdd3] flex flex-col items-center gap-3 shadow-sm">
                                                    <XCircle className="w-8 h-8" />
                                                    <p>Background Job Failed. Check Server Logs.</p>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                )}
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
                            <div className="p-6 bg-white space-y-4 max-h-[400px] overflow-y-auto">
                                {testEmails.map((email, index) => (
                                    <div key={index} className="space-y-1">
                                        <div className="flex items-center justify-between">
                                            <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider">Recipient {index + 1}</label>
                                            {testEmails.length > 1 && (
                                                <button
                                                    onClick={() => removeTestEmailField(index)}
                                                    className="text-slate-400 hover:text-red-500 transition-colors p-1"
                                                >
                                                    <Trash2 size={14} />
                                                </button>
                                            )}
                                        </div>
                                        <input
                                            type="email"
                                            placeholder="e.g. name@company.com"
                                            value={email}
                                            onChange={e => updateTestEmailField(index, e.target.value)}
                                            className="w-full px-4 py-3 border border-slate-200 rounded-xl focus:outline-none focus:border-indigo-500 focus:ring-4 focus:ring-indigo-50/50 text-sm text-slate-800 transition-all"
                                        />
                                    </div>
                                ))}

                                {testEmails.length < 5 && (
                                    <button
                                        onClick={addTestEmailField}
                                        className="w-full py-3 border-2 border-dashed border-slate-200 rounded-xl text-slate-400 font-bold text-sm hover:border-indigo-200 hover:text-indigo-500 hover:bg-indigo-50/30 transition-all flex items-center justify-center gap-2"
                                    >
                                        <Plus size={16} />
                                        Add Recipient
                                    </button>
                                )}
                            </div>
                            <div className="px-6 py-5 flex items-center justify-end gap-3 bg-white border-t border-slate-100">
                                <button
                                    onClick={() => setShowTestModal(false)}
                                    className="px-6 py-2.5 rounded-lg font-bold text-slate-500 bg-white border border-slate-300 hover:bg-slate-50 hover:text-slate-700 transition-colors text-sm"
                                >
                                    Cancel
                                </button>

                                <button
                                    disabled={isTestingEmail}
                                    onClick={handleSendTestEmail}
                                    className={`px-6 py-2.5 rounded-lg font-bold text-white bg-indigo-600 hover:bg-indigo-700 shadow-md transition-colors text-sm flex items-center gap-2 ${isTestingEmail ? 'opacity-70 cursor-wait' : ''}`}
                                >
                                    {isTestingEmail ? (
                                        <>
                                            <Loader2 className="w-4 h-4 animate-spin" />
                                            Sending...
                                        </>
                                    ) : (
                                        'Send Email'
                                    )}
                                </button>

                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}

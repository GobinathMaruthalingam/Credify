import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import axios from 'axios';
import { BadgeCheck, XCircle, Loader2, Calendar, User, FileImage, ShieldCheck } from 'lucide-react';

interface Certificate {
    id: string;
    project_id: number;
    recipient_email: string;
    recipient_name: string;
    image_url: string | null;
    issued_at: string;
    is_revoked: boolean;
}

export default function VerificationPage() {
    const { id } = useParams<{ id: string }>();
    const [cert, setCert] = useState<Certificate | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        const fetchCertificate = async () => {
            try {
                const res = await axios.get(`http://localhost:8000/api/verify/${id}`);
                setCert(res.data);
            } catch (err: any) {
                setError(err.response?.data?.detail || "Unable to verify this credential. It may be invalid or expired.");
            } finally {
                setLoading(false);
            }
        };
        fetchCertificate();
    }, [id]);

    if (loading) {
        return (
            <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6">
                <div className="flex flex-col items-center gap-4 text-slate-400">
                    <Loader2 className="w-12 h-12 animate-spin text-indigo-500" />
                    <p className="font-medium animate-pulse text-lg">Cryptographically Verifying Credential...</p>
                </div>
            </div>
        );
    }

    if (error || !cert) {
        return (
            <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6">
                <div className="max-w-md w-full bg-white rounded-3xl p-8 shadow-2xl shadow-red-500/10 border border-red-100 text-center space-y-6">
                    <div className="w-20 h-20 bg-red-50 rounded-full flex items-center justify-center mx-auto mb-4">
                        <XCircle className="w-10 h-10 text-red-500" />
                    </div>
                    <h1 className="text-2xl font-bold tracking-tight text-slate-900">Verification Failed</h1>
                    <p className="text-slate-600 leading-relaxed">{error}</p>
                    <div className="pt-6">
                        <Link to="/" className="text-indigo-600 font-semibold hover:text-indigo-700 transition-colors">
                            Return to Credify Home
                        </Link>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-slate-100 py-12 px-4 sm:px-6 lg:px-8">
            <div className="max-w-4xl mx-auto space-y-8">

                {/* Header Banner */}
                <div className="text-center space-y-4 mb-12">
                    <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-700 font-medium text-sm mb-4">
                        <ShieldCheck className="w-4 h-4" />
                        Blockchain-Grade Validation Passed
                    </div>
                    <h1 className="text-4xl font-extrabold tracking-tight text-slate-900 flex items-center justify-center gap-3">
                        Authentic Credential
                        <BadgeCheck className="w-10 h-10 text-emerald-500 shrink-0" />
                    </h1>
                    <p className="text-lg text-slate-500 max-w-2xl mx-auto">
                        This digital certificate has been cryptographically verified and tracked by the Credify trust protocol.
                    </p>
                </div>

                {/* Main Card */}
                <div className="bg-white rounded-[2rem] shadow-xl shadow-slate-200/50 overflow-hidden border border-slate-100">
                    <div className="grid md:grid-cols-2 gap-0">
                        {/* Details Sidebar */}
                        <div className="p-10 lg:p-12 space-y-10 border-r border-slate-100 bg-slate-50/50">
                            <div>
                                <p className="text-sm font-bold text-indigo-500 tracking-widest uppercase mb-1">Recipient</p>
                                <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 rounded-full bg-indigo-100 flex items-center justify-center flex-shrink-0">
                                        <User className="w-5 h-5 text-indigo-600" />
                                    </div>
                                    <p className="text-xl font-bold text-slate-900 truncate">{cert.recipient_name || 'Anonymous'}</p>
                                </div>
                            </div>

                            <div>
                                <p className="text-sm font-bold text-indigo-500 tracking-widest uppercase mb-1">Issue Date</p>
                                <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 rounded-full bg-indigo-100 flex items-center justify-center flex-shrink-0">
                                        <Calendar className="w-5 h-5 text-indigo-600" />
                                    </div>
                                    <p className="text-xl font-semibold text-slate-800">
                                        {new Date(cert.issued_at).toLocaleDateString(undefined, {
                                            year: 'numeric', month: 'long', day: 'numeric'
                                        })}
                                    </p>
                                </div>
                            </div>

                            <div>
                                <p className="text-sm font-bold text-indigo-500 tracking-widest uppercase mb-1">Document UUID</p>
                                <p className="font-mono text-sm tracking-tight text-slate-500 bg-white p-3 rounded-xl border border-slate-200">
                                    {cert.id}
                                </p>
                            </div>
                        </div>

                        {/* Image Preview Area */}
                        <div className="p-10 lg:p-12 flex flex-col justify-center items-center bg-white min-h-[400px]">
                            {cert.image_url ? (
                                <img
                                    src={cert.image_url}
                                    alt="Certificate"
                                    className="w-full h-auto rounded-xl shadow-lg border border-slate-200 object-contain"
                                />
                            ) : (
                                <div className="text-center space-y-4">
                                    <FileImage className="w-20 h-20 text-slate-200 mx-auto" />
                                    <p className="text-slate-400 font-medium">Digital Preview Unavailable</p>
                                    <p className="text-xs text-slate-300">The raw composite file is pending generation or storage mapping.</p>
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                <div className="text-center pt-8">
                    <p className="text-slate-400 text-sm font-medium">
                        Secured by <span className="text-indigo-500 font-bold tracking-tight">Credify.</span>
                    </p>
                </div>
            </div>
        </div>
    );
}

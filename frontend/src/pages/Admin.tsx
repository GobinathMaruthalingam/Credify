import { Users, CreditCard, Activity, ArrowUpRight, CheckCircle2, MoreVertical, Search, Download } from 'lucide-react';
import { Link } from 'react-router-dom';

export default function Admin() {
    // Mock data for the MVP admin dashboard
    const metrics = [
        { label: 'Total MRR', value: '$4,250', change: '+12.5%', isUp: true },
        { label: 'Active Subscribers', value: '142', change: '+18.2%', isUp: true },
        { label: 'Certificates Generated', value: '18,495', change: '+24.5%', isUp: true },
        { label: 'API Health', value: '99.9%', change: 'Stable', isUp: true },
    ];

    const recentUsers = [
        { id: 1, name: 'Alice Cooper', email: 'alice@acmecorp.com', plan: 'Pro', status: 'Active', date: '2 hours ago' },
        { id: 2, name: 'Google Certs', email: 'admin@googledev.com', plan: 'Enterprise', status: 'Active', date: '5 hours ago' },
        { id: 3, name: 'Startup Inc', email: 'hello@startup.io', plan: 'Free', status: 'Inactive', date: '1 day ago' },
        { id: 4, name: 'Jane Doe', email: 'jane.doe@university.edu', plan: 'Pro', status: 'Active', date: '2 days ago' },
    ];

    return (
        <div className="min-h-screen bg-slate-50 flex flex-col">
            {/* Top Navbar */}
            <nav className="bg-white border-b border-slate-200 sticky top-0 z-10">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="flex justify-between h-16">
                        <div className="flex items-center gap-2">
                            <div className="w-8 h-8 bg-indigo-600 rounded-lg flex items-center justify-center">
                                <ShieldCheckIcon className="w-5 h-5 text-white" />
                            </div>
                            <span className="text-xl font-bold bg-gradient-to-r from-indigo-700 to-indigo-500 bg-clip-text text-transparent">
                                Credify Admin
                            </span>
                        </div>
                        <div className="flex items-center gap-4">
                            <div className="relative">
                                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                                <input
                                    type="text"
                                    placeholder="Search users or projects..."
                                    className="pl-9 pr-4 py-2 bg-slate-100 border-none rounded-full text-sm focus:ring-2 focus:ring-indigo-500 w-64"
                                />
                            </div>
                            <Link to="/dashboard" className="text-sm font-medium text-slate-500 hover:text-indigo-600 transition-colors">
                                Back to App
                            </Link>
                            <div className="w-8 h-8 rounded-full bg-slate-800 flex items-center justify-center text-white text-sm font-bold shadow-sm">
                                A
                            </div>
                        </div>
                    </div>
                </div>
            </nav>

            {/* Main Content */}
            <main className="flex-1 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 w-full">

                {/* Header */}
                <div className="flex items-center justify-between mb-8">
                    <div>
                        <h1 className="text-2xl font-bold text-slate-900">Platform Overview</h1>
                        <p className="text-sm text-slate-500 mt-1">Monitor user activity, revenue, and system health.</p>
                    </div>
                    <button className="flex items-center gap-2 px-4 py-2 bg-white border border-slate-200 text-slate-700 rounded-lg hover:bg-slate-50 shadow-sm text-sm font-medium transition-all">
                        <Download className="w-4 h-4" />
                        Export Monthly Report
                    </button>
                </div>

                {/* Metrics Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
                    {metrics.map((metric, i) => (
                        <div key={i} className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm hover:shadow-md transition-shadow">
                            <div className="flex justify-between items-start">
                                <p className="text-sm font-medium text-slate-500">{metric.label}</p>
                                <div className="p-2 bg-indigo-50 rounded-lg text-indigo-600">
                                    {i === 0 ? <CreditCard size={18} /> : i === 1 ? <Users size={18} /> : i === 2 ? <ArrowUpRight size={18} /> : <Activity size={18} />}
                                </div>
                            </div>
                            <div className="mt-4 flex items-baseline gap-2">
                                <h3 className="text-2xl font-bold text-slate-900">{metric.value}</h3>
                                <span className={`text-xs font-semibold ${metric.isUp ? 'text-emerald-600' : 'text-red-600'}`}>
                                    {metric.change}
                                </span>
                            </div>
                        </div>
                    ))}
                </div>

                {/* Users Table */}
                <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
                    <div className="px-6 py-5 border-b border-slate-200 flex items-center justify-between bg-slate-50/50">
                        <h2 className="text-lg font-bold text-slate-900">Recent Registrations</h2>
                        <button className="text-sm text-indigo-600 font-medium hover:text-indigo-700">View all users</button>
                    </div>
                    <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse">
                            <thead>
                                <tr className="bg-white border-b border-slate-100 text-xs uppercase tracking-wider text-slate-500">
                                    <th className="px-6 py-4 font-medium">User</th>
                                    <th className="px-6 py-4 font-medium">Plan</th>
                                    <th className="px-6 py-4 font-medium">Status</th>
                                    <th className="px-6 py-4 font-medium">Joined</th>
                                    <th className="px-6 py-4 font-medium text-right">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                                {recentUsers.map((user) => (
                                    <tr key={user.id} className="hover:bg-slate-50/80 transition-colors">
                                        <td className="px-6 py-4">
                                            <div className="flex items-center gap-3">
                                                <div className="w-8 h-8 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-700 font-bold text-xs uppercase">
                                                    {user.name.charAt(0)}
                                                </div>
                                                <div>
                                                    <p className="font-semibold text-slate-900 text-sm">{user.name}</p>
                                                    <p className="text-xs text-slate-500">{user.email}</p>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold ${user.plan === 'Enterprise' ? 'bg-purple-100 text-purple-800' :
                                                user.plan === 'Pro' ? 'bg-indigo-100 text-indigo-800' :
                                                    'bg-slate-100 text-slate-800'
                                                }`}>
                                                {user.plan}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="flex items-center gap-1.5">
                                                <CheckCircle2 className={`w-4 h-4 ${user.status === 'Active' ? 'text-emerald-500' : 'text-slate-300'}`} />
                                                <span className={`text-sm font-medium ${user.status === 'Active' ? 'text-slate-700' : 'text-slate-500'}`}>
                                                    {user.status}
                                                </span>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 text-sm text-slate-500">{user.date}</td>
                                        <td className="px-6 py-4 text-right">
                                            <button className="p-2 text-slate-400 hover:text-slate-700 rounded-lg hover:bg-slate-100 transition-colors">
                                                <MoreVertical className="w-4 h-4" />
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            </main>
        </div>
    );
}

// Inline fallback icon to prevent import errors if not strictly in lucide set
function ShieldCheckIcon(props: React.SVGProps<SVGSVGElement>) {
    return (
        <svg
            {...props}
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
        >
            <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10" />
            <path d="m9 12 2 2 4-4" />
        </svg>
    );
}

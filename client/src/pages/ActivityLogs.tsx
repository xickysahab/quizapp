import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../services/api';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';
import { ArrowLeft, Server, FileText, Settings, Trash2, Edit2, Play, Search } from 'lucide-react';
import { format } from 'date-fns';

interface Log {
  id: string;
  action: string;
  resource: string;
  resourceId: string;
  details: any;
  createdAt: string;
  user: {
    name: string;
    email: string;
    role: string;
  };
}

const ActivityLogs: React.FC = () => {
  const navigate = useNavigate();
  const [logs, setLogs] = useState<Log[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  useEffect(() => {
    fetchLogs();
  }, []);

  const fetchLogs = async () => {
    try {
      const response = await api.get('/logs');
      setLogs(response.data.logs);
    } catch (error: any) {
      console.error('Failed to fetch logs', error);
      if (error.response?.status === 403) {
        navigate('/host/dashboard'); // Fallback if non-admin tries to access directly
      }
    } finally {
      setLoading(false);
    }
  };

  const getActionIcon = (action: string) => {
    if (action.includes('CREATE') || action.includes('ADD')) return <Play className="w-4 h-4 text-emerald-500" />;
    if (action.includes('DELETE') || action.includes('CLEAR')) return <Trash2 className="w-4 h-4 text-red-500" />;
    if (action.includes('UPDATE') || action.includes('EDIT')) return <Edit2 className="w-4 h-4 text-blue-500" />;
    return <Server className="w-4 h-4 text-slate-500" />;
  };

  const getActionBadge = (action: string) => {
    const baseClasses = "px-2.5 py-1 text-xs font-semibold rounded-full";
    if (action.includes('CREATE') || action.includes('ADD')) return `${baseClasses} bg-emerald-100 text-emerald-700`;
    if (action.includes('DELETE') || action.includes('CLEAR')) return `${baseClasses} bg-red-100 text-red-700`;
    if (action.includes('UPDATE') || action.includes('EDIT')) return `${baseClasses} bg-blue-100 text-blue-700`;
    return `${baseClasses} bg-slate-100 text-slate-700`;
  };

  const filteredLogs = logs.filter(log => 
    log.action.toLowerCase().includes(search.toLowerCase()) || 
    log.user.name.toLowerCase().includes(search.toLowerCase()) ||
    (log.details?.title && log.details.title.toLowerCase().includes(search.toLowerCase())) ||
    (log.details?.text && log.details.text.toLowerCase().includes(search.toLowerCase()))
  );

  return (
    <div className="min-h-screen bg-[#F8FAFC] flex flex-col font-sans">
      <Navbar />
      
      <main className="flex-grow container mx-auto px-4 pt-32 pb-12 md:pb-24 max-w-6xl">
        <div className="flex items-center gap-4 mb-8">
          <button
            onClick={() => navigate('/host/dashboard')}
            className="p-2.5 bg-white border border-[#E2E8F0] text-[#64748B] hover:text-[#0F172A] hover:bg-[#F1F5F9] rounded-xl transition-all shadow-sm"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <h1 className="text-3xl font-bold text-[#0F172A] flex items-center gap-3">
              <FileText className="w-8 h-8 text-[#3B82F6]" />
              Audit Logs
            </h1>
            <p className="text-sm text-[#64748B] mt-1">Track platform activities and administrative actions</p>
          </div>
        </div>

        <div className="bg-white rounded-2xl shadow-sm border border-[#E2E8F0] overflow-hidden">
          {/* Search Header */}
          <div className="p-4 border-b border-[#E2E8F0] bg-slate-50 flex items-center justify-between">
            <div className="relative max-w-md w-full">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#94A3B8]" />
              <input 
                type="text" 
                placeholder="Search by action, user, or details..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-[#E2E8F0] rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#3B82F6] focus:border-transparent transition-all bg-white"
              />
            </div>
            <div className="text-sm text-slate-500 font-medium">
              Total records: {filteredLogs.length}
            </div>
          </div>

          {/* Table */}
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm text-[#475569]">
              <thead className="text-xs uppercase bg-[#F1F5F9] text-[#64748B] font-semibold border-b border-[#E2E8F0]">
                <tr>
                  <th className="px-6 py-4">Timestamp</th>
                  <th className="px-6 py-4">User</th>
                  <th className="px-6 py-4">Action</th>
                  <th className="px-6 py-4">Resource</th>
                  <th className="px-6 py-4">Details</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan={5} className="text-center py-12">
                      <div className="flex flex-col items-center gap-3 text-slate-400">
                        <Settings className="w-8 h-8 animate-spin" />
                        <span>Loading logs...</span>
                      </div>
                    </td>
                  </tr>
                ) : filteredLogs.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="text-center py-12 text-slate-500 bg-white">
                      No logs found.
                    </td>
                  </tr>
                ) : (
                  filteredLogs.map((log) => (
                    <tr key={log.id} className="border-b border-[#F1F5F9] hover:bg-[#F8FAFC] transition-colors">
                      <td className="px-6 py-4 font-mono text-xs whitespace-nowrap">
                        {format(new Date(log.createdAt), 'MMM dd, yyyy HH:mm:ss')}
                      </td>
                      <td className="px-6 py-4">
                        <div className="font-medium text-[#0F172A]">{log.user.name}</div>
                        <div className="text-xs text-slate-500">{log.user.email}</div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2">
                          {getActionIcon(log.action)}
                          <span className={getActionBadge(log.action)}>{log.action}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4 font-medium text-slate-700">
                        {log.resource}
                      </td>
                      <td className="px-6 py-4">
                        <pre className="text-xs bg-slate-50 p-2 rounded-lg border border-slate-100 overflow-x-auto max-w-xs text-slate-600">
                          {log.details ? JSON.stringify(log.details, null, 2) : 'No details'}
                        </pre>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
};

export default ActivityLogs;

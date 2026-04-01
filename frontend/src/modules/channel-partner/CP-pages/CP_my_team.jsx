import React from 'react';
import { useNavigate } from 'react-router-dom';
import {
    ArrowLeft, Phone, Mail, MessageCircle,
    MapPin, Clock, Shield, Star,
    CheckCircle, Users, ExternalLink
} from 'lucide-react';
import CP_navbar from '../CP-components/CP_navbar';

// --- Mock Data ---
const SALES_LEAD = {
    id: 'sl1',
    name: 'Rahul Sharma',
    role: 'Senior Sales Lead',
    image: null, // Initials fallback
    initials: 'RS',
    status: 'online',
    phone: '+91 98765 43210',
    email: 'rahul.s@appzeto.com',
    whatsapp: '+919876543210',
    isVerified: true
};

const TEAM_MEMBERS = [
    {
        id: 'tm1',
        name: 'Priya Verma',
        role: 'Enterprise Specialist',
        initials: 'PV',
        specialty: 'Handles Enterprise Projects',
        status: 'offline',
        phone: '+91 98765 11111'
    },
    {
        id: 'tm2',
        name: 'Amit Kumar',
        role: 'Technical Consultant',
        initials: 'AK',
        specialty: 'Technical Feasibility',
        status: 'online',
        phone: '+91 98765 22222'
    }
];

const CP_my_team = () => {
    const navigate = useNavigate();

    return (
        <div className="min-h-screen bg-[#F9F9F9] pb-20 font-sans text-[#1E1E1E]">
            <CP_navbar />

            {/* Sticky Header */}
            <div className="sticky top-0 z-30 bg-white/80 backdrop-blur-md border-b border-gray-100 shadow-sm">
                <div className="max-w-xl mx-auto px-4 py-3 pt-14 md:pt-4 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <button onClick={() => navigate(-1)} className="p-2 rounded-full hover:bg-gray-100 text-gray-600 transition-colors">
                            <ArrowLeft className="w-5 h-5" />
                        </button>
                        <div>
                            <h1 className="text-lg font-bold text-gray-900 leading-tight">My Sales Team</h1>
                        </div>
                    </div>
                    <div className="relative group">
                        <button className="p-2 rounded-full hover:bg-gray-100 text-gray-500 transition-colors">
                            <Shield className="w-5 h-5" />
                        </button>
                        <div className="absolute right-0 top-full mt-2 w-64 bg-white p-3 rounded-xl shadow-xl border border-gray-100 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all z-50 text-xs text-gray-600">
                            These are verified Appzeto employees assigned to support your growth.
                        </div>
                    </div>
                </div>
            </div>

            <main className="max-w-xl mx-auto px-4 py-6 space-y-8">

                {/* 1. Primary Sales Lead (Hero) */}
                <section>
                    <div className="flex items-center justify-between mb-3 px-1">
                        <h2 className="text-xs font-bold text-gray-500 uppercase tracking-wider flex items-center gap-1">
                            <Star className="w-3 h-3 text-amber-500 fill-amber-500" /> Primary Point of Contact
                        </h2>
                        <span className={`flex items-center gap-1.5 text-[10px] font-bold px-2 py-0.5 rounded-full ${SALES_LEAD.status === 'online' ? 'bg-emerald-50 text-emerald-600' : 'bg-gray-100 text-gray-500'
                            }`}>
                            <span className={`w-1.5 h-1.5 rounded-full ${SALES_LEAD.status === 'online' ? 'bg-emerald-500' : 'bg-gray-400'}`}></span>
                            {SALES_LEAD.status === 'online' ? 'Available Now' : 'Offline'}
                        </span>
                    </div>

                    <div className="bg-white rounded-[24px] p-6 shadow-sm border border-gray-100 relative overflow-hidden">
                        {/* Decoration */}
                        <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-50 rounded-full blur-3xl -mr-16 -mt-16 pointer-events-none"></div>

                        <div className="relative flex flex-col items-center text-center">
                            <div className="relative mb-4">
                                <div className="w-20 h-20 bg-indigo-100 rounded-full flex items-center justify-center text-indigo-600 text-2xl font-bold shadow-inner">
                                    {SALES_LEAD.initials}
                                </div>
                                {SALES_LEAD.isVerified && (
                                    <div className="absolute bottom-0 right-0 bg-blue-500 text-white p-1 rounded-full border-2 border-white" title="Verified Staff">
                                        <CheckCircle className="w-3.5 h-3.5" />
                                    </div>
                                )}
                            </div>

                            <h3 className="text-xl font-bold text-gray-900 mb-1">{SALES_LEAD.name}</h3>
                            <p className="text-sm text-gray-500 font-medium mb-6">{SALES_LEAD.role}</p>

                            <div className="grid grid-cols-3 gap-3 w-full">
                                <a href={`tel:${SALES_LEAD.phone}`} className="flex flex-col items-center justify-center gap-2 p-3 bg-emerald-50 text-emerald-700 rounded-2xl hover:bg-emerald-100 transition-colors group">
                                    <div className="w-10 h-10 bg-white rounded-full flex items-center justify-center shadow-sm group-hover:scale-110 transition-transform">
                                        <Phone className="w-5 h-5 fill-emerald-100" />
                                    </div>
                                    <span className="text-xs font-bold">Call</span>
                                </a>
                                <a href={`https://wa.me/${SALES_LEAD.whatsapp}`} target="_blank" rel="noopener noreferrer" className="flex flex-col items-center justify-center gap-2 p-3 bg-green-50 text-green-700 rounded-2xl hover:bg-green-100 transition-colors group">
                                    <div className="w-10 h-10 bg-white rounded-full flex items-center justify-center shadow-sm group-hover:scale-110 transition-transform">
                                        <MessageCircle className="w-5 h-5 fill-green-100" />
                                    </div>
                                    <span className="text-xs font-bold">WhatsApp</span>
                                </a>
                                <a href={`mailto:${SALES_LEAD.email}`} className="flex flex-col items-center justify-center gap-2 p-3 bg-blue-50 text-blue-700 rounded-2xl hover:bg-blue-100 transition-colors group">
                                    <div className="w-10 h-10 bg-white rounded-full flex items-center justify-center shadow-sm group-hover:scale-110 transition-transform">
                                        <Mail className="w-5 h-5 fill-blue-100" />
                                    </div>
                                    <span className="text-xs font-bold">Email</span>
                                </a>
                            </div>
                        </div>
                    </div>
                </section>

                {/* 2. Secondary Members */}
                {TEAM_MEMBERS.length > 0 && (
                    <section>
                        <div className="flex items-center justify-between mb-3 px-1">
                            <h2 className="text-xs font-bold text-gray-500 uppercase tracking-wider flex items-center gap-1">
                                <Users className="w-3 h-3" /> Extended Team
                            </h2>
                        </div>

                        <div className="grid gap-3">
                            {TEAM_MEMBERS.map(member => (
                                <div key={member.id} className="bg-white p-6 rounded-[24px] border border-gray-100 shadow-sm flex items-center justify-between">
                                    <div className="flex items-center gap-4">
                                        <div className="w-12 h-12 bg-gray-50 rounded-full flex items-center justify-center text-gray-500 font-bold text-sm">
                                            {member.initials}
                                        </div>
                                        <div>
                                            <h4 className="font-bold text-gray-900 text-sm">{member.name}</h4>
                                            <p className="text-xs text-gray-500 mb-1">{member.role}</p>
                                            <span className="inline-block px-2 py-0.5 bg-indigo-50 text-indigo-600 rounded text-[10px] font-bold">
                                                {member.specialty}
                                            </span>
                                        </div>
                                    </div>
                                    <a href={`tel:${member.phone}`} className="p-2.5 bg-gray-50 text-gray-600 rounded-xl hover:bg-gray-100 transition-colors">
                                        <Phone className="w-4 h-4" />
                                    </a>
                                </div>
                            ))}
                        </div>
                    </section>
                )}

                {/* 3. Guidelines */}
                <section className="bg-white rounded-[24px] p-6 border border-gray-100 shadow-sm">
                    <h3 className="font-bold text-gray-900 text-sm mb-3 flex items-center gap-2">
                        <Clock className="w-4 h-4 text-gray-500" /> Communication Guidelines
                    </h3>
                    <div className="space-y-3 text-xs text-gray-600">
                        <div className="flex gap-3">
                            <div className="w-1.5 h-1.5 bg-gray-400 rounded-full mt-1.5 shrink-0"></div>
                            <p>Standard support hours: <span className="font-bold text-gray-800">Mon-Sat, 10 AM - 7 PM</span>.</p>
                        </div>
                        <div className="flex gap-3">
                            <div className="w-1.5 h-1.5 bg-gray-400 rounded-full mt-1.5 shrink-0"></div>
                            <p>For urgent deal closures, use <span className="font-bold text-gray-800">WhatsApp</span> for faster response.</p>
                        </div>
                        <div className="flex gap-3">
                            <div className="w-1.5 h-1.5 bg-gray-400 rounded-full mt-1.5 shrink-0"></div>
                            <p>Please tag "Hot Lead" in CRM before calling for specific client discussions.</p>
                        </div>
                    </div>
                </section>

            </main>
        </div>
    );
};

export default CP_my_team;

import React from 'react';
import { useParams } from 'react-router-dom';
import { CheckCircle, Phone, Mail, Globe, ShieldCheck } from 'lucide-react';

const CP_public_profile = () => {
    // In a real app, use the ID to fetch data
    const { id } = useParams();

    // Mock Data (simulating fetched public data)
    const PROFILE = {
        name: 'Ankit Ahirwar',
        id: id || 'CP-2024-X92',
        role: 'Verified Channel Partner',
        initials: 'AA',
        joined: 'Dec 2023',
        contact: {
            phone: '+91 98765 00000',
            email: 'ankit.partner@appzeto.com',
            website: 'www.appzeto.com'
        }
    };

    return (
        <div className="min-h-screen bg-gray-50 flex flex-col font-sans">

            {/* Brand Header */}
            <div className="bg-white border-b border-gray-100 py-4 text-center">
                <h1 className="text-xl font-bold bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent">
                    Appzeto
                </h1>
                <p className="text-[10px] text-gray-500 uppercase tracking-widest">Official Partner Verification</p>
            </div>

            <div className="flex-1 p-6 flex flex-col items-center max-w-md mx-auto w-full">

                {/* Verification Card */}
                <div className="w-full bg-white rounded-3xl shadow-xl overflow-hidden mb-8 border border-gray-200">
                    <div className="h-24 bg-gradient-to-r from-indigo-500 to-purple-600 relative">
                        <div className="absolute -bottom-10 left-1/2 -translate-x-1/2">
                            <div className="w-20 h-20 bg-white rounded-full p-1.5 shadow-md">
                                <div className="w-full h-full bg-indigo-50 rounded-full flex items-center justify-center text-indigo-700 text-2xl font-bold">
                                    {PROFILE.initials}
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="pt-12 pb-8 px-6 text-center">
                        <div className="flex items-center justify-center gap-2 mb-1">
                            <h2 className="text-2xl font-bold text-gray-900">{PROFILE.name}</h2>
                            <CheckCircle className="w-5 h-5 text-emerald-500 fill-emerald-50" />
                        </div>
                        <p className="text-gray-500 font-medium">{PROFILE.role}</p>
                        <div className="inline-block px-3 py-1 bg-gray-100 rounded-full text-xs font-mono text-gray-600 mt-3">
                            ID: {PROFILE.id}
                        </div>

                        <div className="border-t border-gray-100 mt-6 pt-6 grid grid-cols-2 gap-4">
                            <div>
                                <p className="text-xs text-gray-400 uppercase">Status</p>
                                <p className="text-emerald-600 font-bold flex items-center justify-center gap-1">
                                    <ShieldCheck className="w-4 h-4" /> Active
                                </p>
                            </div>
                            <div>
                                <p className="text-xs text-gray-400 uppercase">Partner Since</p>
                                <p className="text-gray-900 font-bold">{PROFILE.joined}</p>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Contact Actions */}
                <div className="w-full space-y-3">
                    <a href={`tel:${PROFILE.contact.phone}`} className="flex items-center justify-center gap-3 w-full p-4 bg-indigo-600 text-white rounded-xl font-bold hover:bg-indigo-700 transition-colors shadow-lg shadow-indigo-600/20">
                        <Phone className="w-5 h-5" /> Call Partner
                    </a>
                    <a href={`mailto:${PROFILE.contact.email}`} className="flex items-center justify-center gap-3 w-full p-4 bg-white text-gray-700 border border-gray-200 rounded-xl font-bold hover:bg-gray-50 transition-colors">
                        <Mail className="w-5 h-5" /> Send Email
                    </a>
                    <a href={`https://${PROFILE.contact.website}`} target="_blank" rel="noreferrer" className="flex items-center justify-center gap-3 w-full p-4 bg-white text-gray-700 border border-gray-200 rounded-xl font-bold hover:bg-gray-50 transition-colors">
                        <Globe className="w-5 h-5" /> Visit Website
                    </a>
                </div>

            </div>

            <footer className="py-6 text-center text-gray-400 text-xs">
                <p>© 2026 Appzeto Inc. All rights reserved.</p>
                <p>Verified Partner Profile System</p>
            </footer>
        </div>
    );
};

export default CP_public_profile;

import React, { useEffect, useState } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { supabase } from '../lib/supabaseClient';
import { SPTA_FINANCIAL_TRANSACTIONS_TABLE, fromDbFinancialTransaction } from '../lib/financeTransactionDb';
import { Resolution, SystemConfig, FinancialTransaction } from '../types';

export const VerificationPage = () => {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();
    const location = useLocation();
    const [resolution, setResolution] = useState<Resolution | null>(null);
    const [transaction, setTransaction] = useState<FinancialTransaction | null>(null);
    const [config, setConfig] = useState<SystemConfig | null>(null);
    const [loading, setLoading] = useState(true);

    const isFinance = location.pathname.includes('/verify/finance/');

    useEffect(() => {
        const fetchData = async () => {
            setLoading(true);
            try {
                // Fetch Config for Headers/Logo
                const { data: configData } = await supabase.from('spta_system_config').select('config').single();
                if (configData) setConfig(configData.config as SystemConfig);

                if (isFinance) {
                    const { data: txData } = await supabase
                        .from(SPTA_FINANCIAL_TRANSACTIONS_TABLE)
                        .select('*')
                        .eq('id', id)
                        .single();
                    if (txData) setTransaction(fromDbFinancialTransaction(txData));
                } else {
                    const { data: resData } = await supabase.from('resolutions').select('*').eq('id', id).single();
                    if (resData) setResolution(resData as Resolution);
                }
                
            } catch (error) {
                console.error("Verification failed", error);
            } finally {
                setLoading(false);
            }
        };
        fetchData();
    }, [id, isFinance]);

    if (loading) return <div className="h-screen flex items-center justify-center text-[var(--md-sys-color-primary)]">Verifying...</div>;

    if (!resolution && !transaction) {
        return (
            <div className="h-screen flex flex-col items-center justify-center p-8 bg-[var(--md-sys-color-background)]">
                <span className="material-symbols-outlined text-6xl text-[var(--md-sys-color-error)] mb-4">gpp_bad</span>
                <h1 className="text-2xl font-bold text-[var(--md-sys-color-on-surface)]">Document Not Found</h1>
                <p className="text-[var(--md-sys-color-on-surface-variant)] text-center max-w-md mt-2">
                    The document you are looking for does not exist in our system. It may have been deleted or the link is invalid.
                </p>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-[var(--md-sys-color-background)] p-4 md:p-8 flex items-center justify-center">
            <div className="bg-white rounded-[32px] shadow-2xl max-w-2xl w-full overflow-hidden border border-white/50">
                <div className="bg-green-50 p-8 text-center border-b border-green-100">
                    <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4 text-green-600 shadow-inner">
                        <span className="material-symbols-outlined text-5xl">verified</span>
                    </div>
                    <h1 className="text-2xl font-bold text-green-800">Verified Authentic</h1>
                    <p className="text-green-700 opacity-80 mt-1">This document is a valid record in the {config?.schoolName || 'System'} database.</p>
                </div>

                <div className="p-8 space-y-6">
                    {/* Finance Verification */}
                    {transaction && (
                        <div className="space-y-4">
                            <div className="text-center mb-6">
                                <p className="text-xs font-bold text-[var(--md-sys-color-outline)] uppercase tracking-wider">Transaction Record</p>
                                <h2 className="text-3xl font-bold text-[var(--md-sys-color-on-surface)] mt-2">₱{transaction.amount.toLocaleString()}</h2>
                                <p className="text-[var(--md-sys-color-on-surface-variant)]">{transaction.type}</p>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                                <div className="p-4 bg-gray-50 rounded-xl">
                                    <p className="text-xs text-gray-500 uppercase font-bold mb-1">Reference No.</p>
                                    <p className="font-mono font-bold text-gray-800">{transaction.referenceNo || transaction.disbursementCode || 'N/A'}</p>
                                </div>
                                <div className="p-4 bg-gray-50 rounded-xl">
                                    <p className="text-xs text-gray-500 uppercase font-bold mb-1">Date</p>
                                    <p className="font-bold text-gray-800">{new Date(transaction.date).toLocaleDateString()}</p>
                                </div>
                                <div className="p-4 bg-gray-50 rounded-xl md:col-span-2">
                                    <p className="text-xs text-gray-500 uppercase font-bold mb-1">Entity / Name</p>
                                    <p className="font-bold text-gray-800">{transaction.learnerName || transaction.payee}</p>
                                </div>
                                <div className="p-4 bg-gray-50 rounded-xl md:col-span-2">
                                    <p className="text-xs text-gray-500 uppercase font-bold mb-1">Particulars</p>
                                    <p className="text-gray-800">{transaction.particulars}</p>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Resolution Verification */}
                    {resolution && (
                        <div className="space-y-4">
                            <div className="text-center mb-6">
                                <p className="text-xs font-bold text-[var(--md-sys-color-outline)] uppercase tracking-wider">Resolution Document</p>
                                <h2 className="text-xl font-bold text-[var(--md-sys-color-on-surface)] mt-2 leading-tight">{resolution.title}</h2>
                                <p className="text-[var(--md-sys-color-on-surface-variant)] mt-1">Res. No. {resolution.number}, Series of {resolution.seriesYear}</p>
                            </div>
                            
                            <div className="p-4 bg-[var(--md-sys-color-secondary-container)] rounded-xl text-[var(--md-sys-color-on-secondary-container)] text-center">
                                <p className="text-sm font-medium">Status: <strong>{resolution.status}</strong></p>
                            </div>
                        </div>
                    )}

                    <div className="pt-6 border-t border-gray-100 text-center">
                        <p className="text-xs text-gray-400">Generated by {config?.appName || 'SPTA System'}</p>
                    </div>
                </div>
            </div>
        </div>
    );
};


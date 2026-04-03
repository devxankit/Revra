import React, { useState, useRef } from 'react';
import { FiUpload, FiCheckCircle, FiAlertCircle, FiDownload, FiFileText, FiX } from 'react-icons/fi';
import { adminSalesService } from '../admin-services';
import { Button } from '../../../components/ui/button';
import { useToast } from '../../../contexts/ToastContext';

const CSVLeadImporter = ({ leadCategories, onComplete }) => {
  const { toast } = useToast();
  const fileInputRef = useRef(null);
  const [file, setFile] = useState(null);
  const [columns, setColumns] = useState([]);
  const [mapping, setMapping] = useState({ name: '', phone: '', email: '', source: '' });
  const [isProcessing, setIsProcessing] = useState(false);
  const [results, setResults] = useState(null);
  const [error, setError] = useState(null);
  const [selectedCategory, setSelectedCategory] = useState('');
  const [progress, setProgress] = useState(0);
  const [failedRows, setFailedRows] = useState([]);

  const handleFileChange = (e) => {
    const selectedFile = e.target.files[0];
    if (selectedFile) {
      if (selectedFile.type !== 'text/csv' && !selectedFile.name.endsWith('.csv')) {
        setError('Please upload a valid CSV file.');
        return;
      }
      setFile(selectedFile);
      const reader = new FileReader();
      reader.onload = (event) => {
        const text = event.target.result;
        const firstLine = text.split('\n')[0];
        const headers = firstLine.split(',').map(h => h.trim().replace(/\"/g, ''));
        setColumns(headers);
        setMapping({
           name: headers.find(h => h.toLowerCase().includes('name')) || '',
           phone: headers.find(h => h.toLowerCase().includes('phone') || h.toLowerCase().includes('mobile')) || '',
           email: headers.find(h => h.toLowerCase().includes('email')) || '',
           source: headers.find(h => h.toLowerCase().includes('source')) || ''
        });
        setError(null);
        setResults(null);
        setFailedRows([]);
      };
      reader.readAsText(selectedFile);
    }
  };

  const downloadTemplate = () => {
    const headers = ['Name', 'Phone', 'Email', 'Source'];
    const csvContent = headers.join(',') + '\nJohn Doe,9876543210,john@example.com,Facebook Ads';
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'revra_leads_template.csv';
    link.click();
    toast.success('Template downloaded successfully');
  };

  const validateRecord = (record) => {
    const phone = record[mapping.phone];
    if (!phone) return 'Phone number missing';
    if (phone.length < 10) return 'Invalid phone number length';
    
    const email = mapping.email ? record[mapping.email] : '';
    if (email && !email.includes('@')) return 'Invalid email format';
    
    return null;
  };

  const executeImport = async () => {
    if (!mapping.phone) {
      setError('Phone number column mapping is mandatory.');
      return;
    }
    if (!selectedCategory) {
      setError('Please select a target Category for these leads.');
      return;
    }

    setIsProcessing(true);
    setError(null);
    setProgress(0);
    setFailedRows([]);

    try {
      const reader = new FileReader();
      reader.onload = async (event) => {
        const text = event.target.result;
        const lines = text.split('\n').filter(l => l.trim() !== '');
        const headers = lines[0].split(',').map(h => h.trim().replace(/\"/g, ''));
        
        let successCount = 0;
        let failCount = 0;
        const errors = [];

        const totalRecords = lines.length - 1;

        for (let i = 1; i < lines.length; i++) {
          const values = lines[i].split(',').map(v => v.trim().replace(/\"/g, ''));
          const record = {};
          headers.forEach((h, index) => { record[h] = values[index] || ''; });
          
          const validationError = validateRecord(record);
          if (validationError) {
            errors.push({ row: i + 1, error: validationError });
            failCount++;
            continue;
          }

          const payload = {
            phone: record[mapping.phone],
            category: selectedCategory,
            source: mapping.source ? record[mapping.source] : 'bulk_upload'
          };
          if (mapping.name) payload.name = record[mapping.name];
          if (mapping.email) payload.email = record[mapping.email];

          try {
            const res = await adminSalesService.createLead(payload);
            if (res.success) successCount++;
            else {
              errors.push({ row: i + 1, error: res.message || 'Server error' });
              failCount++;
            }
          } catch (err) {
            errors.push({ row: i + 1, error: 'Network error or duplicate' });
            failCount++;
          }
          
          setProgress(Math.round((i / totalRecords) * 100));
        }

        setResults({ success: successCount, failed: failCount });
        setFailedRows(errors);
        setIsProcessing(false);
        if (onComplete) onComplete();
      };
      reader.readAsText(file);
    } catch (err) {
      setError('Failed to process CSV file.');
      setIsProcessing(false);
    }
  };

  return (
    <div className="bg-white rounded-3xl shadow-xl border border-gray-100 overflow-hidden animate-in fade-in zoom-in duration-300">
      <div className="bg-teal-600 p-6 flex justify-between items-center text-white">
        <div className="flex items-center gap-3">
          <div className="p-3 bg-white/20 rounded-2xl">
            <FiUpload className="w-6 h-6" />
          </div>
          <div>
            <h3 className="text-xl font-black">Bulk Lead Ingester</h3>
            <p className="text-xs font-bold text-teal-100 uppercase tracking-widest mt-1">Advanced CSV Mapping Tool</p>
          </div>
        </div>
        <Button variant="ghost" onClick={downloadTemplate} className="text-white hover:bg-white/10 font-bold gap-2">
          <FiDownload className="w-4 h-4" />
          Download Template
        </Button>
      </div>
      
      {!results ? (
        <div className="p-8 space-y-8">
          {!file ? (
            <div 
              onClick={() => fileInputRef.current.click()}
              className="group border-4 border-dashed border-gray-100 rounded-3xl p-12 text-center hover:border-teal-100 hover:bg-teal-50/30 transition-all cursor-pointer relative"
            >
              <input 
                ref={fileInputRef}
                type="file" 
                accept=".csv" 
                onChange={handleFileChange} 
                className="hidden" 
              />
              <div className="h-20 w-20 bg-gray-50 text-gray-400 rounded-full flex items-center justify-center mx-auto mb-6 group-hover:bg-teal-100 group-hover:text-teal-600 transition-colors">
                <FiFileText className="w-10 h-10" />
              </div>
              <h4 className="text-xl font-bold text-gray-900">Select your CSV File</h4>
              <p className="text-gray-500 mt-2 font-medium">Drag and drop your lead list here or click to browse</p>
            </div>
          ) : (
            <div className="space-y-8 animate-in slide-in-from-bottom-4 duration-300">
              <div className="flex items-center justify-between p-4 bg-gray-50 rounded-2xl border border-gray-100">
                <div className="flex items-center gap-4">
                  <div className="p-2 bg-teal-100 text-teal-600 rounded-lg">
                    <FiFileText className="w-5 h-5" />
                  </div>
                  <div>
                    <p className="font-bold text-gray-900">{file.name}</p>
                    <p className="text-xs text-gray-500">{(file.size / 1024).toFixed(1)} KB • {columns.length} Columns Found</p>
                  </div>
                </div>
                <button onClick={() => setFile(null)} className="p-2 hover:bg-red-50 text-gray-400 hover:text-red-500 rounded-xl transition-colors">
                  <FiX className="w-5 h-5" />
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 p-6 bg-teal-50/50 rounded-3xl border border-teal-100/50">
                <div className="md:col-span-2 text-xs font-black text-teal-600 uppercase tracking-widest mb-2 px-1">
                  Step 1: Assign Lead Category
                </div>
                <div className="md:col-span-2 space-y-2">
                  <select 
                    value={selectedCategory} 
                    onChange={(e) => setSelectedCategory(e.target.value)} 
                    className="w-full h-14 bg-white border border-teal-200 rounded-2xl px-5 font-bold text-gray-700 focus:ring-4 focus:ring-teal-500/10 outline-none transition-all shadow-sm"
                  >
                     <option value="">Select Target Category for this Batch...</option>
                     {leadCategories.map(c => <option key={c._id} value={c._id}>{c.name}</option>)}
                  </select>
                </div>

                <div className="md:col-span-2 text-xs font-black text-teal-600 uppercase tracking-widest mt-4 mb-2 px-1">
                  Step 2: Map CSV Columns
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Phone Number (Required) *</label>
                  <select value={mapping.phone} onChange={(e) => setMapping({...mapping, phone: e.target.value})} className="w-full h-12 bg-white border border-gray-100 rounded-xl px-4 font-bold text-sm">
                    <option value="">Map Column...</option>
                    {columns.map((c, i) => <option key={i} value={c}>{c}</option>)}
                  </select>
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Client Full Name</label>
                  <select value={mapping.name} onChange={(e) => setMapping({...mapping, name: e.target.value})} className="w-full h-12 bg-white border border-gray-100 rounded-xl px-4 font-bold text-sm">
                    <option value="">Map Column (Skip if missing)</option>
                    {columns.map((c, i) => <option key={i} value={c}>{c}</option>)}
                  </select>
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Email Address</label>
                  <select value={mapping.email} onChange={(e) => setMapping({...mapping, email: e.target.value})} className="w-full h-12 bg-white border border-gray-100 rounded-xl px-4 font-bold text-sm">
                    <option value="">Map Column (Skip if missing)</option>
                    {columns.map((c, i) => <option key={i} value={c}>{c}</option>)}
                  </select>
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Custom Source</label>
                  <select value={mapping.source} onChange={(e) => setMapping({...mapping, source: e.target.value})} className="w-full h-12 bg-white border border-gray-100 rounded-xl px-4 font-bold text-sm">
                    <option value="">Map Column (Skip if missing)</option>
                    {columns.map((c, i) => <option key={i} value={c}>{c}</option>)}
                  </select>
                </div>
              </div>

              {error && (
                <div className="p-4 bg-red-50 text-red-600 rounded-2xl flex items-center gap-3 font-bold border border-red-100">
                  <FiAlertCircle className="shrink-0" /> {error}
                </div>
              )}

              {isProcessing && (
                <div className="space-y-3">
                  <div className="flex justify-between items-center px-1">
                    <span className="text-sm font-black text-teal-600">Importing {progress}%</span>
                    <span className="text-xs font-bold text-gray-400 animate-pulse">Please do not close this window...</span>
                  </div>
                  <div className="h-3 w-full bg-gray-100 rounded-full overflow-hidden border border-gray-50 shadow-inner">
                    <div className="h-full bg-teal-500 transition-all duration-300" style={{ width: `${progress}%` }}></div>
                  </div>
                </div>
              )}
              
              <Button 
                onClick={executeImport} 
                disabled={isProcessing || !file}
                className="w-full h-16 bg-teal-600 hover:bg-teal-700 text-white font-black text-lg rounded-3xl shadow-xl shadow-teal-600/20 disabled:grayscale transition-all"
              >
                {isProcessing ? 'Processing Lead Data...' : 'Finalize and Start Import'}
              </Button>
            </div>
          )}
        </div>
      ) : (
        <div className="p-12 text-center space-y-8 animate-in zoom-in duration-500">
            <div className="h-28 w-28 bg-green-50 text-green-500 rounded-full flex items-center justify-center mx-auto ring-8 ring-green-50/50">
              <FiCheckCircle className="w-14 h-14" />
            </div>
            <div className="space-y-2">
              <h4 className="text-3xl font-black text-gray-900">Ingestion Complete</h4>
              <p className="text-gray-500 font-medium">Your lead list has been processed and ready for assignment.</p>
            </div>
            
            <div className="grid grid-cols-2 gap-4 max-w-sm mx-auto">
              <div className="p-6 bg-green-50 rounded-3xl border border-green-100">
                <p className="text-3xl font-black text-green-700">{results.success}</p>
                <p className="text-[10px] font-black text-green-600 uppercase tracking-widest mt-1">Successful</p>
              </div>
              <div className="p-6 bg-red-50 rounded-3xl border border-red-100">
                <p className="text-3xl font-black text-red-700">{results.failed}</p>
                <p className="text-[10px] font-black text-red-600 uppercase tracking-widest mt-1">Failed</p>
              </div>
            </div>

            {failedRows.length > 0 && (
              <div className="max-w-md mx-auto text-left bg-gray-50 rounded-2xl p-6 border border-gray-100">
                <h5 className="text-xs font-black text-gray-400 uppercase tracking-widest mb-4">Error Log ({failedRows.length})</h5>
                <div className="max-h-32 overflow-y-auto space-y-2 custom-scrollbar">
                  {failedRows.map((err, i) => (
                    <div key={i} className="text-xs font-bold text-red-500 bg-white p-2 rounded-lg border border-red-50 flex items-center gap-2">
                      <span className="shrink-0 bg-red-50 px-1.5 py-0.5 rounded text-[10px]">Row {err.row}</span>
                      {err.error}
                    </div>
                  ))}
                </div>
              </div>
            )}

            <Button onClick={() => { setFile(null); setResults(null); setColumns([]); }} className="bg-teal-600 hover:bg-teal-700 font-black h-14 px-12 rounded-2xl">
              Import Another List
            </Button>
        </div>
      )}
    </div>
  );
};

export default CSVLeadImporter;

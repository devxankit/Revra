import React from 'react';
import { FiFileText, FiDownload } from 'react-icons/fi';

const DownloadQuotationButton = ({ lead }) => {
  // Common paths for quotations in lead objects in this project
  // This component handles the retrieval and download of associated quotation PDFs
  const pdfUrl = 
    lead?.quotation?.pdfDocument?.url || 
    lead?.leadProfile?.quotationUrl || 
    lead?.conversionData?.quotationUrl ||
    lead?.pdfDocument?.url;

  if (!pdfUrl) return null;

  const handleDownload = (e) => {
    e.stopPropagation();
    // Use the absolute URL if available, or construct it if needed
    const downloadUrl = pdfUrl.startsWith('http') ? pdfUrl : `${process.env.REACT_APP_API_URL || ''}${pdfUrl}`;
    window.open(downloadUrl, '_blank');
  };

  return (
    <button
      onClick={handleDownload}
      className="p-2 text-purple-600 hover:bg-purple-50 rounded-lg transition-colors flex items-center space-x-1 group"
      title="Download Quotation"
    >
      <FiFileText className="w-4 h-4 group-hover:scale-110 transition-transform" />
      <FiDownload className="w-3 h-3 opacity-0 group-hover:opacity-100 transition-opacity" />
    </button>
  );
};

export default DownloadQuotationButton;

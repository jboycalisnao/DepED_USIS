
import React, { useState, useMemo } from 'react';
import { Candidate, SchoolYear } from '../../../types';
import { LEON_NHS_LOGO_URL, DEPED_SEAL_URL } from '../../../constants';
import { getEncodingSlipTemplate } from './EncodingSlipTemplate';
import { getElectionAbsoluteUrl } from '../../../utils/navigation';

interface BatchSlipGeneratorProps {
  candidates: Candidate[];
  schoolYears: SchoolYear[];
  isOpen: boolean;
  onClose: () => void;
}

const BatchSlipGenerator: React.FC<BatchSlipGeneratorProps> = ({ candidates, schoolYears, isOpen, onClose }) => {
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [isGenerating, setIsGenerating] = useState(false);

  if (!isOpen) return null;

  const activeSyLabel = schoolYears.find(sy => sy.isActive || sy.is_active)?.label || '----';

  // Duplicate Detection Engine: Pre-flight Audit
  const duplicates = useMemo(() => {
    const nameMap = new Map<string, string[]>();
    candidates.forEach(c => {
      const normalizedName = c.name.toUpperCase().trim();
      if (!nameMap.has(normalizedName)) nameMap.set(normalizedName, []);
      nameMap.get(normalizedName)!.push(c.id);
    });
    
    const dupeIds = new Set<string>();
    nameMap.forEach((ids) => {
      if (ids.length > 1) {
        ids.forEach(id => dupeIds.add(id));
      }
    });
    return dupeIds;
  }, [candidates]);

  const selectedDuplicatesCount = Array.from(selectedIds).filter(id => duplicates.has(id)).length;

  const toggleCandidate = (id: string) => {
    const next = new Set(selectedIds);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setSelectedIds(next);
  };

  const toggleAll = () => {
    if (selectedIds.size === candidates.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(candidates.map(c => c.id)));
    }
  };

  const handleGenerateBatch = () => {
    if (selectedIds.size === 0 || selectedDuplicatesCount > 0) return;

    setIsGenerating(true);
    const selectedCandidates = candidates.filter(c => selectedIds.has(c.id));
    
    // Create a new window for the batch print
    const printWindow = window.open('', '_blank');
    if (!printWindow) {
      alert("Pop-up blocked! Please allow pop-ups for the generation engine.");
      setIsGenerating(false);
      return;
    }

    const slipsHtml = selectedCandidates.map(candidate => {
      const uniqueId = Math.random().toString(36).substring(2, 10).toUpperCase();
      const cocNumber = `${activeSyLabel}-${uniqueId}`;
      const qrUrl = getElectionAbsoluteUrl(`/audit/${candidate.id}`);
      
      const template = getEncodingSlipTemplate(
        candidate, 
        activeSyLabel, 
        qrUrl, 
        cocNumber, 
        DEPED_SEAL_URL, 
        LEON_NHS_LOGO_URL
      );

      const bodyMatch = template.match(/<div class="document-container">[\s\S]*?<\/div>/);
      return bodyMatch ? `<div class="print-page-break">${bodyMatch[0]}</div>` : '';
    }).join('');

    const batchTemplate = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>Batch COC Slips - SY ${activeSyLabel}</title>
        <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;700;900&display=swap" rel="stylesheet">
        <style>
          @page { size: A5 landscape; margin: 0; }
          body { margin: 0; padding: 0; background: #eee; }
          .print-page-break { 
            page-break-after: always; 
            background: white;
            width: 210mm;
            height: 148mm;
            display: flex;
            align-items: center;
            justify-content: center;
          }
          .document-container { width: 190mm; height: 128mm; border: 2px solid #000; padding: 1.5mm; display: flex; flex-direction: column; }
          .inner-content { border: 0.5px solid #000; height: 100%; padding: 6mm 8mm; display: flex; flex-direction: column; justify-content: space-between; position: relative; }
          .header { display: flex; align-items: center; justify-content: space-between; border-bottom: 1.5px solid #000; padding-bottom: 3mm; }
          .logo { height: 18mm; width: auto; }
          .header-text { text-align: center; flex: 1; padding: 0 4mm; }
          .header-text p { margin: 0; font-size: 7.5pt; font-weight: 500; text-transform: uppercase; }
          .header-text h2 { margin: 0.5mm 0; font-size: 10pt; font-weight: 900; text-transform: uppercase; }
          .title-block { text-align: center; margin: 4mm 0; }
          .main-title { font-size: 18pt; font-weight: 900; text-transform: uppercase; display: block; }
          .sub-title { font-size: 9pt; font-weight: 700; text-transform: uppercase; letter-spacing: 2pt; border-top: 1px solid #eee; display: inline-block; padding-top: 0.5mm; }
          .info-grid { display: flex; justify-content: space-between; align-items: flex-start; flex-grow: 1; padding: 2mm 0; }
          .details { flex: 1; }
          .data-group { margin-bottom: 6mm; }
          .label { font-size: 8pt; font-weight: 800; text-transform: uppercase; color: #666; margin-bottom: 1.5mm; }
          .value-name { font-size: 22pt; font-weight: 900; text-transform: uppercase; line-height: 1; }
          .value-ref { font-family: monospace; font-size: 14pt; font-weight: 800; background: #f4f4f4; padding: 2mm 4mm; border: 1px solid #000; display: inline-block; }
          .qr-section { text-align: center; margin-left: 10mm; }
          .qr-wrapper { border: 1px solid #000; padding: 1.5mm; display: inline-block; background: #fff; }
          .qr-code { width: 30mm; height: 30mm; display: block; }
          .qr-note { font-size: 6pt; font-weight: 800; text-transform: uppercase; margin-top: 1.5mm; max-width: 30mm; line-height: 1.1; }
          .footer { border-top: 1px solid #000; padding-top: 2.5mm; display: flex; justify-content: space-between; font-size: 6.5pt; font-weight: 700; text-transform: uppercase; }
          .official-seal { position: absolute; bottom: 18mm; right: 55mm; width: 22mm; height: 22mm; border: 1px dashed rgba(0,0,0,0.1); border-radius: 50%; display: flex; align-items: center; justify-content: center; text-align: center; font-size: 5pt; font-weight: 900; color: rgba(0,0,0,0.1); transform: rotate(-15deg); }
          @media print {
            body { background: white; }
            .print-page-break { margin: 0; box-shadow: none; border: none; }
          }
        </style>
      </head>
      <body>
        ${slipsHtml}
        <script>
          window.onload = () => {
            setTimeout(() => {
              window.print();
              window.close();
            }, 1000);
          };
        </script>
      </body>
      </html>
    `;

    printWindow.document.write(batchTemplate);
    printWindow.document.close();
    setIsGenerating(false);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
      <div className="bg-white rounded-[2.5rem] shadow-2xl max-w-2xl w-full flex flex-col max-h-[85vh] overflow-hidden border border-gray-100 animate-in zoom-in-95 duration-200">
        <div className="bg-[#034F8B] p-8 text-white relative flex-shrink-0">
          <div className="flex items-center space-x-4 mb-2">
            <div className="w-12 h-12 bg-white/10 rounded-xl flex items-center justify-center border border-white/20">
              <i className="fa-solid fa-copy text-xl text-[#fcd116]"></i>
            </div>
            <div>
              <h3 className="text-xl font-black uppercase tracking-tight">Encoding Duplicate Engine</h3>
              <p className="text-[10px] font-bold text-blue-200 uppercase tracking-widest">Batch Generator for Official Slips</p>
            </div>
          </div>
          <button onClick={onClose} className="absolute top-8 right-8 text-white/50 hover:text-white transition-colors">
            <i className="fa-solid fa-xmark text-xl"></i>
          </button>
        </div>

        <div className="p-8 overflow-y-auto no-scrollbar flex-grow">
          {/* Integrity Check Panel */}
          {selectedDuplicatesCount > 0 && (
            <div className="mb-8 p-6 bg-red-50 border-2 border-red-100 rounded-[2rem] flex items-start space-x-4 animate-in slide-in-from-top-4">
              <div className="w-10 h-10 bg-red-500 rounded-xl flex items-center justify-center text-white flex-shrink-0 shadow-lg shadow-red-900/20">
                <i className="fa-solid fa-triangle-exclamation"></i>
              </div>
              <div>
                <h4 className="text-[11px] font-black text-red-600 uppercase tracking-widest">Integrity Violation Detected</h4>
                <p className="text-[10px] font-bold text-red-800/60 leading-relaxed uppercase mt-1">
                  {selectedDuplicatesCount} selected candidates share identical names in the registry. 
                  Official document generation is suspended until duplicate entries are resolved in the registry.
                </p>
              </div>
            </div>
          )}

          <div className="flex items-center justify-between mb-6 pb-4 border-b border-gray-100">
            <div className="flex items-center space-x-3">
              <button 
                onClick={toggleAll}
                className="text-[10px] font-black text-[#034F8B] uppercase tracking-widest bg-blue-50 px-4 py-2 rounded-lg hover:bg-blue-100 transition-colors"
              >
                {selectedIds.size === candidates.length ? 'Deselect All' : 'Select All Registered'}
              </button>
              <span className="text-[10px] font-bold text-gray-400 uppercase">{selectedIds.size} Selected</span>
            </div>
            <div className="text-right">
              <span className="text-[10px] font-black text-blue-400 uppercase">Targeting SY {activeSyLabel}</span>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {candidates.map(c => {
              const isDupe = duplicates.has(c.id);
              const isSelected = selectedIds.has(c.id);
              
              return (
                <label 
                  key={c.id} 
                  className={`flex items-center p-4 rounded-2xl border-2 cursor-pointer transition-all ${
                    isSelected 
                      ? (isDupe ? 'border-red-400 bg-red-50' : 'border-[#034F8B] bg-blue-50/50 shadow-md')
                      : 'border-gray-100 hover:border-gray-200 bg-gray-50/30'
                  }`}
                >
                  <input 
                    type="checkbox" 
                    checked={isSelected} 
                    onChange={() => toggleCandidate(c.id)}
                    className="hidden"
                  />
                  <div className={`w-5 h-5 rounded-md border-2 mr-4 flex items-center justify-center transition-colors ${
                    isSelected 
                      ? (isDupe ? 'bg-red-500 border-red-500' : 'bg-[#034F8B] border-[#034F8B]')
                      : 'bg-white border-gray-300'
                  }`}>
                    {isSelected && <i className="fa-solid fa-check text-white text-[10px]"></i>}
                  </div>
                  <div className="min-w-0 flex-grow">
                    <p className={`font-black text-xs uppercase truncate ${isDupe && isSelected ? 'text-red-700' : 'text-gray-900'}`}>
                      {c.name}
                    </p>
                    <p className="text-[9px] font-bold text-gray-400 uppercase truncate">{c.position}</p>
                  </div>
                  {isDupe && (
                    <i className="fa-solid fa-circle-exclamation text-red-500 text-xs ml-2 animate-pulse" title="Duplicate Name Found"></i>
                  )}
                </label>
              );
            })}
          </div>
        </div>

        <div className="p-8 bg-gray-50 border-t border-gray-100 flex items-center justify-between">
          <p className="text-[9px] font-bold text-gray-400 leading-relaxed max-w-[50%] uppercase tracking-tight italic">
            Engine will produce individual A5 landscape slips for each selected candidate. Suspended if duplicates are selected.
          </p>
          <button 
            onClick={handleGenerateBatch}
            disabled={selectedIds.size === 0 || isGenerating || selectedDuplicatesCount > 0}
            className={`px-8 py-4 rounded-2xl font-black text-xs uppercase tracking-widest shadow-xl transition-all flex items-center ${
              selectedDuplicatesCount > 0 
                ? 'bg-gray-300 text-gray-500 cursor-not-allowed' 
                : 'bg-[#E11C38] text-white shadow-red-900/20 hover:bg-red-700 active:scale-95'
            }`}
          >
            {isGenerating ? (
              <><i className="fa-solid fa-spinner animate-spin mr-3"></i> Running Engine...</>
            ) : selectedDuplicatesCount > 0 ? (
              <><i className="fa-solid fa-ban mr-3"></i> Fix Duplicates</>
            ) : (
              <><i className="fa-solid fa-bolt-lightning mr-3"></i> Generate {selectedIds.size} Duplicate Slips</>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

export default BatchSlipGenerator;

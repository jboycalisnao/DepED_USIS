import React, { useRef, useState } from 'react';
import { Candidate, Position, GradeLevel } from '../../types';
import { POSITIONS } from '../../constants';
import { compressImageFile, optimizeImageUrl } from '../../utils/imageUtils';

interface CandidatesTabProps {
  candidates: Candidate[];
  setCandidates: React.Dispatch<React.SetStateAction<Candidate[]>>;
}

const CandidatesTab: React.FC<CandidatesTabProps> = ({ candidates, setCandidates }) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isCompressing, setIsCompressing] = useState(false);

  const handleAddCandidate = async () => {
    const name = prompt("Enter Candidate Name:");
    if (!name) return;
    const pos = prompt(`Enter Position (${POSITIONS.join(', ')}):`);
    if (!pos || !POSITIONS.includes(pos as Position)) {
      alert("Invalid Position");
      return;
    }
    const party = prompt("Enter Party Name:");
    
    if (fileInputRef.current) {
      fileInputRef.current.onchange = async (e: any) => {
        const file = e.target.files?.[0];
        if (!file) return;

        try {
          setIsCompressing(true);
          const compressedBase64 = await compressImageFile(file, 400, 0.75);
          
          const newCandidate: Candidate = {
            id: `c-${Date.now()}`,
            name: name.toUpperCase(),
            firstName: name.split(' ')[0].toUpperCase() || name.toUpperCase(),
            lastName: name.split(' ').slice(1).join(' ').toUpperCase() || 'CANDIDATE',
            position: pos as Position,
            gradeLevel: GradeLevel.GRADE_12,
            party: party?.toUpperCase() || 'INDEPENDENT',
            imageUrl: compressedBase64,
            vision: '', // Removed default motto
            votes: 0,
            gender: 'MALE',
            age: 16,
            birthDate: '2010-01-01',
            email: 'candidate@example.edu.ph',
            mobileNo: '09000000000',
            homeAddress: 'LEON, ILOILO'
          };
          
          setCandidates(prev => [...prev, newCandidate]);
          setIsCompressing(false);
          alert("Candidate registered successfully.");
        } catch (error) {
          console.error("Compression failed", error);
          alert("Failed to process image. Please try again.");
          setIsCompressing(false);
        }
      };
      fileInputRef.current.click();
    }
  };

  const handleDeleteCandidate = (id: string) => {
    if (confirm("Are you sure you want to remove this candidate? This will delete all their current votes.")) {
      setCandidates(candidates.filter(c => c.id !== id));
    }
  };

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
      <input 
        type="file" 
        ref={fileInputRef} 
        className="hidden" 
        accept="image/*" 
      />

      <div className="p-8 border-b border-gray-100 flex justify-between items-center bg-[#034F8B]">
        <div className="flex flex-col">
          <h3 className="text-xl font-black text-white uppercase tracking-tight">Candidate Registry</h3>
          {isCompressing && (
            <span className="text-[10px] text-blue-200 font-bold animate-pulse mt-1">
              COMPRESSING IMAGE FOR BANDWIDTH...
            </span>
          )}
        </div>
        <button 
          onClick={handleAddCandidate}
          disabled={isCompressing}
          className="bg-[#E11C38] text-white px-6 py-2.5 rounded-xl font-black text-[10px] uppercase hover:bg-red-700 transition-all shadow-lg shadow-red-900/20 flex items-center border-2 border-white/20 disabled:bg-gray-400"
        >
          <i className={`fa-solid ${isCompressing ? 'fa-spinner animate-spin' : 'fa-plus'} mr-2`}></i>
          {isCompressing ? 'Processing...' : 'Register Candidate'}
        </button>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-left">
          <thead>
            <tr className="text-gray-400 text-[10px] font-black uppercase tracking-widest bg-gray-50/50">
              <th className="px-8 py-4">Full Name</th>
              <th className="px-8 py-4">Running For</th>
              <th className="px-8 py-4">Political Party</th>
              <th className="px-8 py-4 text-center">Live Tally</th>
              <th className="px-8 py-4 text-right">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {candidates.map(c => (
              <tr key={c.id} className="hover:bg-blue-50/30 transition-colors">
                <td className="px-8 py-5">
                  <div className="flex items-center">
                    <img 
                      src={optimizeImageUrl(c.imageUrl, 100)} 
                      loading="lazy"
                      className="w-10 h-10 rounded-full mr-4 border-2 border-[#034F8B]/10 shadow-sm object-cover" 
                      alt={c.name} 
                    />
                    <span className="font-bold text-gray-900 uppercase">{c.name}</span>
                  </div>
                </td>
                <td className="px-8 py-5 text-xs font-bold text-gray-600 uppercase">{c.position}</td>
                <td className="px-8 py-5">
                  <span className="text-[10px] font-black text-[#034F8B] uppercase px-3 py-1 bg-blue-50 rounded-full border border-blue-100">
                    {c.party}
                  </span>
                </td>
                <td className="px-8 py-5 text-center font-black text-lg text-[#E11C38]">{c.votes}</td>
                <td className="px-8 py-5 text-right">
                  <button 
                    onClick={() => handleDeleteCandidate(c.id)}
                    className="text-red-400 hover:text-red-600 transition-colors p-2 hover:bg-red-50 rounded-lg"
                    title="Delete Candidate"
                  >
                    <i className="fa-solid fa-trash-can"></i>
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default CandidatesTab;

import React, { useState, useMemo } from 'react';
import { useStore } from '../store';
import { EnrollmentStatus, Student, EnrollmentRecord, GradeLevel, Section } from '../types';
import ConfirmationModal from '../components/ConfirmationModal';
import LearnerDetailsModal from '../components/LearnerDetailsModal';

const LearnerList: React.FC = () => {
  const { learners, sections, activeSchoolYear, removeLearner, clearSectionLearners, loading } = useStore();
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedStudent, setSelectedStudent] = useState<Student | null>(null);
  const [deletingStudent, setDeletingStudent] = useState<Student | null>(null);
  const [clearingSection, setClearingSection] = useState<{ name: string, id: string } | null>(null);
  
  const [expandedGrades, setExpandedGrades] = useState<Set<string>>(new Set());
  const [expandedSections, setExpandedSections] = useState<Set<string>>(new Set());

  const isLocked = activeSchoolYear.isLocked;

  /**
   * Filter learners strictly by the selected School Year.
   */
  const activeLearnersForYear = useMemo(() => {
    const activeSectionIds = new Set(
      sections
        .filter(s => s.schoolYearId === activeSchoolYear.id)
        .map(s => s.id)
    );

    return learners.filter(l => {
      const studentSid = String(l.sectionId || '').trim();
      const currentEnrol = l.enrollments?.find(e => e.schoolYear === activeSchoolYear.label);
      
      const hasActiveSection = studentSid && activeSectionIds.has(studentSid);
      const hasMatchingEnrollment = !!currentEnrol;
      
      const query = searchTerm.toLowerCase();
      const fullName = `${l.lastName}, ${l.firstName} ${l.middleName || ''}`.toLowerCase();
      const matchesSearch = fullName.includes(query) || l.lrn.includes(query);

      return (hasActiveSection || hasMatchingEnrollment) && matchesSearch;
    });
  }, [learners, sections, activeSchoolYear, searchTerm]);

  /**
   * Compute history for the selected student
   */
  const derivedHistory = useMemo(() => {
    if (!selectedStudent) return [];
    const allInstances = learners.filter(l => l.lrn === selectedStudent.lrn);
    const historyMap = new Map<string, EnrollmentRecord>();

    allInstances.forEach(instance => {
      const studentSid = String(instance.sectionId || '').trim();
      const section = sections.find(s => String(s.id).trim() === studentSid);
      
      if (section) {
        const sy = section.schoolYearId.startsWith('sy') 
          ? section.schoolYearId.replace('sy', '').replace(/(\d{2})(\d{2})/, '20$1-20$2')
          : section.schoolYearId;
        const syLabel = activeSchoolYear.id === section.schoolYearId ? activeSchoolYear.label : sy;
        const matchingEnrollment = instance.enrollments?.find(e => e.schoolYear === syLabel);
        const actualEntryDate = matchingEnrollment?.enrollmentDate || new Date().toISOString().split('T')[0];

        historyMap.set(syLabel, {
          id: instance.id,
          schoolYear: syLabel,
          gradeLevel: section.gradeLevel,
          section: section.name,
          enrollmentDate: actualEntryDate,
          status: instance.status
        });
      }
    });

    return Array.from(historyMap.values()).sort((a, b) => b.schoolYear.localeCompare(a.schoolYear));
  }, [selectedStudent, learners, sections, activeSchoolYear]);

  // Grouping logic: Grade Level -> Section -> Learners (Male then Female)
  const groupedData = useMemo(() => {
    const groups: Record<string, Record<string, { students: Student[], sectionId?: string }>> = {};

    activeLearnersForYear.forEach(student => {
      const studentSid = String(student.sectionId || '').trim();
      const section = sections.find(sec => String(sec.id).trim() === studentSid);
      
      let gradeLabel = 'Unassigned Registry';
      let sectionLabel = 'Pending Placement';
      let actualSectionId: string | undefined = undefined;

      if (section && section.schoolYearId === activeSchoolYear.id) {
        gradeLabel = section.gradeLevel;
        const progSuffix = section.strand ? ` [${section.strand}]` : '';
        sectionLabel = `${section.name}${progSuffix}`;
        actualSectionId = section.id;
      } else {
        const currentEnrollment = student.enrollments?.find(e => e.schoolYear === activeSchoolYear.label);
        if (currentEnrollment) {
          gradeLabel = currentEnrollment.gradeLevel;
          sectionLabel = currentEnrollment.section || 'Unassigned Registry';
        }
      }

      if (!groups[gradeLabel]) groups[gradeLabel] = {};
      if (!groups[gradeLabel][sectionLabel]) {
        groups[gradeLabel][sectionLabel] = { students: [], sectionId: actualSectionId };
      }
      groups[gradeLabel][sectionLabel].students.push(student);
    });

    Object.keys(groups).forEach(grade => {
      Object.keys(groups[grade]).forEach(section => {
        groups[grade][section].students.sort((a, b) => {
          const genderOrder: Record<string, number> = { 'Male': 1, 'Female': 2, 'Other': 3 };
          const orderA = genderOrder[a.gender] || 4;
          const orderB = genderOrder[b.gender] || 4;
          if (orderA !== orderB) return orderA - orderB;
          return `${a.lastName}, ${a.firstName}`.toUpperCase().localeCompare(`${b.lastName}, ${b.firstName}`.toUpperCase());
        });
      });
    });

    return groups;
  }, [activeLearnersForYear, sections, activeSchoolYear]);

  const toggleGrade = (grade: string) => {
    const newExpanded = new Set(expandedGrades);
    if (newExpanded.has(grade)) newExpanded.delete(grade);
    else newExpanded.add(grade);
    setExpandedGrades(newExpanded);
  };

  const toggleSection = (sectionKey: string) => {
    const newExpanded = new Set(expandedSections);
    if (newExpanded.has(sectionKey)) newExpanded.delete(sectionKey);
    else newExpanded.add(sectionKey);
    setExpandedSections(newExpanded);
  };

  const GENDER_ORDER = ['Male', 'Female', 'Other'];

  return (
    <div className="space-y-6 animate-in fade-in duration-700">
      {/* Search Header */}
      <div className="flex flex-col md:flex-row gap-4 justify-between items-center bg-white p-6 rounded-[40px] shadow-m3-2 border border-surfaceVariant">
        <div className="relative w-full md:w-[500px] group">
          <span className="material-symbols-outlined absolute left-5 top-1/2 -translate-y-1/2 text-outline group-focus-within:text-primary transition-colors">search</span>
          <input
            type="text"
            placeholder={`Search ${activeLearnersForYear.length} learners in ${activeSchoolYear.label}...`}
            className="w-full pl-14 pr-6 py-4 rounded-[24px] bg-surface focus:outline-none focus:ring-4 focus:ring-primary/10 border-transparent transition-all font-bold text-sm"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        <div className="flex items-center gap-6 pr-4">
           <div className="text-right">
              <span className="block text-[10px] font-black text-outline uppercase tracking-widest">Active Registry</span>
              <span className="text-2xl font-black text-primary leading-none">{activeLearnersForYear.length}</span>
           </div>
        </div>
      </div>

      <div className="space-y-4 pb-20">
        {Object.keys(groupedData).length > 0 ? Object.keys(groupedData).sort((a,b) => {
          const order = Object.values(GradeLevel);
          return order.indexOf(a as GradeLevel) - order.indexOf(b as GradeLevel);
        }).map((grade) => (
          <div key={grade} className="bg-white rounded-[32px] border border-surfaceVariant overflow-hidden shadow-m3-1">
            <button 
              onClick={() => toggleGrade(grade)}
              className="w-full px-8 py-6 flex items-center justify-between bg-surface/30 hover:bg-surface/50 transition-colors border-b border-surfaceVariant group"
            >
              <div className="flex items-center gap-4">
                 <div className="w-10 h-10 rounded-2xl bg-primary flex items-center justify-center text-white shadow-lg shrink-0">
                    <span className="material-symbols-outlined text-xl transition-transform duration-300">
                      {expandedGrades.has(grade) ? 'keyboard_arrow_down' : 'keyboard_arrow_right'}
                    </span>
                 </div>
                 <div className="text-left">
                    <h3 className="text-lg font-black text-primary uppercase tracking-tight">{grade}</h3>
                    <p className="text-[10px] font-bold text-outline uppercase tracking-widest">
                      {Object.keys(groupedData[grade]).length} Active Sections
                    </p>
                 </div>
              </div>
            </button>

            {expandedGrades.has(grade) && (
              <div className="p-4 space-y-3 bg-surface/10">
                {/* FIX: Cast Object.entries to ensure data type is inferred correctly instead of unknown */}
                {(Object.entries(groupedData[grade]) as [string, { students: Student[], sectionId?: string }][]).sort((a,b) => a[0].localeCompare(b[0])).map(([sectionName, data]) => {
                  const sectionKey = grade + sectionName;
                  return (
                    <div key={sectionName} className="bg-white rounded-[24px] border border-surfaceVariant/50 overflow-hidden shadow-sm">
                      <div className="flex items-center justify-between hover:bg-primary/5 transition-colors">
                        <button 
                          onClick={() => toggleSection(sectionKey)}
                          className="flex-1 px-8 py-5 flex items-center gap-4"
                        >
                          <div className="w-8 h-8 rounded-lg bg-surface flex items-center justify-center">
                            <span className={`material-symbols-outlined text-outline transition-transform duration-300 ${expandedSections.has(sectionKey) ? 'rotate-90 text-primary' : ''}`}>
                              chevron_right
                            </span>
                          </div>
                          <span className="text-sm font-black text-primary uppercase tracking-tight">{sectionName}</span>
                          <span className="text-[10px] font-bold text-outline uppercase">— {data.students.length} Learners</span>
                        </button>
                        
                        {!isLocked && data.sectionId && (
                          <div className="pr-6">
                            <button 
                              onClick={(e) => {
                                e.stopPropagation();
                                setClearingSection({ name: sectionName, id: data.sectionId! });
                              }}
                              className="px-4 py-2 rounded-xl bg-accent/5 text-accent text-[10px] font-black uppercase hover:bg-accent hover:text-white transition-all flex items-center gap-2 border border-accent/10"
                            >
                              <span className="material-symbols-outlined text-[18px]">person_remove</span>
                              Clear Section
                            </button>
                          </div>
                        )}
                      </div>

                      {expandedSections.has(sectionKey) && (
                        <div className="overflow-x-auto border-t border-surfaceVariant/30">
                          <table className="w-full text-left">
                            <thead>
                              <tr className="bg-surface/20">
                                <th className="px-10 py-3 text-[9px] font-black uppercase text-outline tracking-widest">LRN</th>
                                <th className="px-10 py-3 text-[9px] font-black uppercase text-outline tracking-widest">Name</th>
                                <th className="px-10 py-3 text-[9px] font-black uppercase text-outline tracking-widest text-center">Sex</th>
                                <th className="px-10 py-3 text-[9px] font-black uppercase text-outline tracking-widest text-right">Actions</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-surfaceVariant/30">
                              {GENDER_ORDER.map(gender => {
                                const students = data.students.filter(s => s.gender === gender);
                                if (students.length === 0) return null;
                                return (
                                  <React.Fragment key={gender}>
                                    <tr className="bg-surface/10">
                                      <td colSpan={4} className="px-10 py-2 border-y border-surfaceVariant/10">
                                        <span className="text-[9px] font-black uppercase text-outline tracking-widest">{gender} — {students.length}</span>
                                      </td>
                                    </tr>
                                    {students.map(student => (
                                      <tr key={student.id} className="hover:bg-primary/5 transition-colors group">
                                        <td className="px-10 py-4 font-mono text-xs font-bold text-primary">{student.lrn}</td>
                                        <td className="px-10 py-4">
                                          <div className="text-sm font-black text-onSurface uppercase tracking-tighter">{student.lastName}, {student.firstName} {student.middleName || ''}</div>
                                        </td>
                                        <td className="px-10 py-4 text-center">
                                          <span className={`text-[8px] font-black px-3 py-1 rounded-full border uppercase tracking-widest ${student.gender === 'Male' ? 'bg-blue-50 text-blue-700' : 'bg-pink-50 text-pink-700'}`}>
                                            {student.gender}
                                          </span>
                                        </td>
                                        <td className="px-10 py-4 text-right">
                                          <div className="flex justify-end gap-2">
                                            <button onClick={() => setSelectedStudent(student)} className="w-8 h-8 rounded-lg border border-surfaceVariant text-outline hover:text-primary transition-all flex items-center justify-center">
                                              <span className="material-symbols-outlined text-[18px]">visibility</span>
                                            </button>
                                            {!isLocked && (
                                              <button onClick={() => setDeletingStudent(student)} className="w-8 h-8 rounded-lg bg-accent/5 text-accent opacity-0 group-hover:opacity-100 transition-all flex items-center justify-center">
                                                <span className="material-symbols-outlined text-[18px]">delete</span>
                                              </button>
                                            )}
                                          </div>
                                        </td>
                                      </tr>
                                    ))}
                                  </React.Fragment>
                                );
                              })}
                            </tbody>
                          </table>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )) : (
          <div className="py-40 text-center opacity-30 flex flex-col items-center gap-6">
            <span className="material-symbols-outlined text-8xl">group_off</span>
            <p className="font-black text-sm uppercase tracking-widest">No learners registered for this year</p>
          </div>
        )}
      </div>

      {/* Modals */}
      <ConfirmationModal
        isOpen={!!deletingStudent}
        type="danger"
        title="Remove Learner"
        message={`Delete ${deletingStudent?.lastName}, ${deletingStudent?.firstName} from the central registry?`}
        onConfirm={async () => {
          if (deletingStudent) await removeLearner(deletingStudent.id);
          setDeletingStudent(null);
        }}
        onCancel={() => setDeletingStudent(null)}
        isLoading={loading}
      />

      <ConfirmationModal
        isOpen={!!clearingSection}
        type="accent"
        title="Purge Section List"
        message={`Remove ALL learners currently enrolled in "${clearingSection?.name}"? The section itself will remain, but the registry will be cleared.`}
        onConfirm={async () => {
          if (clearingSection) await clearSectionLearners(clearingSection.id);
          setClearingSection(null);
        }}
        onCancel={() => setClearingSection(null)}
        isLoading={loading}
      />
      
      <LearnerDetailsModal 
        student={selectedStudent} 
        history={derivedHistory} 
        onClose={() => setSelectedStudent(null)} 
      />
    </div>
  );
};

export default LearnerList;

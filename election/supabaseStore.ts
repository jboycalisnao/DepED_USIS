
import { useState, useEffect } from 'react';
import { Student, SchoolYear, EnrollmentStatus, GradeLevel, Section, Candidate, ElectionConfig, ElectionStatus, Position } from './types';
import { SCHOOL_YEARS as FALLBACK_SY, MOCK_STUDENTS } from './constants';
import { supabase } from './lib/supabase';
import { getBase64Size } from './utils/imageUtils';

let learners: Student[] = []; 
let sections: Section[] = [];
let dbSchoolYears: SchoolYear[] = [];
let activeSchoolYear: SchoolYear = FALLBACK_SY[0];
let activeGradeLevels: GradeLevel[] = Object.values(GradeLevel);
let hasConnectionError = false;
let totalEgressSaved = 0;
let isLoading = false;
let isOnline = true;

let learnersListeners: Array<(l: Student[]) => void> = [];
let sectionsListeners: Array<(s: Section[]) => void> = [];
let syListListeners: Array<(syl: SchoolYear[]) => void> = [];
let activeSyListeners: Array<(sy: SchoolYear) => void> = [];
let glListeners: Array<(gl: GradeLevel[]) => void> = [];
let connectionListeners: Array<(err: boolean) => void> = [];
let egressListeners: Array<(val: number) => void> = [];
let loadingListeners: Array<(l: boolean) => void> = [];
let onlineListeners: Array<(status: boolean) => void> = [];

const CACHE_KEYS = {
  LEARNERS: 'eboto_cache_learners_',
  SECTIONS: 'eboto_cache_sections_',
  STATS: 'eboto_egress_saved'
};

const updateEgressSaved = (bytes: number) => {
  totalEgressSaved += bytes;
  localStorage.setItem(CACHE_KEYS.STATS, totalEgressSaved.toString());
  egressListeners.forEach(l => l(totalEgressSaved));
};

const setLoading = (val: boolean) => {
  isLoading = val;
  loadingListeners.forEach(l => l(isLoading));
};

const setOnline = (val: boolean) => {
  isOnline = val;
  onlineListeners.forEach(l => l(isOnline));
};

const setConnectionError = (val: boolean) => {
  hasConnectionError = val;
  connectionListeners.forEach(l => l(hasConnectionError));
};

// Monitor Network Status
window.addEventListener('online', () => setOnline(true));
window.addEventListener('offline', () => setOnline(false));

const mapDbToCandidate = (c: any, voteCount: number = 0): Candidate => ({
  id: c.id,
  name: c.name,
  firstName: c.first_name,
  lastName: c.last_name,
  middleName: c.middle_name,
  extensionName: c.extension_name,
  position: c.position as Position,
  gradeLevel: c.grade_level as GradeLevel,
  party: c.party,
  imageUrl: c.image_url,
  vision: c.vision,
  votes: voteCount,
  remarks: c.remarks,
  gender: c.gender,
  age: c.age,
  birthDate: c.birth_date,
  email: c.email,
  mobileNo: c.mobile_no,
  landline: c.landline,
  homeAddress: c.home_address,
  fatherName: c.father_name,
  motherName: c.mother_name
});

const mapCandidateToDb = (c: Partial<Candidate>) => {
  const dbObj: any = {};
  if (c.name !== undefined) dbObj.name = c.name;
  if (c.firstName !== undefined) dbObj.first_name = c.firstName;
  if (c.lastName !== undefined) dbObj.last_name = c.lastName;
  if (c.middleName !== undefined) dbObj.middle_name = c.middleName;
  if (c.extensionName !== undefined) dbObj.extension_name = c.extensionName;
  if (c.position !== undefined) dbObj.position = c.position;
  if (c.gradeLevel !== undefined) dbObj.grade_level = c.gradeLevel;
  if (c.party !== undefined) dbObj.party = c.party;
  if (c.imageUrl !== undefined) dbObj.image_url = c.imageUrl;
  if (c.vision !== undefined) dbObj.vision = c.vision;
  if (c.remarks !== undefined) dbObj.remarks = c.remarks;
  if (c.gender !== undefined) dbObj.gender = c.gender;
  if (c.age !== undefined) dbObj.age = c.age;
  if (c.birthDate !== undefined) dbObj.birth_date = c.birthDate;
  if (c.email !== undefined) dbObj.email = c.email;
  if (c.mobileNo !== undefined) dbObj.mobile_no = c.mobileNo;
  if (c.landline !== undefined) dbObj.landline = c.landline;
  if (c.homeAddress !== undefined) dbObj.home_address = c.homeAddress;
  if (c.fatherName !== undefined) dbObj.father_name = c.fatherName;
  if (c.motherName !== undefined) dbObj.mother_name = c.motherName;
  return dbObj;
};

const fetchLearners = async (schoolYearId: string) => {
  setLoading(true);
  const cacheKey = `${CACHE_KEYS.LEARNERS}${schoolYearId}`;
  const cached = localStorage.getItem(cacheKey);
  
  if (cached) {
    const data = JSON.parse(cached);
    learners = data;
    learnersListeners.forEach(l => l(learners));
    updateEgressSaved(new TextEncoder().encode(cached).length);
    setLoading(false);
    return;
  }

  const { data: sySections, error: secError } = await supabase
    .from('sections')
    .select('id')
    .eq('school_year_id', schoolYearId);
  
  if (secError) {
    setConnectionError(true);
    setLoading(false);
    return;
  }

  const sectionIds = (sySections || []).map(s => s.id);
  if (sectionIds.length === 0) {
    learners = [];
    learnersListeners.forEach(l => l(learners));
    setLoading(false);
    return;
  }

  const { data, error } = await supabase
    .from('learners')
    .select('*')
    .in('section_id', sectionIds);

  if (error) {
    setConnectionError(true);
  } else if (data) {
    const sanitized = data.map(l => ({
      id: l.id,
      lrn: l.lrn,
      firstName: l.first_name,
      lastName: l.last_name,
      middleName: l.middle_name,
      gender: l.gender, 
      status: l.status as EnrollmentStatus,
      sectionId: l.section_id,
      isSSLG: l.is_sslg || false
    })) as Student[];
    
    learners = sanitized;
    localStorage.setItem(cacheKey, JSON.stringify(sanitized));
    learnersListeners.forEach(l => l(learners));
    setConnectionError(false);
  }
  setLoading(false);
};

const fetchSections = async (schoolYearId: string) => {
  setLoading(true);
  const cacheKey = `${CACHE_KEYS.SECTIONS}${schoolYearId}`;
  const cached = localStorage.getItem(cacheKey);
  
  if (cached) {
    sections = JSON.parse(cached);
    sectionsListeners.forEach(l => l(sections));
    updateEgressSaved(new TextEncoder().encode(cached).length);
    setLoading(false);
    return;
  }

  const { data, error } = await supabase
    .from('sections')
    .select('*')
    .eq('school_year_id', schoolYearId);

  if (error) {
    setConnectionError(true);
  } else if (data) {
    const sanitized = data.map(s => ({
      id: s.id,
      name: s.name,
      gradeLevel: s.grade_level as GradeLevel,
      adviserName: s.adviser_name,
      strand: s.strand,
      schoolYearId: s.school_year_id
    })) as Section[];
    
    sections = sanitized;
    localStorage.setItem(cacheKey, JSON.stringify(sanitized));
    sectionsListeners.forEach(l => l(sections));
    setConnectionError(false);
  }
  setLoading(false);
};

const fetchSchoolYears = async () => {
  const { data, error } = await supabase.from('school_years').select('*').order('label', { ascending: false });
  if (error) {
    setConnectionError(true);
  } else if (data) {
    dbSchoolYears = data.map(sy => ({
      id: sy.id,
      label: sy.label,
      isActive: sy.is_active
    }));
    const active = dbSchoolYears.find(sy => sy.isActive);
    if (active) {
      activeSchoolYear = active;
      activeSyListeners.forEach(l => l(activeSchoolYear));
      fetchSections(active.id);
      fetchLearners(active.id);
    }
    syListListeners.forEach(l => l(dbSchoolYears));
    setConnectionError(false);
  }
};

fetchSchoolYears();

export const useStore = () => {
  const [currentLearners, setCurrentLearners] = useState<Student[]>(learners);
  const [currentSections, setCurrentSections] = useState<Section[]>(sections);
  const [currentSY, setCurrentSY] = useState<SchoolYear>(activeSchoolYear);
  const [currentSYList, setCurrentSYList] = useState<SchoolYear[]>(dbSchoolYears);
  const [egressSaved, setEgressSaved] = useState<number>(Number(localStorage.getItem(CACHE_KEYS.STATS) || 0));
  const [loading, setHookLoading] = useState(isLoading);
  const [online, setHookOnline] = useState(isOnline);
  const [connError, setHookConnError] = useState(hasConnectionError);

  useEffect(() => {
    const lListener = (newList: Student[]) => setCurrentLearners([...newList]);
    const sListener = (newSecs: Section[]) => setCurrentSections([...newSecs]);
    const syListener = (newSY: SchoolYear) => setCurrentSY(newSY);
    const syListListener = (newSYList: SchoolYear[]) => setCurrentSYList([...newSYList]);
    const eListener = (val: number) => setEgressSaved(val);
    const loadListener = (val: boolean) => setHookLoading(val);
    const onListener = (status: boolean) => setHookOnline(status);
    const connListener = (err: boolean) => setHookConnError(err);
    
    learnersListeners.push(lListener);
    sectionsListeners.push(sListener);
    activeSyListeners.push(syListener);
    syListListeners.push(syListListener);
    egressListeners.push(eListener);
    loadingListeners.push(loadListener);
    onlineListeners.push(onListener);
    connectionListeners.push(connListener);
    
    return () => {
      learnersListeners = learnersListeners.filter(l => l !== lListener);
      sectionsListeners = sectionsListeners.filter(l => l !== sListener);
      activeSyListeners = activeSyListeners.filter(l => l !== syListener);
      syListListeners = syListListeners.filter(l => l !== syListListener);
      egressListeners = egressListeners.filter(l => l !== eListener);
      loadingListeners = loadingListeners.filter(l => l !== loadListener);
      onlineListeners = onlineListeners.filter(l => l !== onListener);
      connectionListeners = connectionListeners.filter(l => l !== connListener);
    };
  }, []);

  const fetchCandidates = async (syId?: string): Promise<{ candidates: Candidate[], turnoutByPosition: Record<string, number> }> => {
    const targetSyId = syId || currentSY.id;
    
    const { data: candidatesData, error: candError } = await supabase
      .from('candidates')
      .select('*')
      .eq('school_year_id', targetSyId);

    let allBallotEntries: any[] = [];
    let from = 0;
    let to = 999;
    let finished = false;

    while (!finished) {
      const { data: votesBatch, error: voteError } = await supabase
        .from('ballot_entries')
        .select('candidate_id, position, voter_lrn')
        .eq('school_year_id', targetSyId)
        .range(from, to);

      if (voteError) {
        setConnectionError(true);
        finished = true;
      } else if (votesBatch) {
        allBallotEntries = [...allBallotEntries, ...votesBatch];
        if (votesBatch.length < 1000) {
          finished = true;
        } else {
          from += 1000;
          to += 1000;
        }
      }
    }

    if (!candError) {
      setConnectionError(false);
    }

    const candidateVotes: Record<string, number> = {};
    const turnoutCounts: Record<string, number> = {};

    // IDEMPOTENT MULTI-SEAT TALLYING
    const voterPositionSelections = new Map<string, Map<string, string[]>>();

    allBallotEntries.forEach(entry => {
      if (!voterPositionSelections.has(entry.voter_lrn)) {
        voterPositionSelections.set(entry.voter_lrn, new Map());
      }
      
      const posMap = voterPositionSelections.get(entry.voter_lrn)!;
      if (!posMap.has(entry.position)) {
        posMap.set(entry.position, []);
      }

      const selected = posMap.get(entry.position)!;
      const posLower = entry.position.toLowerCase();
      
      // REFINED RULE: Multi-seat (2) for regular Reps, but SINGLE (1) for STE and SPA.
      const isMultiSeatRep = posLower.includes('representative') && 
                             !posLower.includes('ste') && 
                             !posLower.includes('spa');
      const limit = isMultiSeatRep ? 2 : 1;

      if (selected.length < limit && !selected.includes(entry.candidate_id)) {
        selected.push(entry.candidate_id);
        candidateVotes[entry.candidate_id] = (candidateVotes[entry.candidate_id] || 0) + 1;
        
        if (selected.length === 1) {
          turnoutCounts[entry.position] = (turnoutCounts[entry.position] || 0) + 1;
        }
      }
    });

    const candidateList = (candidatesData || []).map((c: any) => {
      const votes = candidateVotes[c.id] || 0;
      return mapDbToCandidate(c, votes);
    });

    return { candidates: candidateList, turnoutByPosition: turnoutCounts };
  };

  const fetchElectionConfig = async (): Promise<ElectionConfig> => {
    const { data, error } = await supabase.from('election_config').select('*').eq('id', 1).single();
    if (error) {
       console.error("Config fetch error:", error);
       setConnectionError(true);
    }
    return {
      status: data?.status as ElectionStatus || ElectionStatus.MANUAL_OPEN,
      startTime: data?.start_time || null,
      endTime: data?.end_time || null,
      schoolName: data?.school_name || 'Leon National High School',
      publicResultsEnabled: data?.public_results_enabled ?? false,
      publicTurnoutEnabled: data?.public_turnout_enabled ?? false
    };
  };

  const saveElectionConfig = async (config: ElectionConfig) => {
    setLoading(true);
    const { error } = await supabase.from('election_config').update({
      status: config.status,
      start_time: config.startTime,
      end_time: config.endTime,
      school_name: config.schoolName,
      public_results_enabled: config.publicResultsEnabled,
      public_turnout_enabled: config.publicTurnoutEnabled
    }).eq('id', 1);

    if (error) {
      console.error("Config persistence failed:", error);
      setConnectionError(true);
    } else {
      setConnectionError(false);
    }
    setLoading(false);
  };

  const submitBallot = async (lrn: string, selections: Record<string, string[]>, schoolYearId: string) => {
    const ballotLines: any[] = [];
    
    Object.entries(selections).forEach(([pos, ids]) => {
      if (Array.isArray(ids)) {
        ids.forEach(cid => {
          if (cid) {
            ballotLines.push({
              voter_lrn: lrn,
              candidate_id: cid,
              position: pos,
              school_year_id: schoolYearId
            });
          }
        });
      }
    });

    const alreadyVoted = await checkIfVoted(lrn, schoolYearId);
    if (alreadyVoted) {
      throw new Error("Duplicate submission blocked. Voter has already participated.");
    }

    const [res1, res2] = await Promise.all([
      supabase.from('voter_participation').insert([{ lrn, school_year_id: schoolYearId }]),
      ballotLines.length > 0 ? supabase.from('ballot_entries').insert(ballotLines) : Promise.resolve({ error: null })
    ]);

    if (res1.error || res2.error) {
      setConnectionError(true);
      throw res1.error || res2.error;
    }
  };

  const addCandidateToDb = async (candidate: Partial<Candidate>, schoolYearId: string) => {
    const dbPayload = {
      ...mapCandidateToDb(candidate),
      school_year_id: schoolYearId
    };
    const { error } = await supabase.from('candidates').insert([dbPayload]);
    if (error) setConnectionError(true);
  };

  const updateCandidateInDb = async (id: string, candidate: Partial<Candidate>) => {
    const dbPayload = mapCandidateToDb(candidate);
    const { error } = await supabase.from('candidates').update(dbPayload).eq('id', id);
    if (error) setConnectionError(true);
  };

  const deleteCandidateFromDb = async (id: string) => {
    const { error } = await supabase.from('candidates').delete().eq('id', id);
    if (error) setConnectionError(true);
  };

  const fetchVoterBallot = async (lrn: string, syId: string) => {
    const { data, error } = await supabase.from('ballot_entries').select('position, candidate_id, candidates(name)').eq('voter_lrn', lrn).eq('school_year_id', syId);
    if (error) setConnectionError(true);
    return data || [];
  };

  const deleteVoterBallot = async (lrn: string, syId: string) => {
    const [res1, res2] = await Promise.all([
      supabase.from('ballot_entries').delete().eq('voter_lrn', lrn).eq('school_year_id', syId),
      supabase.from('voter_participation').delete().eq('lrn', lrn).eq('school_year_id', syId)
    ]);
    if (res1.error || res2.error) setConnectionError(true);
  };

  const fetchParticipation = async (syId: string) => {
    const { data, error } = await supabase.from('voter_participation').select('lrn').eq('school_year_id', syId);
    if (error) setConnectionError(true);
    return (data || []).map(d => d.lrn);
  };

  const fetchPartylists = async (syId: string) => {
    const { data, error } = await supabase.from('partylists').select('*').eq('school_year_id', syId);
    if (error) setConnectionError(true);
    return data || [];
  };

  const addPartylist = async (name: string, slogan: string, syId: string) => {
    const { error } = await supabase.from('partylists').insert([{ name, slogan, school_year_id: syId }]);
    if (error) setConnectionError(true);
  };

  const updatePartylist = async (id: string, name: string, slogan: string) => {
    const { error } = await supabase.from('partylists').update({ name, slogan }).eq('id', id);
    if (error) setConnectionError(true);
  };

  const deletePartylist = async (id: string) => {
    const { error } = await supabase.from('partylists').delete().eq('id', id);
    if (error) setConnectionError(true);
  };

  const checkIfVoted = async (lrn: string, syId: string) => {
    const { data, error } = await supabase
      .from('voter_participation')
      .select('lrn')
      .eq('lrn', lrn)
      .eq('school_year_id', syId)
      .maybeSingle();
    if (error) setConnectionError(true);
    return !!data;
  };

  const resetAllElectionData = async (syId: string) => {
    const [res1, res2] = await Promise.all([
      supabase.from('ballot_entries').delete().eq('school_year_id', syId),
      supabase.from('voter_participation').delete().eq('school_year_id', syId)
    ]);
    if (res1.error || res2.error) setConnectionError(true);
  };

  const setActiveSchoolYear = async (syId: string) => {
    const sy = dbSchoolYears.find(s => s.id === syId);
    if (sy) {
      activeSchoolYear = sy;
      activeSyListeners.forEach(l => l(activeSchoolYear));
      await Promise.all([
        fetchSections(sy.id),
        fetchLearners(sy.id)
      ]);
    }
  };

  return { 
    learners: currentLearners, 
    sections: currentSections,
    activeSchoolYear: currentSY, 
    schoolYears: currentSYList,
    egressSaved,
    loading,
    online,
    connError,
    fetchCandidates,
    fetchElectionConfig,
    saveElectionConfig,
    submitBallot,
    addCandidateToDb,
    updateCandidateInDb,
    deleteCandidateFromDb,
    fetchVoterBallot,
    deleteVoterBallot,
    fetchParticipation,
    fetchPartylists,
    addPartylist,
    updatePartylist,
    deletePartylist,
    checkIfVoted,
    resetAllElectionData,
    setActiveSchoolYear
  };
};

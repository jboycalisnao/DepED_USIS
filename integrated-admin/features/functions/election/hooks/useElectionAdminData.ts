import { useEffect, useMemo, useState } from 'react';
import { useStore } from '../../../../../election/supabaseStore';
import {
  Candidate,
  ElectionConfig,
  ElectionStatus,
  User,
} from '../../../../../election/types';

const DEFAULT_ELECTION_CONFIG: ElectionConfig = {
  status: ElectionStatus.MANUAL_OPEN,
  startTime: null,
  endTime: null,
  schoolName: 'Leon National High School',
  electionName: 'Learner Government Election',
  publicResultsEnabled: false,
  publicTurnoutEnabled: false,
  allowedGradeLevel: null,
};

export function useElectionAdminData() {
  const store = useStore();
  const [candidates, setCandidates] = useState<Candidate[]>([]);
  const [turnoutByPosition, setTurnoutByPosition] = useState<Record<string, number>>({});
  const [votedLrns, setVotedLrns] = useState<string[]>([]);
  const [electionConfig, setElectionConfig] = useState<ElectionConfig>(DEFAULT_ELECTION_CONFIG);
  const [isLoading, setIsLoading] = useState(true);

  const refresh = async () => {
    try {
      const activeSyId = store.activeSchoolYear?.id;
      if (!activeSyId) {
        setCandidates([]);
        setTurnoutByPosition({});
        setVotedLrns([]);
        setElectionConfig(DEFAULT_ELECTION_CONFIG);
        return;
      }

      const [candidateResponse, config, participation] = await Promise.all([
        store.fetchCandidates(),
        store.fetchElectionConfig(),
        store.fetchParticipation(activeSyId),
      ]);

      setCandidates(candidateResponse.candidates || []);
      setTurnoutByPosition(candidateResponse.turnoutByPosition || {});
      setElectionConfig(
        config || {
          ...DEFAULT_ELECTION_CONFIG,
          schoolName: store.activeSchoolYear?.label ? 'Leon National High School' : DEFAULT_ELECTION_CONFIG.schoolName,
        },
      );
      setVotedLrns(participation || []);
    } catch {
      setCandidates([]);
      setTurnoutByPosition({});
      setVotedLrns([]);
      setElectionConfig(DEFAULT_ELECTION_CONFIG);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    setIsLoading(true);
    void refresh();
  }, [store.activeSchoolYear?.id]);

  const voters: User[] = useMemo(
    () =>
      (votedLrns || []).map((lrn) => ({
        studentId: lrn,
        name: 'Verified Voter',
        hasVoted: true,
        isAdmin: false,
      })),
    [votedLrns],
  );

  const handleAddCandidate = async (candidate: Partial<Candidate>, syId: string) => {
    await store.addCandidateToDb(candidate, syId);
    await refresh();
  };

  const handleUpdateCandidate = async (id: string, candidate: Partial<Candidate>) => {
    await store.updateCandidateInDb(id, candidate);
    await refresh();
  };

  const handleDeleteCandidate = async (id: string) => {
    await store.deleteCandidateFromDb(id);
    await refresh();
  };

  const handleDeleteBallot = async (lrn: string) => {
    await store.deleteVoterBallot(lrn, store.activeSchoolYear?.id || '');
    await refresh();
  };

  const handleReset = async () => {
    await store.resetAllElectionData(store.activeSchoolYear?.id || '');
    await refresh();
  };

  const handleMigrateLegacyData = async () => {
    await store.migrateLegacyElectionData(electionConfig);
    await refresh();
  };

  const handleUpdateElectionConfig = (nextConfig: ElectionConfig) => {
    setElectionConfig(nextConfig);
    void store.saveElectionConfig(nextConfig);
  };

  return {
    candidates,
    electionConfig,
    handleAddCandidate,
    handleDeleteBallot,
    handleDeleteCandidate,
    handleMigrateLegacyData,
    handleReset,
    handleUpdateCandidate,
    handleUpdateElectionConfig,
    isLoading,
    learnerDatabase: store.learners || [],
    schoolYears: store.schoolYears || [],
    sections: store.sections || [],
    store,
    turnoutByPosition,
    voters,
    refresh,
  };
}

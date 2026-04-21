import React from 'react';
import { User, Candidate, Position, GradeLevel } from '../types';

export const DEMO_LRN = '012345678912';

export const DEMO_USER: User = {
  studentId: DEMO_LRN,
  name: 'DEMO LEARNER (SANDBOX)',
  firstName: 'DEMO',
  lastName: 'LEARNER',
  hasVoted: false,
  isAdmin: false,
  gradeLevel: 'Grade 7',
  sectionName: 'EINSTEIN (STE)',
  strand: 'STE'
};

export const DEMO_CANDIDATES: Candidate[] = [
  // --- EXECUTIVE BOARD ---
  {
    id: 'demo-pres-1',
    name: 'JOSEPH SAMPLE',
    firstName: 'JOSEPH',
    lastName: 'SAMPLE',
    position: Position.PRESIDENT,
    gradeLevel: GradeLevel.GRADE_12,
    party: 'PRO-STUDENT COALITION',
    imageUrl: 'https://picsum.photos/seed/pres1/400/400',
    vision: 'Advocating for better student facilities and more extracurricular activities.',
    votes: 0,
    gender: 'MALE', age: 18, birthDate: '2008-01-01', email: 'pres1@demo.edu.ph', mobileNo: '09000000001', homeAddress: 'SAMPLE VILLA'
  },
  {
    id: 'demo-pres-2',
    name: 'MARIA MOCKUP',
    firstName: 'MARIA',
    lastName: 'MOCKUP',
    position: Position.PRESIDENT,
    gradeLevel: GradeLevel.GRADE_12,
    party: 'INNOVATORS GUILD',
    imageUrl: 'https://picsum.photos/seed/pres2/400/400',
    vision: 'Digital transformation for student services and online transparency.',
    votes: 0,
    gender: 'FEMALE', age: 17, birthDate: '2009-05-12', email: 'pres2@demo.edu.ph', mobileNo: '09000000002', homeAddress: 'MOCKUP HEIGHTS'
  },
  {
    id: 'demo-vp-1',
    name: 'BENJAMIN TESTER',
    firstName: 'BENJAMIN',
    lastName: 'TESTER',
    position: Position.VICE_PRESIDENT,
    gradeLevel: GradeLevel.GRADE_11,
    party: 'PRO-STUDENT COALITION',
    imageUrl: 'https://picsum.photos/seed/vp1/400/400',
    vision: 'Working closely with the president to implement student-led initiatives.',
    votes: 0,
    gender: 'MALE', age: 16, birthDate: '2010-02-14', email: 'vp1@demo.edu.ph', mobileNo: '09000000003', homeAddress: 'TEST DRIVE'
  },
  {
    id: 'demo-sec-1',
    name: 'ALICE DATA',
    firstName: 'ALICE',
    lastName: 'DATA',
    position: Position.SECRETARY,
    gradeLevel: GradeLevel.GRADE_11,
    party: 'INNOVATORS GUILD',
    imageUrl: 'https://picsum.photos/seed/sec1/400/400',
    vision: 'Organized record-keeping and transparent minutes of the meeting.',
    votes: 0,
    gender: 'FEMALE', age: 16, birthDate: '2010-03-03', email: 'sec1@demo.edu.ph', mobileNo: '09000000010', homeAddress: 'DATA DRIVE'
  },
  {
    id: 'demo-treas-1',
    name: 'FINN COIN',
    firstName: 'FINN',
    lastName: 'COIN',
    position: Position.TREASURER,
    gradeLevel: GradeLevel.GRADE_10,
    party: 'PRO-STUDENT COALITION',
    imageUrl: 'https://picsum.photos/seed/treas1/400/400',
    vision: 'Accountability in every centavo and regular financial liquidation reports.',
    votes: 0,
    gender: 'MALE', age: 15, birthDate: '2011-04-04', email: 'treas1@demo.edu.ph', mobileNo: '09000000011', homeAddress: 'BANK BLVD'
  },
  {
    id: 'demo-aud-1',
    name: 'AUDREY CHECK',
    firstName: 'AUDREY',
    lastName: 'CHECK',
    position: Position.AUDITOR,
    gradeLevel: GradeLevel.GRADE_10,
    party: 'INNOVATORS GUILD',
    imageUrl: 'https://picsum.photos/seed/aud1/400/400',
    vision: 'Strict auditing of all LG properties and funds.',
    votes: 0,
    gender: 'FEMALE', age: 15, birthDate: '2011-05-05', email: 'aud1@demo.edu.ph', mobileNo: '09000000012', homeAddress: 'CHECKPOINT'
  },
  {
    id: 'demo-pio-1',
    name: 'PETER INFO',
    firstName: 'PETER',
    lastName: 'INFO',
    position: Position.PIO,
    gradeLevel: GradeLevel.GRADE_9,
    party: 'PRO-STUDENT COALITION',
    imageUrl: 'https://picsum.photos/seed/pio1/400/400',
    vision: 'Bridging the information gap via social media and school bulletin boards.',
    votes: 0,
    gender: 'MALE', age: 14, birthDate: '2012-06-06', email: 'pio1@demo.edu.ph', mobileNo: '09000000013', homeAddress: 'INFO LANE'
  },
  {
    id: 'demo-proto-1',
    name: 'PRISCILLA ORDER',
    firstName: 'PRISCILLA',
    lastName: 'ORDER',
    position: Position.PROTOCOL_OFFICER,
    gradeLevel: GradeLevel.GRADE_9,
    party: 'INNOVATORS GUILD',
    imageUrl: 'https://picsum.photos/seed/proto1/400/400',
    vision: 'Maintaining order and discipline during school-wide assemblies.',
    votes: 0,
    gender: 'FEMALE', age: 14, birthDate: '2012-07-07', email: 'proto1@demo.edu.ph', mobileNo: '09000000014', homeAddress: 'ORDER STREET'
  },

  // --- GRADE 8 REPRESENTATIVES (Multi-seat: 2 Choices) ---
  {
    id: 'demo-g8-1',
    name: 'CARLO EIGHT',
    firstName: 'CARLO',
    lastName: 'EIGHT',
    position: Position.GRADE_8_REP,
    gradeLevel: GradeLevel.GRADE_8,
    party: 'INNOVATORS GUILD',
    imageUrl: 'https://picsum.photos/seed/g8-1/400/400',
    vision: 'Representing the voices of our batch for the coming school year.',
    votes: 0,
    gender: 'MALE', age: 13, birthDate: '2012-03-20', email: 'g8-1@demo.edu.ph', mobileNo: '09000000004', homeAddress: 'LEVEL 8'
  },
  {
    id: 'demo-g8-2',
    name: 'DIANA OCTO',
    firstName: 'DIANA',
    lastName: 'OCTO',
    position: Position.GRADE_8_REP,
    gradeLevel: GradeLevel.GRADE_8,
    party: 'PRO-STUDENT COALITION',
    imageUrl: 'https://picsum.photos/seed/g8-2/400/400',
    vision: 'Active engagement for Grade 8 students in all school activities.',
    votes: 0,
    gender: 'FEMALE', age: 14, birthDate: '2011-09-15', email: 'g8-2@demo.edu.ph', mobileNo: '09000000005', homeAddress: 'OCTO LANE'
  },
  {
    id: 'demo-g8-3',
    name: 'EDWARD REP',
    firstName: 'EDWARD',
    lastName: 'REP',
    position: Position.GRADE_8_REP,
    gradeLevel: GradeLevel.GRADE_8,
    party: 'INNOVATORS GUILD',
    imageUrl: 'https://picsum.photos/seed/g8-3/400/400',
    vision: 'Promoting unity and collaboration among sections.',
    votes: 0,
    gender: 'MALE', age: 13, birthDate: '2012-11-11', email: 'g8-3@demo.edu.ph', mobileNo: '09000000006', homeAddress: 'REP ROAD'
  },
  {
    id: 'demo-g8-4',
    name: 'FELICITY VOTE',
    firstName: 'FELICITY',
    lastName: 'VOTE',
    position: Position.GRADE_8_REP,
    gradeLevel: GradeLevel.GRADE_8,
    party: 'PRO-STUDENT COALITION',
    imageUrl: 'https://picsum.photos/seed/g8-4/400/400',
    vision: 'Your voice is my mission. Let us make Grade 8 better.',
    votes: 0,
    gender: 'FEMALE', age: 14, birthDate: '2011-12-25', email: 'g8-4@demo.edu.ph', mobileNo: '09000000007', homeAddress: 'VOTER CIRCLE'
  },

  // --- STE REPRESENTATIVES (Single-seat: 1 Choice) ---
  {
    id: 'demo-ste-1',
    name: 'SAMUEL TECH',
    firstName: 'SAMUEL',
    lastName: 'TECH',
    position: Position.STE_REP,
    gradeLevel: GradeLevel.GRADE_10,
    party: 'INNOVATORS GUILD',
    imageUrl: 'https://picsum.photos/seed/ste1/400/400',
    vision: 'Promoting STEM excellence and research opportunities for STE students.',
    votes: 0,
    gender: 'MALE', age: 15, birthDate: '2010-06-05', email: 'ste1@demo.edu.ph', mobileNo: '09000000008', homeAddress: 'SCIENCE PARK'
  },
  {
    id: 'demo-ste-2',
    name: 'TARA SCIENCE',
    firstName: 'TARA',
    lastName: 'SCIENCE',
    position: Position.STE_REP,
    gradeLevel: GradeLevel.GRADE_10,
    party: 'PRO-STUDENT COALITION',
    imageUrl: 'https://picsum.photos/seed/ste2/400/400',
    vision: 'Bridging the gap between students and advanced laboratory equipment.',
    votes: 0,
    gender: 'FEMALE', age: 15, birthDate: '2010-08-14', email: 'ste2@demo.edu.ph', mobileNo: '09000000009', homeAddress: 'LAB TOWERS'
  }
];

export const DemoBanner: React.FC = () => (
  <div className="bg-amber-500 text-white py-2 px-4 text-center font-black text-[10px] uppercase tracking-[0.3em] sticky top-20 z-[40] shadow-lg flex items-center justify-center">
    <i className="fa-solid fa-flask-vial mr-3 animate-pulse"></i>
    Demo Mode Active: No data will be saved to the database
    <i className="fa-solid fa-flask-vial ml-3 animate-pulse"></i>
  </div>
);
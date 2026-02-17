export interface Subject {
  id: string;
  name: string;
  code: string;
  credits: number;
  icon: string; // Lucide icon name
}

export interface Semester {
  id: number;
  label: string;
  subjects: Subject[];
}

export interface YearData {
  id: number;
  label: string;
  semesters: Semester[];
}

export const academicData: YearData[] = [
  {
    id: 1,
    label: "YEAR 1",
    semesters: [
      {
        id: 1,
        label: "SEMESTER 1",
        subjects: [
          { id: "y1s1-1", name: "Engineering Mathematics I", code: "MA101", credits: 4, icon: "Calculator" },
          { id: "y1s1-2", name: "Engineering Physics", code: "PH101", credits: 3, icon: "Atom" },
          { id: "y1s1-3", name: "Programming in C", code: "CS101", credits: 4, icon: "Code" },
          { id: "y1s1-4", name: "Engineering Drawing", code: "ME101", credits: 3, icon: "PenTool" },
          { id: "y1s1-5", name: "Communication Skills", code: "HS101", credits: 2, icon: "MessageSquare" },
        ],
      },
      {
        id: 2,
        label: "SEMESTER 2",
        subjects: [
          { id: "y1s2-1", name: "Engineering Mathematics II", code: "MA102", credits: 4, icon: "Calculator" },
          { id: "y1s2-2", name: "Engineering Chemistry", code: "CH101", credits: 3, icon: "FlaskConical" },
          { id: "y1s2-3", name: "Data Structures Intro", code: "CS102", credits: 4, icon: "Database" },
          { id: "y1s2-4", name: "Basic Electronics", code: "EC101", credits: 3, icon: "Cpu" },
          { id: "y1s2-5", name: "Environmental Science", code: "ES101", credits: 2, icon: "Leaf" },
        ],
      },
    ],
  },
  {
    id: 2,
    label: "YEAR 2",
    semesters: [
      {
        id: 3,
        label: "SEMESTER 3",
        subjects: [
          { id: "y2s3-1", name: "Data Structures", code: "CS201", credits: 4, icon: "Database" },
          { id: "y2s3-2", name: "Digital Logic Design", code: "CS202", credits: 3, icon: "CircuitBoard" },
          { id: "y2s3-3", name: "Discrete Mathematics", code: "MA201", credits: 4, icon: "Binary" },
          { id: "y2s3-4", name: "OOP with Java", code: "CS203", credits: 4, icon: "Braces" },
          { id: "y2s3-5", name: "Probability & Statistics", code: "MA202", credits: 3, icon: "BarChart3" },
        ],
      },
      {
        id: 4,
        label: "SEMESTER 4",
        subjects: [
          { id: "y2s4-1", name: "Design & Analysis of Algorithms", code: "CS204", credits: 4, icon: "GitBranch" },
          { id: "y2s4-2", name: "Computer Organization", code: "CS205", credits: 3, icon: "HardDrive" },
          { id: "y2s4-3", name: "Operating Systems", code: "CS206", credits: 4, icon: "Monitor" },
          { id: "y2s4-4", name: "Linear Algebra", code: "MA203", credits: 3, icon: "Grid3x3" },
          { id: "y2s4-5", name: "Software Engineering", code: "CS207", credits: 3, icon: "Settings" },
        ],
      },
    ],
  },
  {
    id: 3,
    label: "YEAR 3",
    semesters: [
      {
        id: 5,
        label: "SEMESTER 5",
        subjects: [
          { id: "y3s5-1", name: "Database Management Systems", code: "CS301", credits: 4, icon: "Database" },
          { id: "y3s5-2", name: "Computer Networks", code: "CS302", credits: 4, icon: "Network" },
          { id: "y3s5-3", name: "Theory of Computation", code: "CS303", credits: 3, icon: "Infinity" },
          { id: "y3s5-4", name: "Machine Learning", code: "CS304", credits: 4, icon: "Brain" },
          { id: "y3s5-5", name: "Web Technologies", code: "CS305", credits: 3, icon: "Globe" },
        ],
      },
      {
        id: 6,
        label: "SEMESTER 6",
        subjects: [
          { id: "y3s6-1", name: "Compiler Design", code: "CS306", credits: 4, icon: "FileCode" },
          { id: "y3s6-2", name: "Artificial Intelligence", code: "CS307", credits: 4, icon: "Sparkles" },
          { id: "y3s6-3", name: "Cryptography", code: "CS308", credits: 3, icon: "Lock" },
          { id: "y3s6-4", name: "Cloud Computing", code: "CS309", credits: 3, icon: "Cloud" },
          { id: "y3s6-5", name: "Embedded Systems", code: "CS310", credits: 3, icon: "Microchip" },
        ],
      },
    ],
  },
  {
    id: 4,
    label: "YEAR 4",
    semesters: [
      {
        id: 7,
        label: "SEMESTER 7",
        subjects: [
          { id: "y4s7-1", name: "Deep Learning", code: "CS401", credits: 4, icon: "Layers" },
          { id: "y4s7-2", name: "Distributed Systems", code: "CS402", credits: 4, icon: "Server" },
          { id: "y4s7-3", name: "Natural Language Processing", code: "CS403", credits: 3, icon: "Languages" },
          { id: "y4s7-4", name: "Blockchain Technology", code: "CS404", credits: 3, icon: "Link" },
          { id: "y4s7-5", name: "Capstone Project I", code: "CS490", credits: 4, icon: "Rocket" },
        ],
      },
      {
        id: 8,
        label: "SEMESTER 8",
        subjects: [
          { id: "y4s8-1", name: "Quantum Computing", code: "CS405", credits: 3, icon: "Atom" },
          { id: "y4s8-2", name: "Cyber Security", code: "CS406", credits: 3, icon: "ShieldCheck" },
          { id: "y4s8-3", name: "Ethics in AI", code: "HS401", credits: 2, icon: "Scale" },
          { id: "y4s8-4", name: "Capstone Project II", code: "CS491", credits: 6, icon: "Rocket" },
        ],
      },
    ],
  },
];

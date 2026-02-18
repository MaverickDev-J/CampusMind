"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import Header from "@/app/components/Header";
import {
    Search,
    Filter,
    BookOpen,
    Video,
    FileText,
    Beaker,
    Clock,
    TrendingUp,
    Users,
    Download,
    ChevronDown,
    ChevronRight,
    Star,
    MoreVertical,
    Plus,
    X,
    Upload,
    Image,
    PlayCircle,
    File
} from "lucide-react";

// Types
type ResourceType = "Notes" | "Video" | "Paper" | "Lab";

interface Resource {
    id: string;
    title: string;
    subject: string;
    author: string;
    type: ResourceType;
    year: string;
    branch: string;
    downloads: number;
    rating: number;
    thumbnail: string;
}

// Mock Data
const RESOURCES: Resource[] = [
    {
        id: "1",
        title: "Advanced Data Structures & Algorithms",
        subject: "CS-3 • AI",
        author: "Dr. Sharma",
        type: "Notes",
        year: "TE",
        branch: "CS",
        downloads: 1240,
        rating: 4.8,
        thumbnail: "bg-gradient-to-br from-blue-900 to-slate-900"
    },
    {
        id: "2",
        title: "Quantum Computing Fundamentals",
        subject: "CS-5 • QC",
        author: "Prof. Davis",
        type: "Video",
        year: "BE",
        branch: "CS",
        downloads: 850,
        rating: 4.9,
        thumbnail: "bg-gradient-to-br from-purple-900 to-slate-900"
    },
    {
        id: "3",
        title: "Neural Networks Lab Manual",
        subject: "AI-DS • DL",
        author: "Rahul K.",
        type: "Lab",
        year: "TE",
        branch: "AI-DS",
        downloads: 2100,
        rating: 4.7,
        thumbnail: "bg-gradient-to-br from-emerald-900 to-slate-900"
    },
    {
        id: "4",
        title: "DBMS Internals Research Paper",
        subject: "IT-4 • DB",
        author: "Sarah M.",
        type: "Paper",
        year: "TE",
        branch: "IT",
        downloads: 560,
        rating: 4.5,
        thumbnail: "bg-gradient-to-br from-indigo-900 to-slate-900"
    },
    {
        id: "5",
        title: "Operating Systems Concepts",
        subject: "CS-4 • OS",
        author: "Dr. Paterson",
        type: "Notes",
        year: "SE",
        branch: "CS",
        downloads: 3200,
        rating: 4.9,
        thumbnail: "bg-gradient-to-br from-orange-900 to-slate-900"
    }
];

const NOTEBOOKS = [
    {
        id: "1",
        title: "Quantum Mechanics Notes",
        lastModified: "Dec 29",
        thumbnail: "bg-gradient-to-br from-indigo-900 to-slate-900",
        chats: 12
    },
    {
        id: "2",
        title: "Advanced AI Project",
        lastModified: "Dec 19",
        thumbnail: "bg-gradient-to-br from-purple-900 to-slate-900",
        chats: 8
    },
    {
        id: "3",
        title: "Data Structures Revision",
        lastModified: "Dec 15",
        thumbnail: "bg-gradient-to-br from-blue-900 to-slate-900",
        chats: 24
    },
    {
        id: "4",
        title: "Operating Systems Lab",
        lastModified: "Dec 10",
        thumbnail: "bg-gradient-to-br from-emerald-900 to-slate-900",
        chats: 5
    },
    {
        id: "5",
        title: "History of Computing",
        lastModified: "Nov 28",
        thumbnail: "bg-gradient-to-br from-orange-900 to-slate-900",
        chats: 3
    }
];

const FILTER_SECTIONS = [
    {
        id: "year",
        name: "Year",
        options: ["FE", "SE", "TE", "BE"]
    },
    {
        id: "branch",
        name: "Branch",
        options: ["CS", "IT", "AI-DS", "EXTC", "MECH"]
    },
    {
        id: "type",
        name: "Type",
        options: ["Notes", "Video", "Paper", "Lab"]
    }
];

export default function DeepBasePage() {
    const [activeTab, setActiveTab] = useState<"all" | "notebook">("all");
    const [selectedFilters, setSelectedFilters] = useState<Record<string, string[]>>({});
    const [openSections, setOpenSections] = useState<Record<string, boolean>>({
        year: true,
        branch: true,
        type: true
    });

    const toggleSection = (id: string) => {
        setOpenSections(prev => ({ ...prev, [id]: !prev[id] }));
    };

    const toggleFilter = (sectionId: string, option: string) => {
        setSelectedFilters(prev => {
            const current = prev[sectionId] || [];
            const updated = current.includes(option)
                ? current.filter(item => item !== option)
                : [...current, option];
            return { ...prev, [sectionId]: updated };
        });
    };

    // Card Component
    const ResourceCard = ({ resource }: { resource: Resource }) => {
        const Icon = {
            "Notes": BookOpen,
            "Video": Video,
            "Paper": FileText,
            "Lab": Beaker
        }[resource.type];

        return (
            <motion.div
                whileHover={{ y: -4, scale: 1.02 }}
                className="group relative bg-[#0f1523] border border-slate-800 rounded-xl overflow-hidden hover:border-indigo-500/50 hover:shadow-xl hover:shadow-indigo-500/10 transition-all cursor-pointer"
            >
                {/* Thumbnail */}
                <div className={`h-32 w-full ${resource.thumbnail} relative p-4 flex flex-col justify-end`}>
                    <div className="absolute top-2 right-2 px-2 py-1 rounded-md bg-black/40 backdrop-blur-sm text-[10px] font-medium text-white flex items-center gap-1">
                        <Star className="w-3 h-3 fill-yellow-400 text-yellow-400" />
                        {resource.rating}
                    </div>
                    <span className="inline-block px-2 py-1 rounded bg-black/40 backdrop-blur-sm text-[10px] font-bold text-white w-fit mb-1">
                        {resource.subject}
                    </span>
                    <h3 className="text-sm font-bold text-white leading-tight line-clamp-2">
                        {resource.title}
                    </h3>
                </div>

                {/* Details */}
                <div className="p-3">
                    <div className="flex items-center justify-between text-xs text-slate-400 mb-2">
                        <div className="flex items-center gap-1.5">
                            <span className="w-5 h-5 rounded-full bg-slate-800 flex items-center justify-center text-[10px] font-bold text-slate-300">
                                {resource.author[0]}
                            </span>
                            <span className="truncate max-w-[80px]">{resource.author}</span>
                        </div>
                        <div className="flex items-center gap-1 px-1.5 py-0.5 rounded bg-indigo-500/10 text-indigo-400">
                            <Icon className="w-3 h-3" />
                            <span className="uppercase text-[10px] font-bold">{resource.type}</span>
                        </div>
                    </div>
                </div>
            </motion.div>
        );
    };

    const NotebookCard = ({ notebook }: { notebook: typeof NOTEBOOKS[0] }) => (
        <motion.div
            whileHover={{ y: -4, scale: 1.02 }}
            className="group relative bg-[#0f1523] border border-slate-800 rounded-xl overflow-hidden hover:border-indigo-500/50 hover:shadow-xl hover:shadow-indigo-500/10 transition-all cursor-pointer flex flex-col"
        >
            <div className={`h-28 w-full ${notebook.thumbnail} relative`}>
                <div className="absolute inset-0 bg-black/20" />
                <div className="absolute top-2 left-2 px-2 py-1 rounded bg-black/40 backdrop-blur-sm text-[10px] font-bold text-slate-200">
                    Private
                </div>
            </div>
            <div className="p-4 flex-1 flex flex-col">
                <h3 className="text-sm font-bold text-white mb-1">{notebook.title}</h3>
                <p className="text-[10px] text-slate-500 mb-4">Last modified {notebook.lastModified}</p>

                <div className="mt-auto flex items-center justify-between">
                    <span className="text-[10px] text-slate-400 flex items-center gap-1">
                        <Users className="w-3 h-3" /> {notebook.chats} chats
                    </span>
                    <button className="p-1.5 rounded-lg bg-indigo-500/10 text-indigo-400 hover:bg-indigo-500 hover:text-white transition-colors">
                        <TrendingUp className="w-4 h-4" />
                    </button>
                </div>
            </div>
        </motion.div>
    );

    const [showUploadModal, setShowUploadModal] = useState(false);
    const [selectedFileFormat, setSelectedFileFormat] = useState<"pdf" | "image" | "video">("pdf");

    return (
        <div className="flex flex-col h-screen w-full bg-[#0a0e1a] text-slate-200 overflow-hidden">
            <Header />

            {/* Create Notebook Modal */}
            <AnimatePresence>
                {showUploadModal && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
                    >
                        <motion.div
                            initial={{ scale: 0.95, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            exit={{ scale: 0.95, opacity: 0 }}
                            className="w-full max-w-2xl bg-[#0f1523] border border-slate-700/50 rounded-2xl shadow-2xl overflow-hidden"
                        >
                            {/* Modal Header */}
                            <div className="flex items-center justify-between p-4 border-b border-slate-800/50">
                                <h2 className="text-lg font-bold text-white">Create New Notebook</h2>
                                <button
                                    onClick={() => setShowUploadModal(false)}
                                    className="text-slate-500 hover:text-slate-300 transition-colors"
                                >
                                    <X className="w-5 h-5" />
                                </button>
                            </div>

                            {/* Modal Content */}
                            <div className="p-6 space-y-6">
                                <div className="text-center mb-6">
                                    <h3 className="text-xl font-bold text-slate-200 mb-1">Upload Files & Create Notebook</h3>
                                    <p className="text-xs text-slate-500">Supported extensions: PDF, Images, Docs, Audio, Video</p>
                                </div>

                                <div className="grid grid-cols-2 gap-4">
                                    <div className="space-y-2">
                                        <label className="text-xs font-semibold text-slate-400 uppercase">Select Year</label>
                                        <div className="grid grid-cols-4 gap-2">
                                            {[1, 2, 3, 4].map(year => (
                                                <button key={year} className="py-2 rounded-lg bg-slate-800/50 border border-slate-700 text-slate-300 hover:bg-slate-700/50 hover:text-white transition-colors text-sm font-medium">
                                                    {year}
                                                </button>
                                            ))}
                                        </div>
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-xs font-semibold text-slate-400 uppercase">Select Branch</label>
                                        <select className="w-full py-2 px-3 rounded-lg bg-slate-800/50 border border-slate-700 text-slate-300 text-sm focus:outline-none focus:border-indigo-500/50">
                                            <option>Select Branch</option>
                                            <option>CS</option>
                                            <option>IT</option>
                                            <option>AI-DS</option>
                                        </select>
                                    </div>
                                </div>

                                <div className="grid grid-cols-3 gap-4">
                                    <div className="col-span-2 space-y-2">
                                        <label className="text-xs font-semibold text-slate-400 uppercase">Subject Name</label>
                                        <input
                                            type="text"
                                            placeholder="e.g. Data Structures"
                                            className="w-full py-2 px-3 rounded-lg bg-slate-800/50 border border-slate-700 text-slate-300 text-sm focus:outline-none focus:border-indigo-500/50 placeholder:text-slate-600"
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-xs font-semibold text-slate-400 uppercase">Unit/Module</label>
                                        <input
                                            type="number"
                                            defaultValue={1}
                                            className="w-full py-2 px-3 rounded-lg bg-slate-800/50 border border-slate-700 text-slate-300 text-sm focus:outline-none focus:border-indigo-500/50"
                                        />
                                    </div>
                                </div>

                                <div className="space-y-2">
                                    <label className="text-xs font-semibold text-slate-400 uppercase">Document Type</label>
                                    <div className="flex p-1 bg-slate-800/50 rounded-lg">
                                        {["Lecture", "Notes", "PYQ", "Lab", "Ref"].map(type => (
                                            <button key={type} className="flex-1 py-1.5 text-xs font-medium text-slate-400 hover:text-slate-200 hover:bg-slate-700/50 rounded-md transition-colors">
                                                {type}
                                            </button>
                                        ))}
                                    </div>
                                </div>

                                {/* File Format Selection */}
                                <div className="space-y-2">
                                    <label className="text-xs font-semibold text-slate-400 uppercase">Select File Format</label>
                                    <div className="grid grid-cols-3 gap-3">
                                        {(["pdf", "image", "video"] as const).map(format => (
                                            <button
                                                key={format}
                                                onClick={() => setSelectedFileFormat(format)}
                                                className={`flex flex-col items-center justify-center gap-2 p-3 rounded-xl border transition-all ${selectedFileFormat === format
                                                        ? "bg-indigo-600/20 border-indigo-500 text-indigo-400 shadow-lg shadow-indigo-500/10"
                                                        : "bg-slate-800/50 border-slate-700 text-slate-400 hover:bg-slate-700/50 hover:text-slate-200"
                                                    }`}
                                            >
                                                {format === "pdf" && <FileText className="w-5 h-5" />}
                                                {format === "image" && <Image className="w-5 h-5" />}
                                                {format === "video" && <PlayCircle className="w-5 h-5" />}
                                                <span className="capitalize text-xs font-bold">{format}</span>
                                            </button>
                                        ))}
                                    </div>
                                </div>

                                {/* Drag & Drop Area */}
                                <div className="border-2 border-dashed border-slate-700 bg-slate-800/20 rounded-xl p-8 flex flex-col items-center justify-center gap-3 hover:border-indigo-500/30 transition-colors group cursor-pointer">
                                    <div className="w-12 h-12 rounded-full bg-slate-800 flex items-center justify-center group-hover:bg-indigo-500/10 transition-colors">
                                        <Upload className="w-5 h-5 text-slate-400 group-hover:text-indigo-400" />
                                    </div>
                                    <div className="text-center">
                                        <p className="text-sm font-medium text-slate-300">Click to upload {selectedFileFormat}</p>
                                        <p className="text-xs text-slate-500">or drag and drop file here</p>
                                    </div>
                                </div>

                                <button className="w-full py-3 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-semibold transition-all shadow-lg shadow-indigo-500/20">
                                    Create Notebook
                                </button>
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>

            <div className="flex flex-1 overflow-hidden relative">

                {/* ── Left Sidebar: Filter Resources ──────────────── */}
                <aside className="w-64 h-full bg-[#070b14] border-r border-slate-800/50 flex flex-col shrink-0 z-20">
                    <div className="p-5 border-b border-slate-800/50">
                        <h2 className="text-sm font-semibold text-slate-200 flex items-center gap-2">
                            <Filter className="w-4 h-4 text-indigo-400" />
                            Filter Resources
                        </h2>
                    </div>

                    <div className="flex-1 overflow-y-auto p-4 space-y-6 scrollbar-thin scrollbar-thumb-slate-800">
                        {FILTER_SECTIONS.map((section) => (
                            <div key={section.id} className="space-y-3">
                                <button
                                    onClick={() => toggleSection(section.id)}
                                    className="w-full flex items-center justify-between text-xs font-semibold text-slate-500 uppercase tracking-wider hover:text-slate-300 transition-colors"
                                >
                                    {section.name}
                                    <ChevronDown
                                        className={`w-4 h-4 transition-transform ${openSections[section.id] ? "rotate-180" : ""}`}
                                    />
                                </button>

                                {openSections[section.id] && (
                                    <motion.div
                                        initial={{ height: 0, opacity: 0 }}
                                        animate={{ height: "auto", opacity: 1 }}
                                        className="space-y-1"
                                    >
                                        {section.options.map((option) => (
                                            <button
                                                key={option}
                                                onClick={() => toggleFilter(section.id, option)}
                                                className={`w-full text-left px-3 py-2 rounded-lg text-sm transition-colors flex items-center justify-between group ${selectedFilters[section.id]?.includes(option)
                                                    ? "bg-indigo-600/10 text-indigo-400 font-medium"
                                                    : "text-slate-400 hover:bg-slate-800/50 hover:text-slate-200"
                                                    }`}
                                            >
                                                {option}
                                                {selectedFilters[section.id]?.includes(option) && (
                                                    <motion.div layoutId={`check-${section.id}`} className="w-1.5 h-1.5 rounded-full bg-indigo-500" />
                                                )}
                                            </button>
                                        ))}
                                    </motion.div>
                                )}
                            </div>
                        ))}
                    </div>

                    <div className="p-4 border-t border-slate-800/50">
                        <button
                            onClick={() => setSelectedFilters({})}
                            className="w-full py-2.5 rounded-lg border border-slate-700 bg-transparent hover:bg-slate-800 text-slate-400 text-xs font-medium transition-colors"
                        >
                            Clear All Filters
                        </button>
                    </div>
                </aside>

                {/* ── Main Content Area ───────────────────────────── */}
                <main className="flex-1 overflow-y-auto p-6 lg:p-10 scrollbar-thin scrollbar-thumb-slate-800">

                    {/* Tab Switcher & Upload Button */}
                    <div className="flex items-center justify-between mb-8">
                        <div className="flex items-center gap-1 bg-slate-900/50 p-1 rounded-xl w-fit border border-slate-800">
                            <button
                                onClick={() => setActiveTab("all")}
                                className={`px-6 py-2 rounded-lg text-sm font-medium transition-all ${activeTab === "all"
                                    ? "bg-indigo-600 text-white shadow-lg shadow-indigo-500/20"
                                    : "text-slate-400 hover:text-white hover:bg-slate-800"
                                    }`}
                            >
                                All
                            </button>
                            <button
                                onClick={() => setActiveTab("notebook")}
                                className={`px-6 py-2 rounded-lg text-sm font-medium transition-all ${activeTab === "notebook"
                                    ? "bg-indigo-600 text-white shadow-lg shadow-indigo-500/20"
                                    : "text-slate-400 hover:text-white hover:bg-slate-800"
                                    }`}
                            >
                                My Notebook
                            </button>
                        </div>

                        <button
                            onClick={() => setShowUploadModal(true)}
                            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-medium transition-all shadow-lg shadow-indigo-500/20"
                        >
                            <Upload className="w-4 h-4" />
                            Upload
                        </button>
                    </div>

                    {activeTab === "all" ? (
                        <motion.div
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -10 }}
                            transition={{ duration: 0.2 }}
                        >
                            {/* Trending Section */}
                            <section className="mb-10">
                                <div className="flex items-center justify-between mb-6">
                                    <h2 className="text-lg font-bold text-white flex items-center gap-2">
                                        <TrendingUp className="w-5 h-5 text-indigo-500" />
                                        Trending in CS-3
                                    </h2>
                                    <button className="text-xs text-slate-500 hover:text-indigo-400 flex items-center gap-1 transition-colors">
                                        View All <ChevronRight className="w-3 h-3" />
                                    </button>
                                </div>
                                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-5 gap-4">
                                    {RESOURCES.map(res => <ResourceCard key={`trend-${res.id}`} resource={res} />)}
                                </div>
                            </section>

                            {/* Recently Uploaded */}
                            <section className="mb-10">
                                <div className="flex items-center justify-between mb-6">
                                    <h2 className="text-lg font-bold text-white flex items-center gap-2">
                                        <Clock className="w-5 h-5 text-emerald-500" />
                                        Recently Uploaded
                                    </h2>
                                </div>
                                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-5 gap-4">
                                    {RESOURCES.slice(0, 4).map(res => <ResourceCard key={`recent-${res.id}`} resource={res} />)}
                                </div>
                            </section>

                            {/* Faculty Uploads */}
                            <section className="mb-10">
                                <div className="flex items-center justify-between mb-6">
                                    <h2 className="text-lg font-bold text-white flex items-center gap-2">
                                        <Users className="w-5 h-5 text-purple-500" />
                                        Faculty Uploads
                                    </h2>
                                </div>
                                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-5 gap-4">
                                    {RESOURCES.slice(2, 5).map(res => <ResourceCard key={`faculty-${res.id}`} resource={res} />)}
                                </div>
                            </section>

                            {/* Student Notes */}
                            <section>
                                <div className="flex items-center justify-between mb-6">
                                    <h2 className="text-lg font-bold text-white flex items-center gap-2">
                                        <FileText className="w-5 h-5 text-blue-500" />
                                        Student Notes
                                    </h2>
                                </div>
                                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-5 gap-4">
                                    {RESOURCES.slice(0, 3).map(res => <ResourceCard key={`student-${res.id}`} resource={res} />)}
                                </div>
                            </section>
                        </motion.div>
                    ) : (
                        <motion.div
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -10 }}
                            transition={{ duration: 0.2 }}
                            className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-5 gap-4"
                        >
                            <motion.button
                                onClick={() => setShowUploadModal(true)}
                                whileHover={{ scale: 1.02, backgroundColor: "rgba(15, 23, 42, 0.5)" }}
                                className="group h-full min-h-[220px] rounded-xl border-2 border-dashed border-slate-700 hover:border-indigo-500/50 flex flex-col items-center justify-center gap-3 text-slate-500 hover:text-indigo-400 transition-all"
                            >
                                <div className="w-12 h-12 rounded-full bg-slate-800 group-hover:bg-indigo-500/10 flex items-center justify-center transition-colors">
                                    <Plus className="w-6 h-6" />
                                </div>
                                <span className="text-sm font-medium">Create new notebook</span>
                            </motion.button>

                            {NOTEBOOKS.map(notebook => (
                                <NotebookCard key={notebook.id} notebook={notebook} />
                            ))}
                        </motion.div>
                    )}

                </main>
            </div>
        </div>
    );
}

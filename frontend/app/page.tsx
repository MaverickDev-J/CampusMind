"use client";

import { useState, useMemo } from "react";
import { useAuth } from "@/app/context/auth-context";
import Header from "@/app/components/Header";
import HeroSection from "@/app/components/HeroSection";
import YearSelector from "@/app/components/YearSelector";
import SemesterSection from "@/app/components/SemesterSection";
import { academicData } from "@/app/data";
import { useFiles } from "@/app/hooks/useFiles";

export default function Home() {
  const { user, loading } = useAuth();
  const [selectedYear, setSelectedYear] = useState(2);
  const { files } = useFiles(selectedYear);

  const currentYear = academicData.find((y) => y.id === selectedYear);

  const fileCounts = useMemo(() => {
    return files.reduce((acc, file) => {
      // The API returns 'subject' as the slug (e.g. 'os')
      // matching our data.ts slug.
      const slug = file.academic.subject;
      acc[slug] = (acc[slug] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);
  }, [files]);

  // Show loading state while auth hydrates
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-2 border-purple-500/30 border-t-purple-500 rounded-full animate-spin" />
          <p className="text-sm text-slate-500">Initializing neural link...</p>
        </div>
      </div>
    );
  }

  // Middleware handles redirect, but this is a safety net
  if (!user) return null;

  return (
    <div className="min-h-screen dot-pattern">
      <Header />
      <HeroSection />

      <main className="max-w-6xl mx-auto pb-20">
        <YearSelector selectedYear={selectedYear} onSelect={setSelectedYear} />

        {currentYear && (
          <SemesterSection
            semesters={currentYear.semesters}
            yearId={currentYear.id}
            fileCounts={fileCounts}
          />
        )}
      </main>

      {/* Bottom fade */}
      <div className="fixed bottom-0 left-0 right-0 h-20 bg-gradient-to-t from-slate-950 to-transparent pointer-events-none z-50" />
    </div>
  );
}

import Header from "@/app/components/Header";

export default function DeepBasePage() {
    return (
        <div className="flex flex-col h-screen w-full bg-[#0a0e1a] text-slate-400">
            <Header />
            <div className="flex-1 flex items-center justify-center">
                <div className="text-center">
                    <h1 className="text-2xl font-bold text-white mb-2">Deep Base</h1>
                    <p>Knowledge Base Interface Coming Soon</p>
                </div>
            </div>
        </div>
    );
}

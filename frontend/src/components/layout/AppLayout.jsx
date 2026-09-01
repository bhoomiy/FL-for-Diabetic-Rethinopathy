import { useState } from "react";
import Sidebar from "./Sidebar";
import Topbar from "./Topbar";
import ProtectedRoute from "@/components/common/ProtectedRoute";
import DisclaimerBanner from "@/components/common/DisclaimerBanner";

export default function AppLayout({ title = "FedRetina AI", children }) {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <ProtectedRoute>
      <div className="min-h-screen bg-background">
        <Sidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} />
        <div className="lg:pl-72">
          <Topbar title={title} onMenuClick={() => setSidebarOpen(true)} />
          <main className="mx-auto w-full max-w-[1400px] space-y-6 px-4 py-6 lg:px-8">
            {children}
            <DisclaimerBanner />
          </main>
        </div>
      </div>
    </ProtectedRoute>
  );
}

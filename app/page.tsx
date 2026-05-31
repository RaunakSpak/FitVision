import { AuthProvider } from "@/hooks/useAuth";
import { BackendHealthProvider } from "@/hooks/useBackendHealth";
import { MLAssistProvider } from "@/hooks/useMLAssist";
import FitVisionApp from "@/components/FitVisionApp";

export default function Home() {
  return (
    <main className="h-full">
      <BackendHealthProvider>
        <AuthProvider>
          <MLAssistProvider>
            <FitVisionApp />
          </MLAssistProvider>
        </AuthProvider>
      </BackendHealthProvider>
    </main>
  );
}

import { AuthProvider } from "@/hooks/useAuth";
import { MLAssistProvider } from "@/hooks/useMLAssist";
import FitVisionApp from "@/components/FitVisionApp";

export default function Home() {
  return (
    <main className="h-full">
      <AuthProvider>
        <MLAssistProvider>
          <FitVisionApp />
        </MLAssistProvider>
      </AuthProvider>
    </main>
  );
}

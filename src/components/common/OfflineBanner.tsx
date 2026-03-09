import { useState, useEffect } from "react";
import { WifiOff } from "lucide-react";

const OfflineBanner = () => {
  const [offline, setOffline] = useState(!navigator.onLine);

  useEffect(() => {
    const goOffline = () => setOffline(true);
    const goOnline = () => setOffline(false);
    window.addEventListener("offline", goOffline);
    window.addEventListener("online", goOnline);
    return () => {
      window.removeEventListener("offline", goOffline);
      window.removeEventListener("online", goOnline);
    };
  }, []);

  if (!offline) return null;

  return (
    <div className="fixed top-14 left-0 right-0 z-50 bg-destructive text-destructive-foreground text-center text-xs py-1.5 flex items-center justify-center gap-1.5"
      style={{ paddingTop: "env(safe-area-inset-top)" }}
    >
      <WifiOff className="w-3 h-3" />
      You're offline — viewing cached data
    </div>
  );
};

export default OfflineBanner;

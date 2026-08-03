import { useEffect, useState, useCallback } from "react";
import { toast } from "sonner";

export type InstallOutcome = "accepted" | "dismissed" | null;

export function usePwaInstall() {
  const [deferred, setDeferred] = useState<any>(null);
  const [isInstallable, setIsInstallable] = useState<boolean>(false);
  const [outcome, setOutcome] = useState<InstallOutcome>(null);

  useEffect(() => {
    const onPrompt = (e: Event) => {
      e.preventDefault();
      setDeferred(e);
      setIsInstallable(true);
    };

    const onAppInstalled = () => {
      setDeferred(null);
      setIsInstallable(false);
      toast.success("PadiPlug installed! Open it from your home screen.");
    };

    window.addEventListener("beforeinstallprompt", onPrompt);
    window.addEventListener("appinstalled", onAppInstalled);

    return () => {
      window.removeEventListener("beforeinstallprompt", onPrompt);
      window.removeEventListener("appinstalled", onAppInstalled);
    };
  }, []);

  const triggerInstall = useCallback(async () => {
    if (deferred) {
      deferred.prompt();
      const { outcome: choice } = await deferred.userChoice;
      setOutcome(choice);
      if (choice === "accepted") {
        setDeferred(null);
        setIsInstallable(false);
      }
      return choice as InstallOutcome;
    }

    const ua = navigator.userAgent.toLowerCase();
    const isIos = /iphone|ipad|ipod/.test(ua);
    const isMac = /macintosh/.test(ua);
    const isStandalone = ("standalone" in window.navigator && window.navigator.standalone === true) || window.matchMedia("(display-mode: standalone)").matches;

    if (isStandalone) {
      toast.info("PadiPlug is already installed on your home screen.");
      return null;
    }

    if (isIos || isMac) {
      toast.info(
        "On iPhone/iPad: tap the Share button in your browser, then choose 'Add to Home Screen'.",
        { duration: 6000 }
      );
    } else {
      toast.info(
        "On Android: tap the browser menu (⋮), then choose 'Install app' or 'Add to Home screen'.",
        { duration: 6000 }
      );
    }
    return null;
  }, [deferred]);

  return { isInstallable, triggerInstall, outcome };
}

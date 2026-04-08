"use client";

import { useEffect } from "react";

export function ServiceWorkerRegister() {
    useEffect(() => {
        if (!("serviceWorker" in navigator)) {
            return;
        }

        let hasReloaded = false;

        const handleControllerChange = () => {
            if (hasReloaded) {
                return;
            }

            hasReloaded = true;
            window.location.reload();
        };

        navigator.serviceWorker.addEventListener("controllerchange", handleControllerChange);

        navigator.serviceWorker
            .register("/sw.js")
            .then((registration) => registration.update())
            .catch(() => {
                // SW registration failed, app works fine without it
            });

        return () => {
            navigator.serviceWorker.removeEventListener("controllerchange", handleControllerChange);
        };
    }, []);

    return null;
}

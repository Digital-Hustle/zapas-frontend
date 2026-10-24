import { useEffect, useLayoutEffect, useState } from "react";
import { AnimatePresence, motion, useIsPresent } from "motion/react";
import { NavigationType, useLocation, useNavigate, useNavigationType, useOutlet } from "react-router";
import { setSessionLostHandler } from "@zapas/api";
import { useQueryClient } from "@tanstack/react-query";
import { resetPrivateSession } from "@/entities/auth-profile";
import { pageSwap } from "@zapas/tokens/motion";

/** Уходящая страница держит последний кадр, пока проигрывается выход (иначе outlet сразу покажет новую). */
function Frozen({ children }: { children: React.ReactNode }) {
  const isPresent = useIsPresent();
  const [frozen, setFrozen] = useState(children);
  if (isPresent && frozen !== children) setFrozen(children);
  return <>{isPresent ? children : frozen}</>;
}

const scroll = new Map<string, number>();

export function RootLayout() {
  const location = useLocation();
  const navType = useNavigationType();
  const outlet = useOutlet();
  const navigate = useNavigate();
  const client = useQueryClient();
  const back = navType === NavigationType.Pop;
  const dir = back ? -1 : 1;

  useEffect(() => {
    setSessionLostHandler(
      () =>
        void resetPrivateSession(client, null).then(() =>
          navigate("/login", {
            replace: true,
            state: { from: location.pathname },
          }),
        ),
    );
    return () => setSessionLostHandler(() => undefined);
  }, [navigate, location.pathname, client]);

  useLayoutEffect(() => {
    history.scrollRestoration = "manual";
  }, []);

  // Ключ — первый сегмент: переходы внутри раздела не перемонтируют макет кабинета.
  const key = location.pathname.split("/")[1] ?? "";

  return (
    <AnimatePresence
      mode="wait"
      custom={dir}
      initial={false}
      onExitComplete={() => window.scrollTo({ top: back ? (scroll.get(location.key) ?? 0) : 0 })}
    >
      <motion.div
        key={key}
        custom={dir}
        variants={pageSwap}
        initial="initial"
        animate="animate"
        exit="exit"
        onAnimationStart={() => scroll.set(location.key, window.scrollY)}
        className="min-h-svh"
      >
        <Frozen>{outlet}</Frozen>
      </motion.div>
    </AnimatePresence>
  );
}

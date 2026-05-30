// src/features/mystery/MysteryLinkHandler.tsx
import { useEffect, useRef } from 'react';
import * as Linking from 'expo-linking';
import { usePathname, useRouter } from 'expo-router';

import { parseMysteryLink } from './mysteryService';

export function MysteryLinkHandler() {
  const pathname = usePathname();
  const router = useRouter();
  const pathnameRef = useRef(pathname);

  useEffect(() => {
    pathnameRef.current = pathname;
  }, [pathname]);

  useEffect(() => {
    let isMounted = true;

    function routeMysteryLink(url: string) {
      const parsedLink = parseMysteryLink(url);

      if (!parsedLink) {
        return;
      }

      const targetPath = `/mystery/${parsedLink.token}`;

      if (pathnameRef.current === targetPath) {
        return;
      }

      router.push({
        pathname: '/mystery/[token]',
        params: { token: parsedLink.token },
      });
    }

    void Linking.getInitialURL().then((url) => {
      if (isMounted && url) {
        routeMysteryLink(url);
      }
    });

    const subscription = Linking.addEventListener('url', ({ url }) => {
      routeMysteryLink(url);
    });

    return () => {
      isMounted = false;
      subscription.remove();
    };
  }, [router]);

  return null;
}

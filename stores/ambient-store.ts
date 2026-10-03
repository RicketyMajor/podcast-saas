import { useEffect } from "react";
import { create } from "zustand";

/** Cover of the page in view (hero, detail); the playing track wins over it. */
export const useAmbientStore = create<{ pageCover: string | null }>()(() => ({
  pageCover: null,
}));

export function usePageCover(url: string | null | undefined) {
  useEffect(() => {
    if (!url) return;
    useAmbientStore.setState({ pageCover: url });
    return () => {
      if (useAmbientStore.getState().pageCover === url) {
        useAmbientStore.setState({ pageCover: null });
      }
    };
  }, [url]);
}

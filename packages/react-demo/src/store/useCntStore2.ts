import { create } from "@wheel/oh-my-zustand";

export interface ICntState {
  cnt: number;
  addCnt: () => void;
  asyncSubCnt: () => Promise<null>;
  resetCnt: () => void;
}

export const useCntStore = create<ICntState>((set) => {
  return {
    cnt: 0,

    addCnt: () => {
      set((state: ICntState) => ({ cnt: state.cnt + 1 }));
    },

    asyncSubCnt: () => {
      return new Promise((resolve) => {
        setTimeout(() => {
          set((state: ICntState) => ({ cnt: state.cnt - 1 }));
          resolve(null);
        }, 1000);
      });
    },

    resetCnt: () => {
      set({ cnt: 0 });
    },
  };
});

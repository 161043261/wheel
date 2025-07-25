import { create } from "zustand";
import { create as create2 } from "./";

interface ICntStore {
  cnt: number;
  incCnt: () => void;
  decCnt: () => void;
  resetCnt: () => void;
}

describe("oh-my-zustand", () => {
  it("create store", () => {
    const useCntStore = create<ICntStore>((set) => ({
      cnt: 0,
      incCnt: () => set((state) => ({ cnt: state.cnt + 1 })),
      decCnt: () => set((state) => ({ cnt: state.cnt - 1 })),
      resetCnt: () => set({ cnt: 0 }),
    }));

    const cnt = useCntStore((state) => state.cnt);
    const { incCnt, decCnt, resetCnt } = useCntStore();
    expect(cnt).toBe(0);

    incCnt();
    expect(cnt).toBe(1);

    resetCnt();
    expect(cnt).toBe(0);

    decCnt();
    expect(cnt).toBe(-1);
  });

  it("create store2", () => {
    const useCntStore2 = create2<ICntStore>((set) => ({
      cnt: 0,
      incCnt: () => set((state) => ({ cnt: state.cnt + 1 })),
      decCnt: () => set((state) => ({ cnt: state.cnt - 1 })),
      resetCnt: () => set({ cnt: 0 }),
    }));

    const cnt = useCntStore2((state) => state.cnt) as number;
    const { incCnt, decCnt, resetCnt } = useCntStore2() as ICntStore;

    expect(cnt).toBe(0);

    incCnt();
    expect(cnt).toBe(1);

    resetCnt();
    expect(cnt).toBe(0);

    decCnt();
    expect(cnt).toBe(-1);
  });
});

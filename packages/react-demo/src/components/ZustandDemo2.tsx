import { useCntStore } from "../store/useCntStore";

const ZustandDemo2: React.FC = () => {
  const cnt = useCntStore((state) => state.cnt);
  const addCnt = useCntStore((state) => state.addCnt);
  const asyncSubCnt = useCntStore((state) => state.asyncSubCnt);
  const resetCnt = useCntStore((state) => state.resetCnt);
  return (
    <div>
      ZustandDemo2 cnt: {cnt}
      <button onClick={addCnt}>addCnt</button>
      <button onClick={asyncSubCnt}>asyncSubCnt</button>
      <button onClick={resetCnt}>resetCnt</button>
    </div>
  );
};

export default ZustandDemo2;

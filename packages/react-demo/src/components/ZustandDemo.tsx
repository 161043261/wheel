import { useCntStore } from "../store/useCntStore";

const ZustandDemo: React.FC = () => {
  const cntStore = useCntStore();
  const { cnt, addCnt, asyncSubCnt, resetCnt } = cntStore;
  return (
    <div>
      ZustandDemo cnt: {cnt}
      <button onClick={addCnt}>addCnt</button>
      <button onClick={asyncSubCnt}>asyncSubCnt</button>
      <button onClick={resetCnt}>resetCnt</button>
    </div>
  );
};

export default ZustandDemo;

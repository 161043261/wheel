import { useCntStore, type ICntState } from "../store/useCntStore2";

const OhMyZustand: React.FC = () => {
  const cntStore = useCntStore();
  const { cnt, addCnt, asyncSubCnt, resetCnt } = cntStore as ICntState;
  return (
    <div>
      OhMyZustand cnt: {cnt}
      <button onClick={addCnt}>addCnt</button>
      <button onClick={asyncSubCnt}>asyncSubCnt</button>
      <button onClick={resetCnt}>resetCnt</button>
    </div>
  );
};

export default OhMyZustand;

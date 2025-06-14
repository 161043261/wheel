import { useCntStore, type ICntState } from "../store/useCntStore2";

const OhMyZustand2: React.FC = () => {
  const cnt = useCntStore((state) => state.cnt) as ICntState["cnt"];

  const addCnt = useCntStore((state) => state.addCnt) as ICntState["addCnt"];

  const asyncSubCnt = useCntStore(
    (state) => state.asyncSubCnt,
  ) as ICntState["asyncSubCnt"];

  const resetCnt = useCntStore(
    (state) => state.resetCnt,
  ) as ICntState["resetCnt"];
  return (
    <div>
      OhMyZustand2 cnt: {cnt}
      <button onClick={addCnt}>addCnt</button>
      <button onClick={asyncSubCnt}>asyncSubCnt</button>
      <button onClick={resetCnt}>resetCnt</button>
    </div>
  );
};

export default OhMyZustand2;

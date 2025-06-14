/** @jsx React.createElement */
import React from "./core/React.js";

function Foo() {
  const [cnt, setCnt] = React.useState(0);
  const [cnt2, setCnt2] = React.useState(1);

  const handleClick = () => {
    setCnt(cnt + 1);
  };
  const handleClick2 = () => {
    setCnt2((cnt2) => cnt2);
  };

  React.useEffect(() => {
    console.log("onMounted");
    return () => {
      console.log("Cleanup");
    };
  }, []);

  React.useEffect(() => {
    console.log(`cnt: ${cnt}`);
    return () => {
      console.log("cnt Cleanup");
    };
  }, [cnt]);

  React.useEffect(() => {
    console.log(`cnt2: ${cnt2}`);
    return () => {
      console.log("cnt2 Cleanup");
    };
  }, [cnt2]);

  return (
    <div>
      <div>Foo cnt {cnt}</div>
      <button onClick={handleClick}>addCnt</button>
      <div>Foo cnt {cnt2}</div>
      <button onClick={handleClick2}>addCnt2</button>
    </div>
  );
}

export default function App() {
  return (
    <div id="app">
      <Foo />
    </div>
  );
}

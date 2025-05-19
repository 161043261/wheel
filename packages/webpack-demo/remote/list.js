const wrap = document.createElement("div");
const list = [
  { name: "One", age: 1 },
  { name: "Two", age: 2 },
  { name: "Three", age: 3 },
];
list.forEach((item) => {
  const p = document.createElement("p");
  p.innerHTML = `${item.name}-${item.age}`;
  wrap.appendChild(p);
});
export const addList = () => {
  document.body.appendChild(wrap);
};

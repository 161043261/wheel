class ReactiveEffect {
  private _fn: Function;
  constructor(fn: Function) {
    this._fn = fn;
  }
  run() {
    activeEffect = this;
    this._fn();
  }
}

let activeEffect: ReactiveEffect;

export function effect(fn: Function) {
  const _effect = new ReactiveEffect(fn);
  _effect.run();
}

const targetMap = new WeakMap<
  object,
  Map<string | symbol, Set<ReactiveEffect>>
>();

// 跟踪依赖
export function track(target: object, key: string | symbol) {
  let keyEffects = targetMap.get(target);
  if (!keyEffects) {
    keyEffects = new Map<string | symbol, Set<ReactiveEffect>>();
    targetMap.set(target, keyEffects);
  }
  let effectSet = keyEffects.get(key);
  if (!effectSet) {
    effectSet = new Set<ReactiveEffect>();
  }
  effectSet.add(activeEffect);
  keyEffects.set(key, effectSet);
  console.log("keyEffects:", keyEffects);
}

// 触发更新
export function trigger(target: object, key: string | symbol) {
  const keyEffects = targetMap.get(target);
  const effects = keyEffects?.get(key);
  if (!effects) {
    return;
  }
  for (const effect of effects) {
    effect.run();
  }
}

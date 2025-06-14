import { useSyncExternalStore } from "react";

type PartialState<TState> =
  | TState
  | Partial<TState>
  | ((state: TState) => TState | Partial<TState>);

type StateCreator<TState> = (
  set: (partial: PartialState<TState>) => void,
  get: () => TState,
) => TState;

type Listener<TState> = (
  nextState: TState | Partial<TState>,
  prevState: TState,
) => void;

type Off = () => void;

type Selector<TState> = (state: TState) => TState[keyof TState];

interface IStore<TState> {
  getState: () => TState;
  setState: (partial: PartialState<TState>) => void;
  subscribe: (listener: Listener<TState>) => Off;
}

export function createStore<TState>(
  createState: StateCreator<TState>,
): IStore<TState> {
  let state: TState;
  const listeners = new Set<Listener<TState>>();

  const getState = () => {
    return state;
  };

  const setState = (partial: PartialState<TState>) => {
    const nextState =
      typeof partial === "function"
        ? (partial as (state: TState) => TState | Partial<TState>)(getState())
        : (partial as TState | Partial<TState>);

    //! NaN === NaN false
    //! Object.is(NaN, NaN) true

    //! +0 === -0 true
    //! Object.is(+0, -0) false
    if (!Object.is(state, nextState) /** state !== nextState */) {
      const prevState = state;
      state = { ...state, ...nextState };
      // 状态改变时, 通知组件更新
      listeners.forEach((listener) => listener(nextState, prevState));
    }
  };

  const subscribe = (listener: Listener<TState>) => {
    listeners.add(listener);
    const off = () => {
      listeners.delete(listener);
    };
    return off;
  };

  const store = {
    getState,
    setState,
    subscribe,
  };

  state = createState(setState, getState);
  return store;
}

function useStore<TState>(
  store: IStore<TState>,
  selector?: Selector<TState>,
): TState | TState[keyof TState] {
  const state: TState = useSyncExternalStore(store.subscribe, store.getState);
  if (!selector) {
    return state;
  } else {
    return selector(state);
  }
}

export function create<TState>(createState: StateCreator<TState>) {
  const store = createStore<TState>(createState);
  return (selector?: Selector<TState>) => {
    return useStore<TState>(store, selector);
  };
}

import { useSyncExternalStore } from 'react';

interface Clock {
  listeners: Set<() => void>;
  timer: ReturnType<typeof setTimeout> | null;
}

// Un battement par intervalle, partagé par tous les composants qui le suivent
const clocks = new Map<number, Clock>();
const subscribers = new Map<number, (listener: () => void) => () => void>();
const snapshots = new Map<number, () => number>();

function clockOf(interval: number): Clock {
  let clock = clocks.get(interval);
  if (!clock) {
    clock = { listeners: new Set(), timer: null };
    clocks.set(interval, clock);
  }
  return clock;
}

// Sur le battement suivant de l'horloge murale : toutes les secondes changent en même temps
function schedule(interval: number, clock: Clock) {
  clock.timer = setTimeout(() => {
    clock.timer = null;
    beat(interval, clock);
  }, interval - (Date.now() % interval));
}

function beat(interval: number, clock: Clock) {
  if (clock.listeners.size === 0) {
    return;
  }
  clock.listeners.forEach((listener) => listener());
  if (clock.listeners.size > 0 && clock.timer === null) {
    schedule(interval, clock);
  }
}

function subscriberOf(interval: number) {
  let subscribe = subscribers.get(interval);
  if (!subscribe) {
    subscribe = (listener) => {
      const clock = clockOf(interval);
      clock.listeners.add(listener);
      if (clock.timer === null) {
        schedule(interval, clock);
      }
      return () => {
        clock.listeners.delete(listener);
        if (clock.listeners.size === 0 && clock.timer !== null) {
          clearTimeout(clock.timer);
          clock.timer = null;
        }
      };
    };
    subscribers.set(interval, subscribe);
  }
  return subscribe;
}

// L'heure arrondie au battement : la même pour tous les composants tant que le battement ne change pas
function snapshotOf(interval: number) {
  let snapshot = snapshots.get(interval);
  if (!snapshot) {
    snapshot = () => Math.floor(Date.now() / interval) * interval;
    snapshots.set(interval, snapshot);
  }
  return snapshot;
}

// Onglet en arrière-plan : le navigateur espace les minuteries. Au retour, tout le monde se remet à l'heure.
document.addEventListener('visibilitychange', () => {
  if (document.visibilityState !== 'visible') {
    return;
  }
  clocks.forEach((clock, interval) => {
    if (clock.timer !== null) {
      clearTimeout(clock.timer);
      clock.timer = null;
    }
    beat(interval, clock);
  });
});

/**
 * L'heure qu'il est (en ms), rafraîchie à chaque battement : chaque seconde par défaut, chaque minute pour
 * un compte en jours. Tous les composants qui suivent le même battement changent à la même image.
 */
export function useNow(interval = 1000): number {
  return useSyncExternalStore(subscriberOf(interval), snapshotOf(interval));
}

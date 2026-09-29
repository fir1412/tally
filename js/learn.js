// Learn Tally: short missions that tick themselves off when a feature is really used, not when a tip is read
// (pattern from we go gim). Pure rules, no DOM. A mission is done once stored (the day it was done) or once the
// data shows it happened, so a receipt scanned before this list existed already counts.
import { itemKey } from './engine.js';

/** Entries the user made on this phone: scanned or typed (not imports, bills that add themselves, or a spouse's). */
export const byUser = (x, me = '') => (x.source === 'receipt' || x.source === 'quick') && !x.spouse && (!x.by || x.by === me);
const imported = x => x.source === 'import' || x.source === 'statement';
const hasBudget = b => !!(b && (b.total || Object.keys(b.byCat || {}).length));

/**
 * d: { tx, recurring, accounts, settings, budgets, rules, lastBackup }. `on` are the taps (act:…), fields (input:…)
 * and sightings (see:…) that complete a mission when there is no data to show it.
 */
export const MISSIONS = [
  { id: 'scan', icon: 'camera', done: d => d.tx.some(x => x.source === 'receipt' && x.receiptId) },
  // A remembered item that isn't a shop typed by hand: someone changed an item's category on a receipt.
  { id: 'fixcat', icon: 'swap', on: ['input:rv-item:category'], done: d => { const m = new Set(d.tx.map(x => itemKey(x.merchant))); return Object.keys(d.rules || {}).some(k => !k.startsWith('SHOP ') && !m.has(k)); } },
  { id: 'split', icon: 'list', done: d => d.tx.some(x => x.source === 'receipt' && !x.receiptId && x.items?.length) },
  { id: 'hand', icon: 'plus', done: d => d.tx.some(x => x.source === 'quick') },
  { id: 'budget', icon: 'wallet', done: d => hasBudget(d.budgets) || hasBudget(d.budgets?.joint) },
  { id: 'bill', icon: 'bell', done: d => d.recurring.length > 0 },
  { id: 'table', icon: 'chart', on: ['see:table'] },
  { id: 'lang', icon: 'globe', done: d => !!(d.settings.lang || d.settings.textSize) },
  { id: 'backup', icon: 'download', done: d => !!d.lastBackup },
  { id: 'import', icon: 'upload', done: d => d.tx.some(imported) },
  { id: 'lock', icon: 'lock', done: d => !!d.settings.lock?.hash },
  { id: 'joint', icon: 'users', on: ['act:jt-send', 'act:jt-save'], only: d => d.accounts.some(a => a.scope === 'joint') },
];

/** The missions for this user (sharing only with a joint account), what's done, and the next one. */
export function progress(d) {
  const got = d.settings.learn || {};
  const list = MISSIONS.filter(m => !m.only || m.only(d));
  const done = new Set(list.filter(m => typeof got[m.id] === 'string').map(m => m.id));
  const next = list.find(m => !done.has(m.id)) || null;
  return { list, done, n: done.size, total: list.length, all: !next, next };
}
/** Missions the data shows are done but aren't stored yet. */
export const doneByData = d => { const got = d.settings.learn || {}; return MISSIONS.filter(m => !got[m.id] && m.done?.(d) && (!m.only || m.only(d))).map(m => m.id); };
/** The mission a tap, field or sighting completes, if any and not done yet. */
export const missionFor = (what, d) => MISSIONS.find(m => m.on?.includes(what) && !d.settings.learn?.[m.id] && (!m.only || m.only(d)))?.id || null;

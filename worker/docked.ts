// Bikes standing at stations, with frame numbers. Listing them all takes ~22 GraphQL queries, so
// one Durable Object owns the list and keeps it fresh with an alarm loop instead of per visitor:
// every 30 s it reads GBFS station_status (one request), re-queries only the stations whose counts
// changed, and does a full scan every 10 min because counts can stay equal while bikes swap.
//
// Workers Free limits this is sized for (Cloudflare docs, checked 2026-10):
// - DO requests 100,000/day (alarms count): 2,880 alarms + edge-cache misses of /api/docked.
// - DO duration 13,000 GB-s/day at 128 MB: an alarm runs ~1–3 s and the object hibernates after
//   10 s idle (it holds no timers or sockets), so ~12 s × 2,880 + full scans ≈ 4,700 GB-s/day.
//   Even if it never hibernated, 86,400 s × 0.125 GB = 10,800 GB-s stays under the limit.
// - SQLite rows written 100,000/day: one setAlarm + one snapshot put per alarm ≈ 5,760/day.
// - 50 subrequests per invocation: status + info + ≤22 chunks, retries share the rest.
// - A value may be up to 2 MB; the snapshot is a few hundred KB.

import { DurableObject } from "cloudflare:workers";
import type { Bike, BikesResponse, UnixSeconds } from "../shared/types";
import { errorMessage, fetchStationBikesBatch, fetchStationInfo, fetchStationStatus, isStationId, type StationCoords, type StationStatus } from "./mevo";

const SCAN_INTERVAL_MS = 30_000;
const FULL_SCAN_EVERY_SECONDS = 600;
const SUBREQUEST_LIMIT = 50;
const MAX_FAILED_CHUNK_SHARE = 0.5; // a full scan with more failed chunks than this keeps the old list
const SNAPSHOT_KEY = "snapshot";
const RETRY_SIGNATURE = "retry"; // never equals a real signature, so the station is re-queried next time

interface Snapshot {
  updated: UnixSeconds;
  lastFullScan: UnixSeconds;
  coords: Record<string, { lat: number; lon: number }>;
  /** Per station: the GBFS counts at the time its bikes below were fetched. */
  signatures: Record<string, string>;
  bikes: Record<string, Bike[]>;
}

const now = () => Math.floor(Date.now() / 1000);

// Docks count too: an unavailable bike arriving or leaving changes free docks but not available bikes.
const signature = (s: StationStatus) =>
  `${s.num_docks_available ?? 0}|${(s.vehicle_types_available ?? []).map((v) => `${v.vehicle_type_id}:${v.count}`).join(",")}`;

export class DockedBikes extends DurableObject {
  private snapshot: Snapshot | null = null;
  private scanning: Promise<void> | null = null;

  constructor(ctx: DurableObjectState, env: Cloudflare.Env) {
    super(ctx, env);
    ctx.blockConcurrencyWhile(async () => {
      this.snapshot = (await ctx.storage.get<Snapshot>(SNAPSHOT_KEY)) ?? null;
    });
  }

  /** The current list. Also (re)starts the alarm loop, e.g. right after a deploy. */
  async list(): Promise<BikesResponse> {
    // An object has a single alarm, so this can't stack loops; it only revives a missing one.
    if ((await this.ctx.storage.getAlarm()) === null) await this.ctx.storage.setAlarm(Date.now() + SCAN_INTERVAL_MS);
    if (!this.snapshot) await this.scan();
    const snapshot = this.snapshot!;
    return { updated: snapshot.updated, bikes: Object.values(snapshot.bikes).flat() };
  }

  async alarm() {
    // Schedule first, so a scan that throws or runs long still leaves the loop alive.
    await this.ctx.storage.setAlarm(Date.now() + SCAN_INTERVAL_MS);
    await this.scan().catch((e: unknown) => console.error(`Docked scan failed, keeping the previous list: ${errorMessage(e)}`));
  }

  /** One scan at a time: a visitor arriving mid-scan waits for the running one. */
  private scan(): Promise<void> {
    this.scanning ??= this.runScan().finally(() => (this.scanning = null));
    return this.scanning;
  }

  private async runScan() {
    const startedAt = Date.now();
    const prev = this.snapshot;
    const status = (await fetchStationStatus()).stations;
    let subrequests = 1;
    const fullReason = !prev ? "no snapshot yet" : now() - prev.lastFullScan >= FULL_SCAN_EVERY_SECONDS ? `last one ${now() - prev.lastFullScan} s ago` : null;
    const full = !prev || fullReason !== null;
    const ids = status.map((s) => s.station_id).filter(isStationId);

    let coords = prev?.coords ?? {};
    if (full || ids.some((id) => !coords[id])) {
      const info = await fetchStationInfo();
      subrequests++;
      coords = Object.fromEntries(info.map((s) => [s.station_id, { lat: s.lat, lon: s.lon }]));
    }

    const current = new Map(status.map((s) => [s.station_id, signature(s)]));
    const changed = full ? ids : ids.filter((id) => prev.signatures[id] !== current.get(id));
    const batch = changed.length
      ? await fetchStationBikesBatch(changed, new Map(Object.entries(coords)) as StationCoords, SUBREQUEST_LIMIT - subrequests)
      : { byStation: new Map<string, Bike[]>(), chunks: 0, failedChunks: 0 };
    if (full && batch.failedChunks > batch.chunks * MAX_FAILED_CHUNK_SHARE) {
      throw new Error(`full scan: ${batch.failedChunks} of ${batch.chunks} station chunks failed`);
    }

    // A bike that moved between two stations shows up fresh at the new one; drop it from stale lists.
    const fresh = new Set([...batch.byStation.values()].flat().map((b) => b.number));
    const requeried = new Set(changed);
    const bikes: Snapshot["bikes"] = {};
    const signatures: Snapshot["signatures"] = {};
    for (const id of ids) {
      const queried = batch.byStation.get(id);
      if (queried) {
        bikes[id] = queried;
        signatures[id] = current.get(id)!;
      } else {
        // Unchanged, or its chunk failed: keep the old list; a failed one is retried next alarm.
        bikes[id] = (prev?.bikes[id] ?? []).filter((b) => !fresh.has(b.number));
        signatures[id] = requeried.has(id) ? RETRY_SIGNATURE : (prev?.signatures[id] ?? RETRY_SIGNATURE);
      }
    }

    this.snapshot = { updated: now(), lastFullScan: full ? now() : prev.lastFullScan, coords, signatures, bikes };
    await this.ctx.storage.put(SNAPSHOT_KEY, this.snapshot);
    const total = Object.values(bikes).reduce((n, list) => n + list.length, 0);
    console.log(
      `Docked ${full ? `full scan (${fullReason})` : "incremental scan"}: ${changed.length}/${ids.length} stations re-queried in ${batch.chunks} queries` +
        ` (${batch.failedChunks} failed), ${total} bikes, ${Date.now() - startedAt} ms`,
    );
  }
}

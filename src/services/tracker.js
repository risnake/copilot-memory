import { mkdir, open, readFile, stat, unlink, writeFile } from 'fs/promises';

/**
 * Deterministic project tracker state
 */
export class TrackerService {
  constructor(config) {
    this.config = config;
  }

  get statePath() {
    return this.config.getPath('indexes', 'tracker-state.json');
  }

  get lockPath() {
    return this.config.getPath('indexes', 'tracker-state.lock');
  }

  _defaultState() {
    return {
      version: 1,
      updated_at: new Date().toISOString(),
      active_phase_id: null,
      current_session_id: null,
      latest_handoff_path: null,
      latest_handoff_id: null
    };
  }

  async getState() {
    try {
      const data = await readFile(this.statePath, 'utf-8');
      return { ...this._defaultState(), ...JSON.parse(data) };
    } catch {
      return this._defaultState();
    }
  }

  async saveState(nextState) {
    await mkdir(this.config.getPath('indexes'), { recursive: true });
    await this._withLock(async () => {
      const current = await this.getState();
      const state = {
        ...this._defaultState(),
        ...current,
        ...nextState,
        updated_at: new Date().toISOString()
      };
      await writeFile(this.statePath, JSON.stringify(state, null, 2) + '\n', 'utf-8');
      return state;
    });
    return this.getState();
  }

  async setActivePhase(phaseId) {
    return this.saveState({ active_phase_id: phaseId || null });
  }

  async setSession(sessionId) {
    return this.saveState({ current_session_id: sessionId || null });
  }

  async recordHandoff(note) {
    return this.saveState({
      latest_handoff_path: note?.path || null,
      latest_handoff_id: note?.frontmatter?.id || null
    });
  }

  async resolvePhaseId(explicitPhaseId) {
    if (explicitPhaseId) return explicitPhaseId;
    const state = await this.getState();
    return state.active_phase_id || null;
  }

  async _withLock(fn, retries = 100, waitMs = 20) {
    for (let i = 0; i < retries; i++) {
      try {
        const handle = await open(this.lockPath, 'wx');
        try {
          return await fn();
        } finally {
          await handle.close();
          await unlink(this.lockPath).catch(() => {});
        }
      } catch (error) {
        if (error.code !== 'EEXIST') {
          throw error;
        }
        if (i === retries - 1) {
          throw new Error('Tracker state is busy, try again');
        }
        try {
          const lockStats = await stat(this.lockPath);
          if (Date.now() - lockStats.mtimeMs > 30_000) {
            await unlink(this.lockPath).catch(() => {});
          }
        } catch {}
        await new Promise(resolve => setTimeout(resolve, waitMs));
      }
    }
  }
}

export default TrackerService;

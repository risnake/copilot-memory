import { mkdir, readFile, writeFile } from 'fs/promises';

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
    const state = {
      ...this._defaultState(),
      ...nextState,
      updated_at: new Date().toISOString()
    };
    await mkdir(this.config.getPath('indexes'), { recursive: true });
    await writeFile(this.statePath, JSON.stringify(state, null, 2) + '\n', 'utf-8');
    return state;
  }

  async setActivePhase(phaseId) {
    const state = await this.getState();
    return this.saveState({ ...state, active_phase_id: phaseId || null });
  }

  async setSession(sessionId) {
    const state = await this.getState();
    return this.saveState({ ...state, current_session_id: sessionId || null });
  }

  async recordHandoff(note) {
    const state = await this.getState();
    return this.saveState({
      ...state,
      latest_handoff_path: note?.path || null,
      latest_handoff_id: note?.frontmatter?.id || null
    });
  }

  async resolvePhaseId(explicitPhaseId) {
    if (explicitPhaseId) return explicitPhaseId;
    const state = await this.getState();
    return state.active_phase_id || null;
  }
}

export default TrackerService;

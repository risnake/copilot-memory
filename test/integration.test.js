import { test, describe, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert';
import { rm, mkdir } from 'fs/promises';
import { join } from 'path';
import { Config } from '../src/config.js';
import { FilesystemAdapter } from '../src/adapters/filesystem.js';
import { VaultService } from '../src/services/vault.js';
import { IndexService } from '../src/services/index.js';
import { DoctorService } from '../src/services/doctor.js';
import { PruneService } from '../src/services/prune.js';
import { TrackerService } from '../src/services/tracker.js';
import { initCommand } from '../src/commands/init.js';
import { phaseCommand } from '../src/commands/phase.js';
import { vaultCommand } from '../src/commands/memory.js';
import { handoffCommand, continuousResumeCommand } from '../src/commands/handoff.js';

const TEST_VAULT = join(process.cwd(), 'test-vault');

describe('Filename Convention', () => {
  let config;

  beforeEach(() => {
    config = new Config({ vaultPath: TEST_VAULT, useNotesmd: false });
  });

  test('should generate correct filename format', () => {
    const date = new Date('2024-01-15T14:30:00.000Z');
    const filename = config.generateFilename('handoff', 'session-123', 'test-handoff', date);
    
    // Check format with flexible scope/slug matching
    assert.match(filename, /^\d{8}-\d{6}Z--.+--.+--.+\.md$/);
    assert.strictEqual(filename, '20240115-143000Z--handoff--session-123--test-handoff.md');
  });

  test('should parse filename correctly', () => {
    const filename = '20240115-143000Z--handoff--session-123--test-handoff.md';
    const parsed = config.parseFilename(filename);
    
    assert.ok(parsed);
    assert.strictEqual(parsed.timestamp, '20240115-143000Z');
    assert.strictEqual(parsed.type, 'handoff');
    assert.strictEqual(parsed.scope, 'session-123');
    assert.strictEqual(parsed.slug, 'test-handoff');
    assert.ok(parsed.date instanceof Date);
    assert.strictEqual(parsed.date.toISOString(), '2024-01-15T14:30:00.000Z');
  });

  test('should sanitize slug correctly', () => {
    const date = new Date('2024-01-15T14:30:00.000Z');
    const filename = config.generateFilename('handoff', 'session', 'Test!@# Handoff$%^ Complete!!!', date);
    
    assert.strictEqual(filename, '20240115-143000Z--handoff--session--test-handoff-complete.md');
  });
});

describe('Handoff and Resume Flow', () => {
  let config, adapter, vault;

  beforeEach(async () => {
    await rm(TEST_VAULT, { recursive: true, force: true });
    await mkdir(TEST_VAULT, { recursive: true });
    
    config = new Config({ vaultPath: TEST_VAULT, useNotesmd: false });
    adapter = new FilesystemAdapter(config);
    vault = new VaultService(config, adapter);
    
    await vault.initialize();
  });

  afterEach(async () => {
    await rm(TEST_VAULT, { recursive: true, force: true });
  });

  test('should create a handoff note', async () => {
    const handoff = await vault.createHandoff({
      sessionId: 'test-session-1',
      title: 'Test Handoff',
      content: '## Progress\n\nCompleted authentication module',
      tags: ['test']
    });

    assert.ok(handoff);
    assert.ok(handoff.path);
    assert.strictEqual(handoff.frontmatter.type, 'handoff');
    assert.strictEqual(handoff.frontmatter.session_id, 'test-session-1');
    assert.ok(handoff.frontmatter.tags.includes('handoff'));
    
    // Verify filename format
    const filename = handoff.path.split('/').pop();
    assert.match(filename, /^\d{8}-\d{6}Z--handoff--test-session-1--test-handoff\.md$/);
  });

  test('should retrieve latest handoff', async () => {
    // Create first handoff
    await vault.createHandoff({
      sessionId: 'session-1',
      title: 'First Handoff',
      content: 'First content'
    });

    // Wait a bit to ensure different timestamps
    await new Promise(resolve => setTimeout(resolve, 100));

    // Create second handoff
    await vault.createHandoff({
      sessionId: 'session-2',
      title: 'Second Handoff',
      content: 'Second content'
    });

    const latest = await vault.getLatestHandoff();
    assert.ok(latest);
    assert.strictEqual(latest.frontmatter.title, 'Second Handoff');
  });

  test('should link previous handoff', async () => {
    // Create first handoff
    const first = await vault.createHandoff({
      sessionId: 'session-1',
      title: 'First Handoff',
      content: 'First content'
    });

    // Wait a bit
    await new Promise(resolve => setTimeout(resolve, 100));

    // Create second handoff (should link to first)
    const second = await vault.createHandoff({
      sessionId: 'session-2',
      title: 'Second Handoff',
      content: 'Second content'
    });

    // Check that second handoff links to first
    assert.ok(second.frontmatter.previous_handoff);
    assert.strictEqual(second.frontmatter.previous_handoff, first.frontmatter.id);
    assert.ok(second.frontmatter.links.includes(first.path));
    
    // Check that content includes wikilink
    const firstBasename = first.path.split('/').pop().replace('.md', '');
    assert.ok(second.body.includes(`[[${firstBasename}]]`));
  });

  test('should resume from latest handoff', async () => {
    // Create handoff
    const handoff = await vault.createHandoff({
      sessionId: 'original-session',
      title: 'Work Complete',
      content: '## Work done\n\n- Feature A\n- Feature B'
    });

    // Get latest and create resume session
    const latest = await vault.getLatestHandoff();
    assert.ok(latest);

    const session = await vault.createSession({
      sessionId: latest.frontmatter.session_id,
      title: 'Resume from Work Complete',
      content: `Resuming from [[${latest.path}]]`,
      tags: ['resume']
    });

    assert.ok(session);
    assert.strictEqual(session.frontmatter.session_id, 'original-session');
    assert.ok(session.frontmatter.tags.includes('resume'));
  });
});

describe('Phase Operations', () => {
  let config, adapter, vault;

  beforeEach(async () => {
    await rm(TEST_VAULT, { recursive: true, force: true });
    await mkdir(TEST_VAULT, { recursive: true });
    
    config = new Config({ vaultPath: TEST_VAULT, useNotesmd: false });
    adapter = new FilesystemAdapter(config);
    vault = new VaultService(config, adapter);
    
    await vault.initialize();
  });

  afterEach(async () => {
    await rm(TEST_VAULT, { recursive: true, force: true });
  });

  test('should create a phase', async () => {
    const phase = await vault.createPhase({
      phaseId: 'auth-phase',
      title: 'Authentication',
      goal: 'Implement OAuth2 authentication',
      status: 'planned'
    });

    assert.ok(phase);
    assert.strictEqual(phase.frontmatter.type, 'phase');
    assert.strictEqual(phase.frontmatter.phase_id, 'auth-phase');
    assert.strictEqual(phase.frontmatter.title, 'Authentication');
  });

  test('should create research note for phase', async () => {
    // Create phase first
    await vault.createPhase({
      phaseId: 'auth-phase',
      title: 'Authentication',
      goal: 'Implement OAuth2'
    });

    const research = await vault.createPhaseResearch({
      phaseId: 'auth-phase',
      title: 'OAuth2 Investigation',
      content: '## Findings\n\n- Use JWT tokens\n- RS256 signing'
    });

    assert.ok(research);
    assert.strictEqual(research.frontmatter.type, 'research');
    assert.strictEqual(research.frontmatter.phase_id, 'auth-phase');
    assert.ok(research.path.includes('auth-phase/research'));
  });

  test('should create phase handoff', async () => {
    // Create phase
    await vault.createPhase({
      phaseId: 'auth-phase',
      title: 'Authentication',
      goal: 'Implement OAuth2'
    });

    const handoff = await vault.createPhaseHandoff({
      phaseId: 'auth-phase',
      title: 'Phase Complete',
      content: '## Summary\n\nAuthentication implemented and tested'
    });

    assert.ok(handoff);
    assert.strictEqual(handoff.frontmatter.phase_id, 'auth-phase');
    assert.ok(handoff.path.includes('auth-phase/handoffs'));
    
    // Should update latest handoff
    const latest = await vault.getLatestHandoff();
    assert.ok(latest);
    assert.strictEqual(latest.frontmatter.id, handoff.frontmatter.id);
  });

  test('should list phases', async () => {
    await vault.createPhase({
      phaseId: 'phase-1',
      title: 'Phase 1',
      goal: 'Goal 1'
    });

    await vault.createPhase({
      phaseId: 'phase-2',
      title: 'Phase 2',
      goal: 'Goal 2'
    });

    const phases = await vault.listPhases();
    assert.strictEqual(phases.length, 2);
  });
});

describe('Memory Index', () => {
  let config, adapter, indexService;

  beforeEach(async () => {
    await rm(TEST_VAULT, { recursive: true, force: true });
    await mkdir(TEST_VAULT, { recursive: true });
    
    config = new Config({ vaultPath: TEST_VAULT, useNotesmd: false });
    adapter = new FilesystemAdapter(config);
    const vault = new VaultService(config, adapter);
    indexService = new IndexService(config, adapter);
    
    await vault.initialize();

    // Create some test data
    await vault.createHandoff({
      sessionId: 'session-1',
      title: 'Handoff 1',
      content: 'Content 1'
    });

    await vault.createPhase({
      phaseId: 'phase-1',
      title: 'Test Phase',
      goal: 'Test Goal',
      status: 'active'
    });
  });

  afterEach(async () => {
    await rm(TEST_VAULT, { recursive: true, force: true });
  });

  test('should generate catalog', async () => {
    const result = await indexService.generateCatalog();
    
    assert.ok(result.path);
    assert.ok(result.sections.handoffs.length >= 1);
    assert.ok(result.sections.phases.length >= 1);

    const catalog = await adapter.readNote(result.path);
    assert.ok(catalog.body.includes('# Vault Catalog'));
    assert.ok(catalog.body.includes('## Handoffs'));
    assert.ok(catalog.body.includes('## Phases'));
  });

  test('should generate phase summary', async () => {
    const result = await indexService.generatePhaseSummary();
    
    assert.ok(result.path);
    assert.strictEqual(result.phases.length, 1);
    assert.strictEqual(result.phases[0].title, 'Test Phase');

    const summary = await adapter.readNote(result.path);
    assert.ok(summary.body.includes('# Phase Summary'));
    assert.ok(summary.body.includes('Test Phase'));
  });

  test('should regenerate all indexes', async () => {
    const result = await indexService.regenerateIndexes();
    
    assert.ok(result.catalog);
    assert.ok(result.phaseSummary);
    assert.ok(result.latestHandoff);
  });
});

describe('Memory Doctor', () => {
  let config, adapter, doctor;

  beforeEach(async () => {
    await rm(TEST_VAULT, { recursive: true, force: true });
    await mkdir(TEST_VAULT, { recursive: true });
    
    config = new Config({ vaultPath: TEST_VAULT, useNotesmd: false });
    adapter = new FilesystemAdapter(config);
    doctor = new DoctorService(config, adapter);
  });

  afterEach(async () => {
    await rm(TEST_VAULT, { recursive: true, force: true });
  });

  test('should detect missing folders', async () => {
    const result = await doctor.checkFolders();
    
    assert.strictEqual(result.healthy, false);
    assert.ok(result.missing.length > 0);
  });

  test('should pass folder check after initialization', async () => {
    await config.ensureVaultStructure();
    
    const result = await doctor.checkFolders();
    
    assert.strictEqual(result.healthy, true);
    assert.strictEqual(result.missing.length, 0);
    assert.ok(result.present.includes('handoffs'));
    assert.ok(result.present.includes('phases'));
  });

  test('should detect missing indexes', async () => {
    await config.ensureVaultStructure();
    
    const result = await doctor.checkIndexes();
    
    assert.strictEqual(result.healthy, false);
    assert.ok(result.issues.length > 0);
    assert.ok(result.issues.some(i => i.issue === 'missing'));
  });

  test('should run full diagnostics', async () => {
    await config.ensureVaultStructure();
    
    const result = await doctor.runDiagnostics();
    
    assert.ok(result.folders);
    assert.ok(result.indexes);
    assert.ok(result.frontmatter);
    assert.strictEqual(typeof result.healthy, 'boolean');
  });

  test('should auto-fix missing folders', async () => {
    const result = await doctor.autoFix();
    
    assert.ok(result.fixed);
    assert.ok(result.fixed.length > 0);

    const check = await doctor.checkFolders();
    assert.strictEqual(check.healthy, true);
  });
});

describe('Memory Prune', () => {
  let config, adapter, vault, prune;

  beforeEach(async () => {
    await rm(TEST_VAULT, { recursive: true, force: true });
    await mkdir(TEST_VAULT, { recursive: true });
    
    config = new Config({ vaultPath: TEST_VAULT, useNotesmd: false });
    adapter = new FilesystemAdapter(config);
    vault = new VaultService(config, adapter);
    prune = new PruneService(config, adapter);
    
    await vault.initialize();
  });

  afterEach(async () => {
    await rm(TEST_VAULT, { recursive: true, force: true });
  });

  test('should run dry-run prune', async () => {
    // Create some handoffs
    await vault.createHandoff({
      sessionId: 'session-1',
      title: 'Old Handoff',
      content: 'Old content'
    });

    const result = await prune.prune({ days: 0, dryRun: true });
    
    assert.strictEqual(result.dryRun, true);
    assert.strictEqual(result.summary.deleted, 0);
    assert.ok(result.summary.candidates >= 0);
  });

  test('should prune old notes', async () => {
    // Create handoff
    const handoff = await vault.createHandoff({
      sessionId: 'session-1',
      title: 'Test Handoff',
      content: 'Content'
    });

    // Verify it exists
    const handoffs = await vault.listHandoffs();
    assert.strictEqual(handoffs.length, 1);

    // Prune notes older than 0 days (everything)
    const result = await prune.prune({ days: 0, dryRun: false });
    
    assert.ok(result.summary.candidates > 0);
    
    // Check if file was deleted
    const handoffsAfter = await vault.listHandoffs();
    assert.ok(handoffsAfter.length < handoffs.length);
  });

  test('should preview prune', async () => {
    await vault.createHandoff({
      sessionId: 'session-1',
      title: 'Test Handoff',
      content: 'Content'
    });

    const result = await prune.preview(30);
    
    assert.strictEqual(result.dryRun, true);
    assert.ok(result.summary);
  });
});

describe('Init Command Contract', () => {
  let config, adapter, vault;

  beforeEach(async () => {
    await rm(TEST_VAULT, { recursive: true, force: true });
    await mkdir(TEST_VAULT, { recursive: true });
    
    config = new Config({ vaultPath: TEST_VAULT, useNotesmd: false });
    adapter = new FilesystemAdapter(config);
    vault = new VaultService(config, adapter);
    
    await vault.initialize();
  });

  afterEach(async () => {
    await rm(TEST_VAULT, { recursive: true, force: true });
  });

  test('should require --mode flag', async () => {
    try {
      await initCommand(vault, {});
      assert.fail('Should have thrown error for missing --mode');
    } catch (error) {
      assert.ok(error.message.includes('--mode is required'));
      assert.ok(error.message.includes('greenfield, brownfield'));
    }
  });

  test('should reject invalid mode values', async () => {
    try {
      await initCommand(vault, { mode: 'invalid' });
      assert.fail('Should have thrown error for invalid mode');
    } catch (error) {
      assert.ok(error.message.includes('Invalid mode'));
      assert.ok(error.message.includes('greenfield, brownfield'));
    }
  });

  test('should create greenfield note with --mode greenfield', async () => {
    const result = await initCommand(vault, {
      mode: 'greenfield',
      idea: 'E-commerce Platform',
      stack: 'Node.js,React',
      session: 'test-session'
    });

    assert.ok(result.success);
    assert.strictEqual(result.message, 'Greenfield note created');
    assert.ok(result.note.path);
    assert.ok(result.note.id);
    
    // Verify note was created
    const note = await adapter.readNote(result.note.path);
    assert.strictEqual(note.frontmatter.type, 'greenfield');
    assert.ok(note.frontmatter.tags.includes('greenfield'));
    assert.ok(note.frontmatter.tags.includes('planning'));
    assert.ok(note.body.includes('E-commerce Platform'));
    assert.ok(note.body.includes('Node.js'));
    assert.ok(note.body.includes('React'));
  });

  test('should create brownfield note with --mode brownfield', async () => {
    const result = await initCommand(vault, {
      mode: 'brownfield',
      path: process.cwd(),
      session: 'test-session'
    });

    assert.ok(result.success);
    assert.strictEqual(result.message, 'Brownfield analysis note created');
    assert.ok(result.note.path);
    assert.ok(result.note.id);
    
    // Verify note was created
    const note = await adapter.readNote(result.note.path);
    assert.strictEqual(note.frontmatter.type, 'brownfield');
    assert.ok(note.frontmatter.tags.includes('brownfield'));
    assert.ok(note.frontmatter.tags.includes('analysis'));
    assert.ok(note.body.includes('Brownfield Codebase Analysis'));
  });

  test('greenfield note should be in sessions directory', async () => {
    const result = await initCommand(vault, {
      mode: 'greenfield',
      idea: 'Test Project',
      stack: 'JavaScript',
      session: 'test-session'
    });

    assert.ok(result.note.path.includes('sessions/'));
  });

  test('brownfield note should be in sessions directory', async () => {
    const result = await initCommand(vault, {
      mode: 'brownfield',
      path: process.cwd(),
      session: 'test-session'
    });

    assert.ok(result.note.path.includes('sessions/'));
  });
});

describe('Resume Command', () => {
  let config, adapter, vault, tracker;

  beforeEach(async () => {
    await rm(TEST_VAULT, { recursive: true, force: true });
    await mkdir(TEST_VAULT, { recursive: true });
    
    config = new Config({ vaultPath: TEST_VAULT, useNotesmd: false });
    adapter = new FilesystemAdapter(config);
    vault = new VaultService(config, adapter);
    tracker = new TrackerService(config);
    
    await vault.initialize();
  });

  afterEach(async () => {
    await rm(TEST_VAULT, { recursive: true, force: true });
  });

  test('should fail when no handoff exists', async () => {
    const result = await continuousResumeCommand(vault, {});
    
    assert.strictEqual(result.success, false);
    assert.ok(result.message.includes('No handoff found'));
  });

  test('should resume from latest handoff', async () => {
    // Create a handoff
    await vault.createHandoff({
      sessionId: 'original-session',
      title: 'Work Complete',
      content: '## Work done\n\n- Feature A\n- Feature B'
    });

    // Resume
    const result = await continuousResumeCommand(vault, {});
    
    assert.ok(result.success);
    assert.ok(result.message.includes('Resumed'));
    assert.ok(result.handoff);
    assert.ok(result.session);
    assert.strictEqual(result.handoff.title, 'Work Complete');
  });

  test('should link to previous handoff', async () => {
    // Create handoff
    const handoff = await vault.createHandoff({
      sessionId: 'test-session',
      title: 'Phase 1 Complete',
      content: 'Phase 1 work finished'
    });

    // Resume
    const result = await continuousResumeCommand(vault, {});
    
    // Verify session note was created
    const sessionNote = await adapter.readNote(result.session.path);
    assert.ok(sessionNote.body.includes('[['));
    assert.ok(sessionNote.frontmatter.tags.includes('resume'));
  });

  test('handoff command should persist generated session id to tracker', async () => {
    const result = await handoffCommand(vault, {
      title: 'Tracked Handoff',
      content: 'Tracked content',
      tracker
    });

    assert.ok(result.success);

    const state = await tracker.getState();
    assert.ok(state.current_session_id);
    assert.strictEqual(state.latest_handoff_id, result.note.id);
  });

  test('resume command should update tracker state', async () => {
    const handoff = await vault.createHandoff({
      sessionId: 'resume-session',
      title: 'Resume Source',
      content: 'resume content'
    });

    const result = await continuousResumeCommand(vault, { tracker });
    assert.ok(result.success);

    const state = await tracker.getState();
    assert.strictEqual(state.current_session_id, 'resume-session');
    assert.strictEqual(state.latest_handoff_id, handoff.frontmatter.id);
  });
});

describe('Phase Command Routing', () => {
  let config, adapter, vault;

  beforeEach(async () => {
    await rm(TEST_VAULT, { recursive: true, force: true });
    await mkdir(TEST_VAULT, { recursive: true });
    
    config = new Config({ vaultPath: TEST_VAULT, useNotesmd: false });
    adapter = new FilesystemAdapter(config);
    vault = new VaultService(config, adapter);
    
    await vault.initialize();
  });

  afterEach(async () => {
    await rm(TEST_VAULT, { recursive: true, force: true });
  });

  test('should require subcommand', async () => {
    const result = await phaseCommand(vault, { _: [] });
    
    assert.strictEqual(result.success, false);
    assert.ok(result.message.includes('subcommand required'));
    assert.ok(result.message.includes('create|research|handoff'));
  });

  test('should reject invalid subcommand', async () => {
    const result = await phaseCommand(vault, { _: ['invalid'] });
    
    assert.strictEqual(result.success, false);
    assert.ok(result.message.includes('Unknown phase subcommand'));
    assert.ok(result.message.includes('invalid'));
  });

  test('should route to phase create', async () => {
    const result = await phaseCommand(vault, {
      _: ['create'],
      title: 'Authentication Phase',
      goal: 'Implement user authentication'
    });

    assert.ok(result.success);
    assert.strictEqual(result.message, 'Phase created');
    assert.ok(result.phase.id);
    assert.ok(result.phase.path);
  });

  test('should route to phase research', async () => {
    // Create phase first
    const phase = await vault.createPhase({
      phaseId: 'test-phase',
      title: 'Test Phase',
      goal: 'Test goal'
    });

    const result = await phaseCommand(vault, {
      _: ['research'],
      phaseId: 'test-phase',
      title: 'Research Notes',
      content: 'Research findings'
    });

    assert.ok(result.success);
    assert.strictEqual(result.message, 'Research note created');
    assert.ok(result.note.path);
    assert.strictEqual(result.note.phaseId, 'test-phase');
  });

  test('should route to phase handoff', async () => {
    // Create phase first
    await vault.createPhase({
      phaseId: 'test-phase',
      title: 'Test Phase',
      goal: 'Test goal'
    });

    const result = await phaseCommand(vault, {
      _: ['handoff'],
      phaseId: 'test-phase',
      title: 'Phase Complete',
      content: 'Phase completed successfully'
    });

    assert.ok(result.success);
    assert.strictEqual(result.message, 'Phase handoff created');
    assert.ok(result.note.path);
    assert.strictEqual(result.note.phaseId, 'test-phase');
  });

  test('phase research should require phaseId', async () => {
    const result = await phaseCommand(vault, {
      _: ['research'],
      title: 'Research Notes'
    });

    assert.strictEqual(result.success, false);
    assert.ok(result.message.includes('Phase ID is required'));
  });

  test('phase handoff should require phaseId', async () => {
    const result = await phaseCommand(vault, {
      _: ['handoff'],
      title: 'Handoff'
    });

    assert.strictEqual(result.success, false);
    assert.ok(result.message.includes('Phase ID is required'));
  });
});

describe('Vault Command Routing', () => {
  let config, adapter, vault, indexService, doctorService, pruneService;

  beforeEach(async () => {
    await rm(TEST_VAULT, { recursive: true, force: true });
    await mkdir(TEST_VAULT, { recursive: true });
    
    config = new Config({ vaultPath: TEST_VAULT, useNotesmd: false });
    adapter = new FilesystemAdapter(config);
    vault = new VaultService(config, adapter);
    indexService = new IndexService(config, adapter);
    doctorService = new DoctorService(config, adapter);
    pruneService = new PruneService(config, adapter);
    
    await vault.initialize();
  });

  afterEach(async () => {
    await rm(TEST_VAULT, { recursive: true, force: true });
  });

  test('should require subcommand', async () => {
    const result = await vaultCommand(indexService, doctorService, pruneService, vault, { _: [] });
    
    assert.strictEqual(result.success, false);
    assert.ok(result.message.includes('subcommand required'));
    assert.ok(result.message.includes('index|search|doctor|prune'));
  });

  test('should reject invalid subcommand', async () => {
    const result = await vaultCommand(indexService, doctorService, pruneService, vault, { _: ['invalid'] });
    
    assert.strictEqual(result.success, false);
    assert.ok(result.message.includes('Unknown vault subcommand'));
    assert.ok(result.message.includes('invalid'));
  });

  test('should route to vault index', async () => {
    // Create some test data
    await vault.createHandoff({
      sessionId: 'test-session',
      title: 'Test Handoff',
      content: 'Test content'
    });

    const result = await vaultCommand(indexService, doctorService, pruneService, vault, {
      _: ['index']
    });

    assert.ok(result.success);
    assert.ok(result.message.includes('Indexes regenerated'));
    assert.ok(result.indexes.catalog);
  });

  test('should route to vault search', async () => {
    // Create test note
    await vault.createHandoff({
      sessionId: 'test-session',
      title: 'Authentication Work',
      content: 'Implemented OAuth2 authentication'
    });

    const result = await vaultCommand(indexService, doctorService, pruneService, vault, {
      _: ['search', 'authentication']
    });

    assert.ok(result.success);
    assert.ok(Array.isArray(result.results));
  });

  test('should route to vault doctor', async () => {
    const result = await vaultCommand(indexService, doctorService, pruneService, vault, {
      _: ['doctor']
    });

    assert.ok(result.success);
    assert.ok(result.diagnostics);
    assert.ok(result.diagnostics.folders);
    assert.ok(result.diagnostics.indexes);
  });

  test('should route to vault prune', async () => {
    const result = await vaultCommand(indexService, doctorService, pruneService, vault, {
      _: ['prune'],
      days: 30,
      dryRun: true
    });

    assert.ok(result.success);
    assert.ok(result.result.summary);
  });

  test('vault search should require query', async () => {
    const result = await vaultCommand(indexService, doctorService, pruneService, vault, {
      _: ['search']
    });

    assert.strictEqual(result.success, false);
    assert.ok(result.message.includes('Query is required'));
  });

  test('should route to vault tracker', async () => {
    const tracker = new TrackerService(config);
    const result = await vaultCommand(indexService, doctorService, pruneService, vault, {
      _: ['tracker'],
      phase: 'phase-abc',
      tracker
    });

    assert.ok(result.success);
    assert.ok(result.message.includes('Active phase set'));
    assert.strictEqual(result.tracker.active_phase_id, 'phase-abc');
  });
});

describe('Deterministic Tracker', () => {
  let config, adapter, vault, tracker;

  beforeEach(async () => {
    await rm(TEST_VAULT, { recursive: true, force: true });
    await mkdir(TEST_VAULT, { recursive: true });

    config = new Config({ vaultPath: TEST_VAULT, useNotesmd: false });
    adapter = new FilesystemAdapter(config);
    vault = new VaultService(config, adapter);
    tracker = new TrackerService(config);

    await vault.initialize();
  });

  afterEach(async () => {
    await rm(TEST_VAULT, { recursive: true, force: true });
  });

  test('phase create should set active phase for deterministic routing', async () => {
    const created = await phaseCommand(vault, {
      _: ['create'],
      title: 'Tracked Phase',
      goal: 'Goal',
      tracker
    });

    const research = await phaseCommand(vault, {
      _: ['research'],
      title: 'Research without explicit phase',
      content: 'Findings',
      tracker
    });

    assert.ok(created.success);
    assert.ok(research.success);
    assert.strictEqual(research.note.phaseId, created.phase.id);

    const state = await tracker.getState();
    assert.strictEqual(state.active_phase_id, created.phase.id);
  });
});

describe('Legacy Continous Commands', () => {
  let config, adapter, vault;

  beforeEach(async () => {
    await rm(TEST_VAULT, { recursive: true, force: true });
    await mkdir(TEST_VAULT, { recursive: true });
    
    config = new Config({ vaultPath: TEST_VAULT, useNotesmd: false });
    adapter = new FilesystemAdapter(config);
    vault = new VaultService(config, adapter);
    
    await vault.initialize();
  });

  afterEach(async () => {
    await rm(TEST_VAULT, { recursive: true, force: true });
  });

  test('should create greenfield note via vault service', async () => {
    const greenfield = await vault.createGreenfieldNote({
      sessionId: 'greenfield-session',
      title: 'E-commerce Platform',
      content: '# Project\n\nBuild e-commerce site',
      tags: ['startup', 'mvp']
    });

    assert.ok(greenfield);
    assert.ok(greenfield.path);
    assert.strictEqual(greenfield.frontmatter.type, 'greenfield');
    assert.ok(greenfield.frontmatter.tags.includes('greenfield'));
    assert.ok(greenfield.frontmatter.tags.includes('planning'));
    assert.ok(greenfield.frontmatter.tags.includes('startup'));
    
    // Verify filename contains greenfield
    const filename = greenfield.path.split('/').pop();
    assert.match(filename, /--greenfield--/);
  });

  test('should create brownfield note via vault service', async () => {
    const brownfield = await vault.createBrownfieldNote({
      sessionId: 'brownfield-session',
      title: 'Legacy Analysis',
      content: '# Analysis\n\nOld codebase review',
      tags: ['legacy', 'refactor']
    });

    assert.ok(brownfield);
    assert.ok(brownfield.path);
    assert.strictEqual(brownfield.frontmatter.type, 'brownfield');
    assert.ok(brownfield.frontmatter.tags.includes('brownfield'));
    assert.ok(brownfield.frontmatter.tags.includes('analysis'));
    assert.ok(brownfield.frontmatter.tags.includes('legacy'));
    
    // Verify filename contains brownfield
    const filename = brownfield.path.split('/').pop();
    assert.match(filename, /--brownfield--/);
  });

  test('greenfield note should be in sessions directory', async () => {
    const greenfield = await vault.createGreenfieldNote({
      sessionId: 'test-session',
      title: 'Test Project',
      content: 'Test content',
      tags: []
    });

    assert.ok(greenfield.path.includes('sessions/'));
  });

  test('brownfield note should be in sessions directory', async () => {
    const brownfield = await vault.createBrownfieldNote({
      sessionId: 'test-session',
      title: 'Test Analysis',
      content: 'Test content',
      tags: []
    });

    assert.ok(brownfield.path.includes('sessions/'));
  });
});

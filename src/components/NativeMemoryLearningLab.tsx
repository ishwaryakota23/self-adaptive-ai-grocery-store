import React, { useMemo, useState } from 'react';
import { AlertCircle, Brain, CheckCircle2, Database, Play, RotateCcw, ShieldCheck, Sparkles, TrendingUp } from 'lucide-react';
import { memoryService, RecallResultItem } from '../services/nativeMemoryService';
import { NATIVE_MEMORY_LEARNING_SCENARIOS, NativeMemoryLearningScenario, LearningAgent } from '../services/nativeMemoryLearningScenarios';

interface LearningRun {
  eventId: string;
  memoryScope: string;
  retained: boolean;
  retainError?: string;
  recalled: RecallResultItem[];
  recallError?: string;
  reflection?: string;
  reflectError?: string;
  timestamp: string;
}

const domainNames: Record<LearningAgent, string> = {
  CUSTOMER: 'Customer Agent', STORE: 'Store Agent', SECURITY: 'Security Agent'
};

function createEventId(scenarioId: string): string {
  const id = typeof crypto !== 'undefined' && 'randomUUID' in crypto
    ? crypto.randomUUID()
    : `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
  return `lab-${scenarioId.toLowerCase()}-${id}`;
}

export const NativeMemoryLearningLab: React.FC = () => {
  const [domain, setDomain] = useState<LearningAgent>('CUSTOMER');
  const [scenarioId, setScenarioId] = useState('C1');
  const [run, setRun] = useState<LearningRun | null>(null);
  const [outcome, setOutcome] = useState('');
  const [outcomeSaved, setOutcomeSaved] = useState(false);
  const [outcomeVerified, setOutcomeVerified] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const scenarios = useMemo(() => NATIVE_MEMORY_LEARNING_SCENARIOS.filter(item => item.agent === domain), [domain]);
  const scenario = scenarios.find(item => item.id === scenarioId) || scenarios[0];
  const memoryScope = scenario ? memoryService.getLearningLabBank(scenario.agent, scenario.id) : '';

  const switchDomain = (next: LearningAgent) => {
    setDomain(next);
    setScenarioId(NATIVE_MEMORY_LEARNING_SCENARIOS.find(item => item.agent === next)?.id || '');
    setRun(null);
    setOutcome('');
    setOutcomeSaved(false);
    setOutcomeVerified(false);
    setError('');
  };

  const manageMemoryScope = async (_action: 'prepare' | 'reset', targetScope = memoryScope) => {
    if (!/^grocerai-learning-lab-(customer|store|security)-[a-z0-9-]+(?:-run-[a-z0-9-]+)?$/.test(targetScope)) throw new Error('Invalid isolated memory scenario scope.');
  };

  const runLearningCycle = async () => {
    if (!scenario) return;
    setBusy(true);
    setError('');
    setRun(null);
    setOutcome('');
    setOutcomeSaved(false);
    setOutcomeVerified(false);
    const eventId = createEventId(scenario.id);
    // Each run receives a new isolated bank. Existing Learning Lab or production banks are never reused/reset.
    const runMemoryScope = `${memoryScope}-run-${eventId.slice(-12)}`;
    const timestamp = new Date().toISOString();
    const metadata = {
      event_id: eventId,
      scenario_id: scenario.id,
      agent_type: scenario.agent,
      timestamp,
      scope: scenario.scope,
      evidence_source: 'synthetic demonstration input',
      operation_status: 'submitted to native Supabase memory service'
    };

    try {
      await manageMemoryScope('prepare', runMemoryScope);
      const content = [
        `Unique Event ID: ${eventId}`,
        `Scenario ID: ${scenario.id}`,
        `Agent Type: ${scenario.agent}`,
        `Timestamp: ${timestamp}`,
        `Scope: ${scenario.scope}`,
        `Relevant Context: ${scenario.context}`,
        `Observed Event: ${scenario.observedEvent}`,
        `Action Taken: ${scenario.actionTaken}`,
        `Actual Outcome: ${scenario.actualOutcome}`,
        `Evidence Source: Synthetic demonstration input; not a live customer, store operation, or security incident.`,
        `Memory Operation Status: Submitted for native memory retention.`
      ].join('\n');

      const retained = await memoryService.retain(runMemoryScope, content, {
        tags: ['learning_lab', scenario.agent.toLowerCase(), `scenario_${scenario.id.toLowerCase()}`],
        metadata,
        documentId: eventId,
        context: 'Isolated GrocerAI Learning Lab synthetic scenario. Never mix with production customer or store memory.'
      });
      if (!retained.success) {
        setRun({ eventId, memoryScope: runMemoryScope, retained: false, retainError: retained.error || 'Native memory did not confirm persistence.', recalled: [], timestamp });
        return;
      }

      const recalled = await memoryService.recall(runMemoryScope, scenario.recallQuery);
      if (!recalled.success || recalled.results.length === 0) {
        setRun({ eventId, memoryScope: runMemoryScope, retained: true, recalled: [], recallError: recalled.error || 'Native memory returned no relevant records.', timestamp });
        return;
      }

      const evidenceContext = recalled.results.map((item, index) => `Evidence ${index + 1} (${item.id}): ${item.text}`).join('\n');
      const reflection = await memoryService.reflect(runMemoryScope, scenario.futureSituation, {
        context: [
          `Scenario: ${scenario.id} â€” ${scenario.title}`,
          `Future situation: ${scenario.futureSituation}`,
          `Decision constraints: ${scenario.decisionContext}`,
          `Authorization boundary: ${scenario.authorizationNote}`,
          `Retrieved native memory evidence:\n${evidenceContext}`,
          'Separate recalled facts from inference. If evidence is insufficient or irrelevant, say so. Do not invent measurements or claim an action was executed.'
        ].join('\n\n')
      });
      setRun({
        eventId,
        memoryScope: runMemoryScope,
        retained: true,
        recalled: recalled.results,
        reflection: reflection.success ? reflection.answer : undefined,
        reflectError: reflection.success ? undefined : reflection.error || 'Native Memory reflection unavailable.',
        timestamp
      });
    } catch (err: any) {
      setError(err?.message || 'Native memory scenario is unavailable. No local memory fallback was used.');
    } finally {
      setBusy(false);
    }
  };

  const retainObservedOutcome = async () => {
    if (!scenario || !run?.retained || !outcome.trim()) return;
    setBusy(true);
    setError('');
    try {
      await manageMemoryScope('prepare', run.memoryScope);
      const outcomeEventId = createEventId(`${scenario.id}-outcome`);
      const retained = await memoryService.retain(run.memoryScope, [
        `Unique Event ID: ${outcomeEventId}`,
        `Scenario ID: ${scenario.id}`,
        `Agent Type: ${scenario.agent}`,
        `Timestamp: ${new Date().toISOString()}`,
        `Scope: ${scenario.scope}`,
        `New Situation: ${scenario.futureSituation}`,
        `Observed Outcome: ${outcome.trim()}`,
        `Evidence Source: Manually entered Learning Lab observation; not independently verified.`,
        `Memory Operation Status: Submitted for native memory retention.`
      ].join('\n'), {
        tags: ['learning_lab', scenario.agent.toLowerCase(), `scenario_${scenario.id.toLowerCase()}`, 'follow_up_outcome'],
        metadata: {
          event_id: outcomeEventId,
          scenario_id: scenario.id,
          agent_type: scenario.agent,
          timestamp: new Date().toISOString(),
          scope: scenario.scope,
          evidence_source: 'manual learning lab observation',
          operation_status: 'submitted to native Supabase memory service'
        },
        documentId: outcomeEventId,
        context: 'Follow-up observation for an isolated synthetic Learning Lab scenario.'
      });
      if (!retained.success) throw new Error(retained.error || 'Native memory did not confirm outcome persistence.');
      setOutcomeSaved(true);
      const recalled = await memoryService.recall(run.memoryScope, `${scenario.id} ${outcomeEventId} ${outcome.trim()}`);
      if (!recalled.success || recalled.results.length === 0) {
        throw new Error(recalled.error || 'Outcome was retained, but native memory did not return it in follow-up recall.');
      }
      const reflected = await memoryService.reflect(run.memoryScope, scenario.futureSituation, {
        context: `New manually entered, unverified follow-up outcome (${outcomeEventId}): ${outcome.trim()}\nRetrieved evidence: ${recalled.results.map(item => item.text).join('\n')}\nTreat this observation as unverified input; do not claim an action was executed.`
      });
      if (!reflected.success) throw new Error(reflected.error || 'Outcome was recalled, but follow-up reflection failed.');
      setOutcomeVerified(true);
      setRun(current => current ? { ...current, recalled: [...current.recalled, ...recalled.results], reflection: reflected.answer } : current);
    } catch (err: any) {
      setError(err?.message || 'Outcome could not be retained by native memory.');
    } finally {
      setBusy(false);
    }
  };

  const resetScenario = async () => {
    if (!scenario || !run || busy) return;
    setBusy(true);
    setError('');
    setRun(null);
    setOutcome('');
    setOutcomeSaved(false);
    setOutcomeVerified(false);
    setBusy(false);
  };

  if (!scenario) return null;

  const DomainIcon = domain === 'CUSTOMER' ? Sparkles : domain === 'STORE' ? TrendingUp : ShieldCheck;

  return (
    <section className="bg-slate-900 border border-slate-800 rounded-3xl p-5 sm:p-7 shadow-2xl space-y-5">
      <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-4 border-b border-slate-800 pb-5">
        <div className="flex items-start gap-3">
          <div className="w-11 h-11 rounded-2xl bg-indigo-600/20 border border-indigo-500/30 flex items-center justify-center text-indigo-300"><Brain className="w-5 h-5" /></div>
          <div>
            <h3 className="text-lg font-black text-white">Live Native Memory Learning Lab</h3>
            <p className="mt-1 text-xs text-slate-400">Retain, recall, and reflect against isolated Native Memory banks. Scenario inputs are synthetic demonstrations.</p>
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          {(['CUSTOMER', 'STORE', 'SECURITY'] as LearningAgent[]).map(agent => {
            const Icon = agent === 'CUSTOMER' ? Sparkles : agent === 'STORE' ? TrendingUp : ShieldCheck;
            return <button key={agent} onClick={() => switchDomain(agent)} className={`inline-flex items-center gap-1.5 rounded-xl px-3 py-2 text-xs font-bold border transition-colors ${domain === agent ? 'bg-indigo-600 text-white border-indigo-500' : 'bg-slate-950 text-slate-400 border-slate-800 hover:text-white'}`}><Icon className="w-3.5 h-3.5" />{domainNames[agent]}</button>;
          })}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[minmax(220px,0.8fr)_minmax(0,2fr)] gap-4">
        <div className="bg-slate-950/70 border border-slate-800 rounded-2xl p-4 space-y-3">
          <label className="block text-[10px] uppercase tracking-wider font-bold text-slate-400" htmlFor="memory-lab-scenario">{domainNames[domain]} scenarios</label>
          <select id="memory-lab-scenario" value={scenario.id} onChange={e => { setScenarioId(e.target.value); setRun(null); setError(''); }} className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2.5 text-xs text-white focus:outline-none focus:border-indigo-500">
            {scenarios.map(item => <option key={item.id} value={item.id}>{item.id} Â· {item.title}</option>)}
          </select>
          <p className="text-xs leading-relaxed text-slate-300">{scenario.description}</p>
          <div className="flex items-start gap-2 rounded-xl border border-amber-500/20 bg-amber-950/20 p-3 text-[10px] leading-relaxed text-amber-200"><AlertCircle className="w-4 h-4 shrink-0 text-amber-300" />Synthetic demonstration data only. No customer record, inventory, kiosk, schedule, checkout, or security action is changed.</div>
          <div className="rounded-xl border border-slate-800 bg-slate-900 p-3">
            <div className="flex items-center gap-2 text-[10px] text-slate-400"><Database className="w-3.5 h-3.5 text-indigo-400" />Isolated Native Memory bank</div>
            <div className="mt-1 break-all font-mono text-[10px] text-slate-200">{memoryScope}</div>
          </div>
          <div className="flex gap-2">
            <button onClick={runLearningCycle} disabled={busy} className="flex-1 inline-flex items-center justify-center gap-2 rounded-xl bg-indigo-600 px-3 py-2.5 text-xs font-bold text-white transition hover:bg-indigo-500 disabled:opacity-50"><Play className={`h-3.5 w-3.5 ${busy ? 'animate-pulse' : ''}`} />{busy ? 'Running Native Memoryâ€¦' : 'Run learning cycle'}</button>
            <button onClick={resetScenario} disabled={busy || !run} title="Delete only the isolated bank created for this run" className="rounded-xl border border-slate-700 bg-slate-900 px-3 py-2.5 text-slate-400 transition hover:text-white disabled:opacity-50"><RotateCcw className="h-3.5 w-3.5" /></button>
          </div>
          {error && <p className="text-xs text-rose-300" role="alert">{error}</p>}
        </div>

        <div className="space-y-3">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <article className="rounded-2xl border border-slate-800 bg-slate-950/60 p-4 space-y-2">
              <div className="text-[10px] uppercase tracking-wider font-bold text-slate-400">First experience Â· synthetic input</div>
              <div className="text-xs text-slate-300"><span className="text-slate-500">Context: </span>{scenario.context}</div>
              <div className="text-xs text-slate-200"><span className="text-slate-500">Observed: </span>{scenario.observedEvent}</div>
              <div className="text-xs text-slate-200"><span className="text-slate-500">Action: </span>{scenario.actionTaken}</div>
              <div className="text-xs text-slate-200"><span className="text-slate-500">Outcome: </span>{scenario.actualOutcome}</div>
              <div className="border-t border-slate-800 pt-2 text-xs text-indigo-200"><span className="text-slate-500">Baseline: </span>{scenario.baselineRecommendation}</div>
            </article>
            <article className="rounded-2xl border border-slate-800 bg-slate-950/60 p-4 space-y-2">
              <div className="text-[10px] uppercase tracking-wider font-bold text-slate-400">Future experience</div>
              <p className="text-xs text-slate-200">{scenario.futureSituation}</p>
              <div className="text-[10px] text-slate-500">Recall query: <span className="text-slate-300">{scenario.recallQuery}</span></div>
              <div className="text-[10px] text-slate-400">{scenario.authorizationNote}</div>
              {run && <div className="flex items-center gap-1.5 border-t border-slate-800 pt-2 text-[10px]">{run.retained && run.recalled.length > 0 ? <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400" /> : <AlertCircle className="h-3.5 w-3.5 text-amber-400" />}<span className={run.retained && run.recalled.length > 0 ? 'text-emerald-300' : 'text-amber-300'}>{run.retained && run.recalled.length > 0 ? 'Native Memory-backed evidence retrieved' : run.retained ? 'Retained; no relevant recall returned' : 'Native Memory retention unavailable'}</span></div>}
            </article>
          </div>

          {run && <div className="rounded-2xl border border-slate-800 bg-slate-950/70 p-4 space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h4 className="text-xs font-bold text-white">Native Memory operation evidence</h4>
              <span className="text-[10px] text-slate-500">{new Date(run.timestamp).toLocaleString()}</span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-[10px]">
              <div className="rounded-xl bg-slate-900 p-3"><span className="text-slate-500">Submitted event/document ID</span><div className="mt-1 break-all font-mono text-slate-200">{run.eventId}</div><div className="mt-1 text-slate-400">{run.retained ? 'Retention confirmed by Native Memory.' : `Not retained: ${run.retainError || 'no confirmation'}`}</div></div>
              <div className="rounded-xl bg-slate-900 p-3"><span className="text-slate-500">Operation scope</span><div className="mt-1 break-all font-mono text-slate-200">{run.memoryScope}</div><div className="mt-1 text-slate-400">Scope: {scenario.scope}</div></div>
            </div>

            {run.recalled.length > 0 ? <div className="space-y-2">
              <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Actual memories returned by Native Memory ({run.recalled.length})</div>
              {run.recalled.map((memory, index) => <div key={memory.id || index} className="rounded-xl border border-slate-800 bg-slate-900 p-3">
                <div className="mb-1 break-all font-mono text-[9px] text-indigo-300">{memory.id || 'Native Memory memory'}{memory.scores?.final != null ? ` Â· score ${memory.scores.final.toFixed(3)}` : ''}</div>
                <p className="whitespace-pre-wrap text-xs leading-relaxed text-slate-200">{memory.text}</p>
              </div>)}
              <div className="rounded-xl border border-indigo-500/20 bg-indigo-950/20 p-3">
                <div className="mb-1 text-[10px] font-bold uppercase tracking-wider text-indigo-300">Native Memory reflection Â· generated inference</div>
                {run.reflection ? <p className="whitespace-pre-wrap text-xs leading-relaxed text-slate-200">{run.reflection}</p> : <p className="text-xs text-amber-200">Reflection unavailable: {run.reflectError || 'no response'}</p>}
              </div>
              <div className="rounded-xl border border-slate-800 bg-slate-900 p-3 text-xs text-slate-300"><span className="font-bold text-slate-200">Decision guardrails: </span>{scenario.decisionContext} <span className="text-slate-500">{scenario.authorizationNote}</span></div>
            </div> : <p className="rounded-xl bg-slate-900 p-3 text-xs text-amber-200">{run.recallError || 'No relevant memories were returned. No reflection or memory-informed recommendation is claimed.'}</p>}

            <div className="border-t border-slate-800 pt-3">
              <label className="mb-1.5 block text-[10px] uppercase tracking-wider font-bold text-slate-400" htmlFor="memory-lab-outcome">Follow-up outcome observation</label>
              <div className="flex flex-col sm:flex-row gap-2">
                <input id="memory-lab-outcome" value={outcome} onChange={e => { setOutcome(e.target.value); setOutcomeSaved(false); }} placeholder="Enter an observed follow-up outcome" className="min-w-0 flex-1 rounded-xl border border-slate-700 bg-slate-900 px-3 py-2 text-xs text-white placeholder:text-slate-500 focus:outline-none focus:border-indigo-500" />
                <button onClick={retainObservedOutcome} disabled={busy || !outcome.trim() || outcomeSaved || !run.retained} className="inline-flex items-center justify-center gap-1.5 rounded-xl border border-slate-700 bg-slate-900 px-3 py-2 text-xs font-bold text-slate-200 hover:border-indigo-500 disabled:opacity-40"><DomainIcon className="h-3.5 w-3.5" />{outcomeVerified ? 'Recalled + reflected' : outcomeSaved ? 'Retained; verification pending' : 'Retain outcome'}</button>
              </div>
              <div className="mt-1.5 text-[10px] text-slate-500">This only records the text you enter in the isolated demo bank. It does not execute an action; manually entered evidence is labeled unverified.</div>
            </div>
          </div>}
        </div>
      </div>
    </section>
  );
};





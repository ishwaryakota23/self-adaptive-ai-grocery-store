import { getSupabaseAdminClient } from './supabaseAdmin.js';
import { reflectOnRecords, sanitizeMemoryMetadata, sanitizeMemoryText, scoreMemory } from './memoryRules.js';
export { reflectOnRecords, sanitizeMemoryMetadata, sanitizeMemoryText, scoreMemory } from './memoryRules.js';

export type MemoryAgent = 'customer' | 'store' | 'security';
export interface MemoryInput {
  agent: MemoryAgent;
  content: string;
  kind?: string;
  userId?: string;
  sessionId?: string;
  branchId?: string;
  metadata?: Record<string, unknown>;
}
export interface MemoryRecord extends MemoryInput { id: string; createdAt: string; score?: number }
export interface MemoryResult { success: boolean; memory?: MemoryRecord; error?: string }
export interface RecallResult { success: boolean; memories: MemoryRecord[]; error?: string }
let clientProvider = getSupabaseAdminClient;
/** Test seam for exercising database failures and isolation without a live project. */
export function setMemoryClientProviderForTests(provider?: typeof getSupabaseAdminClient): void {
  clientProvider = provider || getSupabaseAdminClient;
}

export async function storeMemory(input: MemoryInput): Promise<MemoryResult> {
  const content = sanitizeMemoryText(input.content).trim();
  if (!content || content.length < 8) return { success: false, error: 'Memory content is empty or too short.' };
  if (input.agent === 'customer' && !input.userId) return { success: false, error: 'Customer memory requires a verified user scope.' };
  if (input.agent !== 'customer' && !input.branchId) return { success: false, error: 'Operational memory requires a branch scope.' };
  const client = clientProvider();
  if (!client) return { success: false, error: 'Supabase memory storage is not configured.' };
  try {
  const { data, error } = await client.from('grocerai_memories').insert({
    agent: input.agent, user_id: input.userId || null, session_id: input.sessionId || null,
    branch_id: input.branchId || null, kind: sanitizeMemoryText(input.kind || 'experience').slice(0, 80), content,
    metadata: sanitizeMemoryMetadata(input.metadata)
  }).select('id,agent,user_id,session_id,branch_id,kind,content,metadata,created_at').single();
  if (error || !data) return { success: false, error: error?.message || 'Supabase did not confirm memory persistence.' };
  return { success: true, memory: mapRow(data) };
  } catch (error: any) {
    return { success: false, error: error?.message || 'Supabase memory storage failed.' };
  }
}

function mapRow(row: any): MemoryRecord {
  return { id: row.id, agent: row.agent, userId: row.user_id || undefined, sessionId: row.session_id || undefined,
    branchId: row.branch_id || undefined, kind: row.kind, content: row.content, metadata: row.metadata || {}, createdAt: row.created_at };
}

export async function recallMemories(input: { agent: MemoryAgent; query: string; userId?: string; sessionId?: string; branchId?: string; limit?: number }): Promise<RecallResult> {
  if (input.agent === 'customer' && !input.userId) return { success: false, memories: [], error: 'Customer recall requires a verified user scope.' };
  const client = clientProvider();
  if (!client) return { success: false, memories: [], error: 'Supabase memory storage is not configured.' };
  try {
  let request = client.from('grocerai_memories').select('id,agent,user_id,session_id,branch_id,kind,content,metadata,created_at')
    .eq('agent', input.agent).textSearch('search_document', input.query, { type: 'websearch', config: 'simple' })
    .order('created_at', { ascending: false }).limit(Math.min(input.limit || 20, 50));
  if (input.agent === 'customer') request = request.eq('user_id', input.userId);
  if (input.sessionId) request = input.agent === 'customer'
    ? request.or(`session_id.is.null,session_id.eq.${input.sessionId}`)
    : request.eq('session_id', input.sessionId);
  if (input.branchId) request = request.eq('branch_id', input.branchId);
  const { data, error } = await request;
  if (error) return { success: false, memories: [], error: error.message };
  const terms = (input.query.match(/[\p{L}\p{N}]{2,}/gu) || []).length;
  const memories = (data || []).map((row: any) => ({ ...mapRow(row), score: scoreMemory(input.query, row.content, row.kind) + (terms ? 0.2 : 0) }))
    .filter((item: MemoryRecord) => item.score! > 0).sort((a: MemoryRecord, b: MemoryRecord) => b.score! - a.score!).slice(0, input.limit || 8);
  return { success: true, memories };
  } catch (error: any) {
    return { success: false, memories: [], error: error?.message || 'Supabase memory recall failed.' };
  }
}

export async function reflectOnHistory(input: Parameters<typeof recallMemories>[0]): Promise<{ success: boolean; reflections: string[]; error?: string }> {
  const recalled = await recallMemories({ ...input, limit: 50 });
  return recalled.success ? { success: true, reflections: reflectOnRecords(recalled.memories) } : { success: false, reflections: [], error: recalled.error };
}

export async function getRelevantContext(input: Parameters<typeof recallMemories>[0]): Promise<{ success: boolean; context: string; memories: MemoryRecord[]; reflections: string[]; error?: string }> {
  const [recall, reflection] = await Promise.all([recallMemories(input), reflectOnHistory(input)]);
  const memories = recall.memories;
  return { success: recall.success, memories, reflections: reflection.reflections,
    context: [...memories.map(m => `- [${m.kind}] ${m.content}`), ...reflection.reflections.map(r => `- Reflection: ${r}`)].join('\n'),
    error: recall.error || reflection.error };
}

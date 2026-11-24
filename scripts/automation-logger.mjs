
import { createClient } from '@supabase/supabase-js';

// ==========================================
// VICE HUB 3.6
// Automation Logger
// ==========================================

const SERVICES = [
  'autonews',
  'autoimages',
  'autoguides',
  'autocategories'
];

const COUNTERS = [
  'api_calls',
  'input_tokens',
  'output_tokens',
  'total_tokens',
  'cached_tokens',
  'images_generated',
  'articles_detected',
  'articles_published',
  'drafts_created',
  'guides_created',
  'guides_updated',
  'articles_classified',
  'images_linked'
];

function getDatabase() {

  if (
    !process.env.SUPABASE_URL ||
    !process.env.SUPABASE_SERVICE_ROLE_KEY
  ) {
    throw new Error(
      'Faltan credenciales de Supabase'
    );
  }

  return createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY,
    {
      auth: {
        persistSession: false,
        autoRefreshToken: false
      }
    }
  );
}

// Evitar almacenar credenciales en registros.

function safeMessage(value) {

  let message = String(
    value?.message || value || ''
  );

  for (const key of [
    'OPENAI_API_KEY',
    'SUPABASE_SERVICE_ROLE_KEY',
    'INSTAGRAM_ACCESS_TOKEN'
  ]) {

    const secret = process.env[key];

    if (secret) {
      message = message
        .split(secret)
        .join('[OCULTO]');
    }
  }

  return message
    .replace(
      /sk-[A-Za-z0-9_-]{8,}/g,
      '[OCULTO]'
    )
    .slice(0, 2000);
}

function number(value) {

  const n = Number(value);

  return Number.isFinite(n) && n >= 0
    ? Math.trunc(n)
    : 0;
}

// ==========================================
// INICIAR REGISTRO
// ==========================================

export async function startAutomation(
  service,
  options = {}
) {

  if (!SERVICES.includes(service)) {
    throw new Error(
      `Servicio desconocido: ${service}`
    );
  }

  const started = Date.now();

  const counters = Object.fromEntries(
    COUNTERS.map(key => [key, 0])
  );

  let db = null;
  let runId = null;
  let finished = false;
  let pendingImages = null;
  let estimatedCost = null;

  let model =
    options.model ||
    process.env.OPENAI_MODEL ||
    null;

  let metadata = {};

  const githubRunId =
    process.env.GITHUB_RUN_ID || null;

  const repository =
    process.env.GITHUB_REPOSITORY || null;

  const githubRunUrl =
    githubRunId && repository
      ? `https://github.com/${repository}/actions/runs/${githubRunId}`
      : null;

  try {

    db = getDatabase();

    const { data, error } = await db
      .from('automation_runs')
      .insert({
        service,
        status: 'running',
        started_at:
          new Date(started).toISOString(),
        trigger_type:
          process.env.GITHUB_EVENT_NAME ||
          'manual',
        github_run_id: githubRunId,
        github_run_url: githubRunUrl,
        model
      })
      .select('id')
      .single();

    if (error) throw error;

    runId = data.id;

    console.log(
      `[LOGGER] Iniciado ${service}: ${runId}`
    );

  } catch (error) {

    console.warn(
      '[LOGGER] No se pudo iniciar:',
      safeMessage(error)
    );
  }

  // ========================================
  // CONTADORES
  // ========================================

  function increment(key, amount = 1) {

    if (!COUNTERS.includes(key)) {
      return;
    }

    counters[key] += number(amount);
  }

  function set(key, value) {

    if (!COUNTERS.includes(key)) {
      return;
    }

    counters[key] = number(value);
  }

  function setModel(value) {

    model = String(value || '')
      .slice(0, 100);
  }

  function setPendingImages(value) {

    pendingImages = number(value);
  }

  function setMetadata(value = {}) {

    metadata = {
      ...metadata,
      ...value
    };
  }

  // ========================================
  // REGISTRAR LLAMADA A OPENAI
  // ========================================

  function apiCall() {

    increment('api_calls');
  }

  // ========================================
  // REGISTRAR CONSUMO DE TOKENS
  // ========================================

  function recordUsage(usage = {}) {

    if (!usage) return;

    const input = number(
      usage.input_tokens ??
      usage.prompt_tokens
    );

    const output = number(
      usage.output_tokens ??
      usage.completion_tokens
    );

    const total = number(
      usage.total_tokens ??
      input + output
    );

    const cached = number(
      usage.input_tokens_details
        ?.cached_tokens ??
      usage.prompt_tokens_details
        ?.cached_tokens
    );

    increment('input_tokens', input);
    increment('output_tokens', output);
    increment('total_tokens', total);
    increment('cached_tokens', cached);
  }

  // ========================================
  // REGISTRAR COSTE ESTIMADO
  // ========================================

  function addEstimatedCost(usd) {

    const value = Number(usd);

    if (
      usd !== null &&
      usd !== undefined &&
      Number.isFinite(value) &&
      value >= 0
    ) {

      estimatedCost =
        (estimatedCost ?? 0) + value;
    }
  }

  // ========================================
  // GUARDAR PROGRESO
  // ========================================

  async function checkpoint() {

    if (!db || !runId || finished) {
      return;
    }

    try {

      const { error } = await db
        .from('automation_runs')
        .update({
          ...counters,
          model,
          pending_images: pendingImages,
          estimated_cost_usd: estimatedCost,
          duration_ms: Date.now() - started,
          metadata
        })
        .eq('id', runId);

      if (error) throw error;

    } catch (error) {

      console.warn(
        '[LOGGER] Error guardando progreso:',
        safeMessage(error)
      );
    }
  }

  // ========================================
  // FINALIZAR REGISTRO
  // ========================================

  async function finish(
    status = 'success',
    message = '',
    error = null
  ) {

    if (finished) return;

    if (
      !['success', 'error', 'skipped']
        .includes(status)
    ) {
      status = 'error';
    }

    const duration = Date.now() - started;

    const result = {

      ...counters,

      status,

      model,

      finished_at:
        new Date().toISOString(),

      duration_ms: duration,

      pending_images: pendingImages,

      estimated_cost_usd: estimatedCost,

      message: safeMessage(message),

      error_message:
        error ? safeMessage(error) : null,

      metadata
    };

    console.log(
      '[LOGGER] Resumen:',
      JSON.stringify({
        service,
        ...result
      })
    );

    if (!db || !runId) {
      finished = true;
      return;
    }

    try {

      const { error: updateError } = await db
        .from('automation_runs')
        .update(result)
        .eq('id', runId);

      if (updateError) throw updateError;

      finished = true;

      console.log(
        '[LOGGER] Registro guardado.'
      );

    } catch (error) {

      console.warn(
        '[LOGGER] Error finalizando:',
        safeMessage(error)
      );
    }
  }

  // ========================================
  // MÉTODOS DISPONIBLES
  // ========================================

  return {

    id: runId,

    increment,

    set,

    setModel,

    setPendingImages,

    setMetadata,

    apiCall,

    recordUsage,

    addEstimatedCost,

    checkpoint,

    finish,

    success(message = '') {
      return finish('success', message);
    },

    skip(message = '') {
      return finish('skipped', message);
    },

    fail(error) {
      return finish(
        'error',
        'Ejecución fallida',
        error
      );
    },

    getCounters() {
      return { ...counters };
    }

  };
}

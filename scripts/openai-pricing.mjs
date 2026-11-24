
// ==========================================
// VICE HUB 3.6
// Calculador de costes OpenAI
// Tarifas estándar en USD
// ==========================================

export const PRICING_VERSION =
  '2026-11-24';

export const TEXT_PRICES = {

  'gpt-4o-mini': {
    input: 0.15,
    cached: 0.075,
    output: 0.60
  },

  'gpt-4o-mini-2024-07-18': {
    input: 0.15,
    cached: 0.075,
    output: 0.60
  }
};

export const IMAGE_PRICES = {

  'gpt-image-2': {
    textInput: 5,
    textCached: 1.25,
    imageInput: 8,
    imageCached: 2,
    imageOutput: 30
  },

  'gpt-image-2.5-sunburst': {
    textInput: 5,
    textCached: 1.25,
    imageInput: 8,
    imageCached: 2,
    imageOutput: 30
  },

  'gpt-image-2.5-flare': {
    textInput: 5,
    textCached: 1.25,
    imageInput: 8,
    imageCached: 2,
    imageOutput: 30
  },

  'gpt-image-2.6-sunburst': {
    textInput: 5,
    textCached: 1.25,
    imageInput: 8,
    imageCached: 2,
    imageOutput: 30
  },

  'gpt-image-2.6-flare': {
    textInput: 5,
    textCached: 1.25,
    imageInput: 8,
    imageCached: 2,
    imageOutput: 30
  }
};

// ==========================================
// UTILIDADES
// ==========================================

function valid(value) {

  return typeof value === 'number' &&
    Number.isFinite(value) &&
    value >= 0;
}

function unknown(reason) {

  return {
    usd: null,
    complete: false,
    reason
  };
}

// ==========================================
// CALCULAR COSTE
// ==========================================

export function calculateOpenAICost(
  model,
  usage,
  options = {}
) {

  if (!usage) {

    return unknown(
      'Consumo no disponible'
    );
  }

  const name = String(model || '')
    .trim()
    .toLowerCase();

  const input =
    usage.input_tokens ??
    usage.prompt_tokens;

  const output =
    usage.output_tokens ??
    usage.completion_tokens;

  if (
    !valid(input) ||
    !valid(output)
  ) {

    return unknown(
      'Tokens insuficientes'
    );
  }

  const inputDetails =
    usage.input_tokens_details ??
    usage.prompt_tokens_details ??
    {};

  const cached =
    inputDetails.cached_tokens ?? 0;

  if (
    !valid(cached) ||
    cached > input
  ) {

    return unknown(
      'Datos de caché incoherentes'
    );
  }

  // ========================================
  // MODELOS DE TEXTO
  // ========================================

  if (Object.hasOwn(TEXT_PRICES, name)) {

    const prices = TEXT_PRICES[name];

    const inputCost =
      (input - cached) * prices.input;

    const cachedCost =
      cached * prices.cached;

    const outputCost =
      output * prices.output;

    return {

      usd: (
        inputCost +
        cachedCost +
        outputCost
      ) / 1000000,

      complete: true,

      model: name,

      pricingVersion: PRICING_VERSION
    };
  }

  // ========================================
  // MODELOS DE IMAGEN
  // ========================================

  if (Object.hasOwn(IMAGE_PRICES, name)) {

    const prices =
      IMAGE_PRICES[name];

    let textTokens =
      inputDetails.text_tokens;

    let imageTokens =
      inputDetails.image_tokens;

    // AutoImages genera imágenes
    // exclusivamente desde texto.

    if (
      options.textOnlyImage === true &&
      imageTokens === undefined
    ) {

      imageTokens = 0;
    }

    if (
      options.textOnlyImage === true &&
      textTokens === undefined &&
      imageTokens === 0
    ) {

      textTokens = input;
    }

    if (
      !valid(textTokens) ||
      !valid(imageTokens) ||
      textTokens + imageTokens !== input
    ) {

      return unknown(
        'Desglose de tokens de imagen insuficiente'
      );
    }

    let cachedText = 0;
    let cachedImage = 0;

    if (cached > 0) {

      if (imageTokens === 0) {

        cachedText = cached;

      } else if (textTokens === 0) {

        cachedImage = cached;

      } else {

        cachedText =
          inputDetails.cached_tokens_details
            ?.text_tokens;

        cachedImage =
          inputDetails.cached_tokens_details
            ?.image_tokens;

        if (
          !valid(cachedText) ||
          !valid(cachedImage) ||
          cachedText > textTokens ||
          cachedImage > imageTokens ||
          cachedText + cachedImage !== cached
        ) {

          return unknown(
            'Desglose de caché insuficiente'
          );
        }
      }
    }

    const outputDetails =
      usage.output_tokens_details;

    const imageOutput =
      outputDetails?.image_tokens ?? output;

    if (
      !valid(imageOutput) ||
      imageOutput !== output
    ) {

      return unknown(
        'Desglose de salida no compatible'
      );
    }

    const textCost =
      (textTokens - cachedText) *
      prices.textInput;

    const textCacheCost =
      cachedText * prices.textCached;

    const imageCost =
      (imageTokens - cachedImage) *
      prices.imageInput;

    const imageCacheCost =
      cachedImage * prices.imageCached;

    const outputCost =
      imageOutput * prices.imageOutput;

    return {

      usd: (
        textCost +
        textCacheCost +
        imageCost +
        imageCacheCost +
        outputCost
      ) / 1000000,

      complete: true,

      model: name,

      pricingVersion: PRICING_VERSION
    };
  }

  // No asignar precios inventados
  // a modelos desconocidos.

  return unknown(
    `Tarifa no configurada: ${name}`
  );
}

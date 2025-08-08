// Centralized error mapping utility
// Returns a standardized { status, code, message }

export function mapError(error, options = {}) {
  const ctx = options.context;
  const statusFrom = error?.status || error?.$metadata?.httpStatusCode || error?.response?.status;
  const name = error?.name || error?.code;
  const msg = error?.message || String(error);

  // JSON parse errors (e.g., AI response parsing)
  if (error instanceof SyntaxError && (ctx === 'ai-parse' || /JSON/i.test(msg))) {
    return {
      status: 502,
      code: 'AI_RESPONSE_PARSE_ERROR',
      message: 'Failed to parse AI analysis response',
    };
  }

  // Mongoose / Mongo errors
  if (name === 'ValidationError') {
    return { status: 400, code: 'DB_VALIDATION_ERROR', message: msg };
  }
  if (name === 'CastError') {
    return { status: 400, code: 'DB_CAST_ERROR', message: 'Invalid identifier format' };
  }
  if (name === 'MongoServerError' && error?.code === 11000) {
    return { status: 409, code: 'DB_DUPLICATE_KEY', message: 'Duplicate key error' };
  }

  // JWT / Auth token errors (defensive; may be thrown from middleware)
  if (name === 'JsonWebTokenError') {
    return { status: 401, code: 'AUTH_TOKEN_INVALID', message: 'Invalid authentication token' };
  }
  if (name === 'TokenExpiredError') {
    return { status: 401, code: 'AUTH_TOKEN_EXPIRED', message: 'Authentication token has expired' };
  }

  // Anthropic AI errors
  if (ctx === 'anthropic') {
    if (statusFrom === 401 || statusFrom === 403) {
      return { status: 500, code: 'AI_AUTH_ERROR', message: 'AI service authentication failed.' };
    }
    if (statusFrom === 429) {
      return { status: 429, code: 'AI_RATE_LIMIT', message: 'AI service rate limit exceeded. Please try again later.' };
    }
    if (statusFrom && statusFrom >= 500) {
      return { status: 502, code: 'AI_SERVICE_ERROR', message: 'AI service is unavailable.' };
    }
    if (statusFrom && statusFrom >= 400) {
      return { status: 400, code: 'AI_REQUEST_ERROR', message: 'AI service request failed.' };
    }
  }

  // Deepgram errors
  if (ctx === 'deepgram' || /deepgram/i.test(msg)) {
    if (statusFrom === 401 || statusFrom === 403) {
      return { status: 500, code: 'TRANSCRIPTION_AUTH_ERROR', message: 'Failed to authenticate with transcription service.' };
    }
    if (statusFrom === 429) {
      return { status: 429, code: 'TRANSCRIPTION_RATE_LIMIT', message: 'Transcription service rate limit exceeded.' };
    }
    if (statusFrom && statusFrom >= 500) {
      return { status: 502, code: 'TRANSCRIPTION_SERVICE_ERROR', message: 'Transcription service is unavailable.' };
    }
    if (statusFrom && statusFrom >= 400) {
      return { status: 400, code: 'TRANSCRIPTION_BAD_REQUEST', message: 'Invalid transcription request.' };
    }
  }

  // AWS Polly / S3 errors
  if (ctx === 'polly') {
    if (name === 'CredentialsProviderError' || name === 'UnrecognizedClientException' || name === 'InvalidClientTokenId') {
      return { status: 500, code: 'TTS_AUTH_ERROR', message: 'Failed to authenticate with TTS service.' };
    }
    if (name === 'TextLengthExceededException') {
      return { status: 400, code: 'TTS_TEXT_TOO_LONG', message: 'Text length exceeds TTS service limits.' };
    }
    if (name === 'ServiceUnavailableException' || statusFrom === 503) {
      return { status: 503, code: 'TTS_SERVICE_UNAVAILABLE', message: 'TTS service is temporarily unavailable.' };
    }
    return { status: 500, code: 'TTS_GENERATION_ERROR', message: 'Failed to generate audio from TTS service.' };
  }

  if (ctx === 'r2' || ctx === 's3') {
    if (name === 'CredentialsProviderError' || name === 'UnrecognizedClientException' || name === 'InvalidClientTokenId') {
      return { status: 500, code: 'STORAGE_AUTH_ERROR', message: 'Failed to authenticate with storage service.' };
    }
    if (name === 'NoSuchBucket') {
      return { status: 404, code: 'STORAGE_BUCKET_NOT_FOUND', message: 'Storage bucket not found.' };
    }
    if (statusFrom && statusFrom >= 500) {
      return { status: 502, code: 'STORAGE_SERVICE_ERROR', message: 'Storage service is unavailable.' };
    }
    return { status: 500, code: 'STORAGE_UPLOAD_ERROR', message: 'Failed to upload to storage.' };
  }

  // Network errors
  if (name === 'NetworkingError') {
    return { status: 502, code: 'NETWORK_ERROR', message: 'A network error occurred while contacting an external service.' };
  }

  // Default
  return { status: 500, code: 'INTERNAL_SERVER_ERROR', message: 'An unexpected error occurred.' };
}

export function sendError(res, error, options = {}) {
  const { status, code, message } = mapError(error, options);
  return res.status(status).json({ code, message });
}

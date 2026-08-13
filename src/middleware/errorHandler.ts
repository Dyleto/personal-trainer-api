import { Request, Response } from 'express';
import { AppError } from '../utils/AppError';
import logger from '../utils/logger';

export const globalErrorHandler = (
  err: AppError | Error,
  req: Request,
  res: Response
) => {
  let statusCode = (err as AppError).statusCode || 500;
  let message = err.message;

  const requestId = req.requestId ?? '?';
  const userId = req.session?.userId ?? 'anonymous';

  const context = {
    requestId,
    userId,
    method: req.method,
    url: req.originalUrl,
    // On logue les clés du body (pas les valeurs) pour éviter de loguer des mots de passe
    bodyKeys: req.body ? Object.keys(req.body) : [],
    params: req.params,
  };

  if (statusCode >= 500) {
    logger.error(`💥 [${requestId}] ${err.message}`, {
      ...context,
      stack: err.stack,
    });
  } else if (statusCode === 401 || statusCode === 403) {
    // Auth/authz failures : on veut voir ces cas en prod
    logger.warn(`🔒 [${requestId}] ${statusCode} ${err.message}`, context);
  } else {
    logger.warn(`⚠️  [${requestId}] ${statusCode} ${err.message}`, context);
  }

  // Erreurs Mongoose/JWT normalisées
  if (err.name === 'CastError') {
    message = 'Ressource introuvable (ID invalide)';
    statusCode = 400;
  }
  if (err.name === 'ValidationError') {
    message = 'Données invalides';
    statusCode = 400;
  }
  if (err.name === 'JsonWebTokenError') {
    message = 'Token invalide, veuillez vous reconnecter';
    statusCode = 401;
  }

  // En prod, on masque les détails des erreurs 500
  if (process.env.NODE_ENV === 'production' && statusCode === 500) {
    message = 'Une erreur interne est survenue';
  }

  res.status(statusCode).json({
    status: statusCode >= 500 ? 'error' : 'fail',
    message,
    requestId, // Permet au frontend de reporter l'ID pour debug
    stack: process.env.NODE_ENV === 'development' ? err.stack : undefined,
  });
};

import { HTTP_STATUS } from '../helper/constants.js';

// 404 handler
export function normal(req, res, next) {
  res.status(HTTP_STATUS.NOT_FOUND).render('error/404', {
    url: req.originalUrl,
    method: req.method
  });
}

// Global error handler
export function errorr(err, req, res, next) {
  console.error('Error:', err);
  res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).render('error/500', {
    url: req.originalUrl,
    method: req.method
  });
}
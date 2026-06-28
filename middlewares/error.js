// 404 handler
export function normal(req, res, next) {
  res.status(404).render('error/404', {
    url: req.originalUrl,
    method: req.method
  });
}

// Global error handler
export function errorr(err, req, res, next) {
  console.error('Error:', err);
  res.status(500).render('error/500', {
    url: req.originalUrl,
    method: req.method
  });
}
// aron/middleware/error-handler.js
module.exports = function (err, req, res, next) {
  console.error(err.stack || err);
  const status = err.status || 500;
  const message = (process.env.NODE_ENV === 'production' && status === 500) ? 'Internal Server Error' : err.message;
  if (req.accepts('json')) return res.status(status).json({ error: message });
  res.status(status).send(message);
};

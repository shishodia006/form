import app from "../server/app.js";

export default function handler(request, response) {
  const rewrittenPath = Array.isArray(request.query.path) ? request.query.path.join("/") : request.query.path;
  request.url = `/api/${rewrittenPath || ""}`;
  delete request.query.path;
  return app(request, response);
}

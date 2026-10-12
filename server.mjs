import { createServer } from "node:http";
import { readFile, stat } from "node:fs/promises";
import { extname, join, normalize } from "node:path";
import { fileURLToPath } from "node:url";
import { randomBytes } from "node:crypto";

const root = fileURLToPath(new URL(".", import.meta.url));
const port = Number(process.env.PORT || 3000);
const sessionTtl = 10 * 60 * 1000;
const sessions = new Map();
const types = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".svg": "image/svg+xml",
  ".webmanifest": "application/manifest+json"
};

function sendJson(response, status, value) {
  response.writeHead(status, { "Content-Type": "application/json; charset=utf-8", "Cache-Control": "no-store" });
  response.end(JSON.stringify(value));
}

async function readJson(request) {
  let body = "";
  for await (const chunk of request) {
    body += chunk;
    if (body.length > 20_000) throw new Error("Te groot verzoek");
  }
  return body ? JSON.parse(body) : {};
}

function newCode() {
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let code;
  do {
    const bytes = randomBytes(5);
    code = Array.from(bytes, byte => alphabet[byte % alphabet.length]).join("");
  } while (sessions.has(code));
  return code;
}

function sessionView(session, clientId) {
  const counts = {};
  const myVotes = {};
  for (const [passageId, questions] of session.votes) {
    counts[passageId] = {};
    myVotes[passageId] = [];
    for (const [questionIndex, voters] of questions) {
      counts[passageId][questionIndex] = voters.size;
      if (voters.has(clientId)) myVotes[passageId].push(Number(questionIndex));
    }
  }
  return { code: session.code, counts, myVotes };
}

setInterval(() => {
  const now = Date.now();
  for (const [code, session] of sessions) if (now - session.lastActive > sessionTtl) sessions.delete(code);
}, 60_000).unref();

createServer(async (request, response) => {
  try {
    const url = new URL(request.url, "http://localhost");
    const pathname = decodeURIComponent(url.pathname);

    if (pathname === "/api/group" || pathname === "/api/group/vote") {
      let session = sessions.get("GLOBAL");
      if (!session) {
        session = { code: "GLOBAL", votes: new Map(), lastActive: Date.now() };
        sessions.set("GLOBAL", session);
      }
      session.lastActive = Date.now();

      if (request.method === "GET" && pathname === "/api/group") {
        const clientId = url.searchParams.get("clientId");
        if (!clientId) return sendJson(response, 400, { error: "Apparaat ontbreekt." });
        return sendJson(response, 200, sessionView(session, clientId));
      }

      if (request.method === "POST" && pathname === "/api/group/vote") {
        const { clientId, passageId, questionIndex } = await readJson(request);
        if (!clientId || !passageId || !Number.isInteger(questionIndex)) return sendJson(response, 400, { error: "Ongeldige stem." });
        if (!session.votes.has(passageId)) session.votes.set(passageId, new Map());
        const questions = session.votes.get(passageId);
        if (!questions.has(questionIndex)) questions.set(questionIndex, new Set());
        const voters = questions.get(questionIndex);
        if (voters.has(clientId)) {
          voters.delete(clientId);
        } else {
          const voteCount = Array.from(questions.values()).filter(set => set.has(clientId)).length;
          if (voteCount >= 3) return sendJson(response, 409, { error: "Je kunt maximaal drie vragen kiezen." });
          voters.add(clientId);
        }
        return sendJson(response, 200, sessionView(session, clientId));
      }

      return sendJson(response, 405, { error: "Niet toegestaan." });
    }

    if (request.method === "POST" && pathname === "/api/sessions") {
      const { clientId } = await readJson(request);
      if (!clientId) return sendJson(response, 400, { error: "Apparaat ontbreekt." });
      const code = newCode();
      const session = { code, votes: new Map(), lastActive: Date.now() };
      sessions.set(code, session);
      return sendJson(response, 201, sessionView(session, clientId));
    }

    const sessionMatch = pathname.match(/^\/api\/sessions\/([A-Z0-9]{5})(?:\/(vote))?$/);
    if (sessionMatch) {
      const code = sessionMatch[1];
      const session = sessions.get(code);
      if (!session) return sendJson(response, 404, { error: "Deze groepssessie bestaat niet meer." });
      session.lastActive = Date.now();

      if (request.method === "GET" && !sessionMatch[2]) {
        const clientId = url.searchParams.get("clientId");
        if (!clientId) return sendJson(response, 400, { error: "Apparaat ontbreekt." });
        return sendJson(response, 200, sessionView(session, clientId));
      }

      if (request.method === "POST" && sessionMatch[2] === "vote") {
        const { clientId, passageId, questionIndex } = await readJson(request);
        if (!clientId || !passageId || !Number.isInteger(questionIndex)) return sendJson(response, 400, { error: "Ongeldige stem." });
        if (!session.votes.has(passageId)) session.votes.set(passageId, new Map());
        const questions = session.votes.get(passageId);
        if (!questions.has(questionIndex)) questions.set(questionIndex, new Set());
        const voters = questions.get(questionIndex);
        if (voters.has(clientId)) {
          voters.delete(clientId);
        } else {
          const voteCount = Array.from(questions.values()).filter(set => set.has(clientId)).length;
          if (voteCount >= 3) return sendJson(response, 409, { error: "Je kunt maximaal drie vragen kiezen." });
          voters.add(clientId);
        }
        return sendJson(response, 200, sessionView(session, clientId));
      }

      return sendJson(response, 405, { error: "Niet toegestaan." });
    }

    const safePath = normalize(pathname).replace(/^(\.\.[/\\])+/, "");
    let filePath = join(root, safePath === "/" ? "index.html" : safePath);
    const info = await stat(filePath).catch(() => null);
    if (!info?.isFile()) filePath = join(root, "index.html");
    const body = await readFile(filePath);
    response.writeHead(200, {
      "Content-Type": types[extname(filePath)] || "application/octet-stream",
      "Cache-Control": [".html", ".js", ".css", ".json", ".webmanifest"].includes(extname(filePath)) ? "no-cache" : "public, max-age=3600"
    });
    response.end(body);
  } catch {
    response.writeHead(500, { "Content-Type": "text/plain; charset=utf-8" });
    response.end("De app kon niet worden geladen.");
  }
}).listen(port, "0.0.0.0", () => {
  console.log(`Ontdek Marcus is beschikbaar op poort ${port}`);
});

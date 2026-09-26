import type { ConfigService } from '@nestjs/config';
import { ChildProcess, spawn } from 'node:child_process';
import { createServer, IncomingMessage, request as httpRequest, Server, ServerResponse } from 'node:http';
import { AddressInfo } from 'node:net';
import * as path from 'node:path';
import { AccessTokenService } from '../../src/core/security/services/access-token.service';
import { GO_BINARY_ENV } from './e2e-target';

/** Where Nest's jose fetches Google's keys, and so where the tests stub `fetch` to answer. */
const GOOGLE_CERTS_URL = 'https://www.googleapis.com/oauth2/v3/certs';

const START_TIMEOUT_MS = 15_000;

const STOP_TIMEOUT_MS = 10_000;

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

const portOf = (server: Server) => (server.address() as AddressInfo).port;

const listenOnFreePort = (server: Server) =>
  new Promise<number>((resolve, reject) => {
    server.once('error', reject);
    server.listen(0, () => resolve(portOf(server)));
  });

const closeServer = (server: Server) =>
  new Promise<void>((resolve) => {
    server.closeAllConnections();
    server.close(() => resolve());
  });

const readBody = async (req: IncomingMessage): Promise<string> => {
  const chunks: Buffer[] = [];

  for await (const chunk of req) {
    chunks.push(chunk as Buffer);
  }

  return Buffer.concat(chunks).toString('utf8');
};

/**
 * The e2e requests `/api/...`, because the Nest app they build has no versioning; production and Go
 * answer on `/api/v1/...`.
 */
export const toGoPath = (url: string): string =>
  url.startsWith('/api/') && !url.startsWith('/api/v1/') ? `/api/v1/${url.slice('/api/'.length)}` : url;

/** The email the Go server posts to `TEST_MAILBOX_URL` instead of sending it through Resend. */
export interface MailboxDelivery {
  kind: string;
  to: string;
  token?: string;
}

export interface GoAppOptions {
  /** Who the request acts as when it carries neither `authorization` nor `x-e2e-user-id`. */
  defaultUserId: string;
  /** Receives every email the Go server would have sent. */
  deliver: (email: MailboxDelivery) => void;
}

/**
 * Stands in for the Nest app in `E2eTestSetup` when the target is Go. `getHttpServer()` is a small
 * proxy in front of the Go server: it moves `/api/...` to `/api/v1/...` and turns `x-e2e-user-id`
 * into a real access token, which is what `MockAuthGuard` fakes on the Nest side.
 */
export class GoApp {
  readonly #proxy: Server;
  readonly #mailbox: Server;
  readonly #google: Server;
  readonly #tokens: AccessTokenService;
  readonly #defaultUserId: string;
  #go: ChildProcess | null = null;
  #goPort = 0;

  private constructor(options: GoAppOptions) {
    this.#defaultUserId = options.defaultUserId;
    this.#tokens = new AccessTokenService(
      undefined as never,
      undefined as never,
      {
        get: (key: string) => process.env[key],
      } as unknown as ConfigService,
    );

    this.#proxy = createServer((req, res) => {
      this.#forward(req, res).catch((error: Error) => {
        if (!res.headersSent) {
          res.writeHead(502);
        }
        res.end(error.message);
      });
    });

    this.#mailbox = createServer((req, res) => {
      readBody(req)
        .then((body) => {
          options.deliver(JSON.parse(body) as MailboxDelivery);
          res.writeHead(204).end();
        })
        .catch(() => res.writeHead(400).end());
    });

    /*
     * google.e2e-spec stubs the global `fetch` to hand jose its own keys. Go cannot see that stub, so
     * it reads Google's keys from here instead, and this answers with whatever the stub answers.
     */
    this.#google = createServer((_req, res) => {
      fetch(GOOGLE_CERTS_URL)
        .then((response) => response.json())
        .then((keys) => {
          res.writeHead(200, { 'content-type': 'application/json' });
          res.end(JSON.stringify(keys));
        })
        .catch(() => res.writeHead(502).end());
    });
  }

  static async start(options: GoAppOptions): Promise<GoApp> {
    const app = new GoApp(options);

    await app.#start();

    return app;
  }

  /** Same use as Nest's: the proxy is already listening, so supertest and `address()` just work. */
  getHttpServer(): Server {
    return this.#proxy;
  }

  async listen(_port: number): Promise<Server> {
    return this.#proxy;
  }

  get(token: unknown): never {
    throw new Error(`${String(token)} lives inside Nest; the Go server can only be reached over HTTP`);
  }

  async close() {
    await closeServer(this.#proxy);
    await this.#stopGo();
    await closeServer(this.#mailbox);
    await closeServer(this.#google);
  }

  async #start() {
    const binary = process.env[GO_BINARY_ENV];

    if (!binary) {
      throw new Error(`${GO_BINARY_ENV} is not set: the global setup builds the Go server when E2E_TARGET=go`);
    }

    await listenOnFreePort(this.#proxy);
    const mailboxPort = await listenOnFreePort(this.#mailbox);
    const googlePort = await listenOnFreePort(this.#google);

    const probe = createServer();
    this.#goPort = await listenOnFreePort(probe);
    await closeServer(probe);

    this.#go = spawn(binary, [], {
      env: {
        ...process.env,
        PORT: String(this.#goPort),
        PUBLIC_DIR: path.resolve(__dirname, '../../public'),
        TEST_MAILBOX_URL: `http://127.0.0.1:${mailboxPort}`,
        GOOGLE_CERTS_URL: `http://127.0.0.1:${googlePort}`,
      },
      stdio: 'inherit',
    });

    await this.#waitUntilListening(this.#go);
  }

  async #waitUntilListening(go: ChildProcess) {
    const deadline = Date.now() + START_TIMEOUT_MS;

    while (Date.now() < deadline) {
      if (go.exitCode !== null) {
        throw new Error(`The Go server exited with code ${go.exitCode} before listening`);
      }

      if (await this.#answers()) {
        return;
      }

      await sleep(50);
    }

    throw new Error(`The Go server did not listen on port ${this.#goPort} within ${START_TIMEOUT_MS} ms`);
  }

  #answers(): Promise<boolean> {
    return new Promise((resolve) => {
      const req = httpRequest({ host: '127.0.0.1', port: this.#goPort, path: '/api/v1/' }, (res) => {
        res.resume();
        resolve(true);
      });
      req.on('error', () => resolve(false));
      req.end();
    });
  }

  async #stopGo() {
    const go = this.#go;

    if (!go || go.exitCode !== null) {
      return;
    }

    const exited = new Promise((resolve) => go.once('exit', resolve));

    go.kill('SIGTERM');

    if ((await Promise.race([exited, sleep(STOP_TIMEOUT_MS).then(() => 'timeout')])) === 'timeout') {
      go.kill('SIGKILL');
      await exited;
    }
  }

  async #forward(req: IncomingMessage, res: ServerResponse) {
    const headers = { ...req.headers };
    const impersonated = headers['x-e2e-user-id'];
    const userId = typeof impersonated === 'string' ? impersonated : this.#defaultUserId;

    delete headers['x-e2e-user-id'];
    delete headers.host;

    // The printer sends its own token; everybody else is signed in as MockAuthGuard would have it.
    if (!headers.authorization) {
      headers.authorization = `Bearer ${await this.#tokens.sign(userId, `e2e-session-${userId}`)}`;
    }

    const upstream = httpRequest(
      { host: '127.0.0.1', port: this.#goPort, method: req.method, path: toGoPath(req.url ?? '/'), headers },
      (response) => {
        res.writeHead(response.statusCode ?? 502, response.headers);
        response.pipe(res);
      },
    );

    upstream.on('error', (error) => {
      if (!res.headersSent) {
        res.writeHead(502);
      }
      res.end(error.message);
    });

    // An event stream the test cancels has to close on the Go side too.
    res.on('close', () => upstream.destroy());

    req.pipe(upstream);
  }
}

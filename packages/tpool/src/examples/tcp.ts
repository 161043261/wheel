import { Socket, createConnection } from "net";
import { v4 as uuid } from "uuid";

export enum ConnectionState {
  IDLE = "IDLE",
  ALLOCATED = "ALLOCATED",
  DESTROYED = "DESTROYED",
}

export class TcpConnection {
  public id = uuid();
  public state = ConnectionState.IDLE;
  public socket?: Socket | undefined = undefined;
  private readyCheckTimer?: NodeJS.Timeout | undefined = undefined;
  private errorHooks: Set<(error: Error) => void> = new Set();
  private handleError?: (error: Error) => void;
  private handleSendError?: (error: Error) => void;
  private handleSocketClose: () => void = () => {
    this.triggerError(new Error("TCP connection has been closed unexpectedly"));
  };
  private handleSocketReady?: () => void;
  private handleSocketData?: (data: Buffer) => void;
  private handleSocketTimeout?: () => void;

  constructor(
    private remoteHost: string,
    private remotePort: number,
    private defaultTimeout: number,
  ) {}

  onError(hook: (error: Error) => void) {
    this.errorHooks.add(hook);
  }

  initialize(): Promise<TcpConnection> {
    return new Promise<TcpConnection>((resolve, reject) => {
      this.handleError = (error: Error) => {
        this.triggerError(error);
        reject(error);
      };

      if (this.state === ConnectionState.DESTROYED) {
        const error = new Error("TCP connection has been destroyed");
        this.handleError(error);
        return;
      }

      this.socket = createConnection(this.remotePort, this.remoteHost);
      // For decreasing latency.
      this.socket.setNoDelay();

      this.handleSocketReady = () => {
        const checkSocketReady = () => {
          if (this.state === ConnectionState.DESTROYED || !this.socket) {
            const error = new Error(
              "TCP connection has been destroyed or is undefined",
            );
            this.handleError?.(error);
            return;
          }
          // If the stream is connecting socket.readyState is opening.
          // If the stream is readable and writable, it is open.
          if (this.socket.readyState === "opening") {
            this.readyCheckTimer = setTimeout(checkSocketReady, 100);
            return;
          }
          if (this.socket.readyState === "open") {
            resolve(this);
            return;
          }
          const error = new Error(
            `Unexpected TCP socket readyState: ${this.socket.readyState}`,
          );
          this.handleError?.(error);
        };
        process.nextTick(checkSocketReady);
      };

      this.socket.on("ready", this.handleSocketReady);
      this.socket.on("close", this.handleSocketClose);
      // feat: this.socket.on => this.socket.once
      this.socket.once("error", this.handleError);
    });
  }

  async executeTask<T>(
    data: Buffer | string | unknown,
    taskResolve: (data: T) => void,
    taskReject: (error: Error) => void,
    timeout?: number,
  ): Promise<T> {
    return new Promise<T>((resolve, reject) => {
      if (!this.socket || this.state === ConnectionState.DESTROYED) {
        reject(new Error("TCP connection has been destroyed or is undefined"));
        return;
      }
      this.state = ConnectionState.ALLOCATED;
      const dataPackets: Buffer[] = [];

      // Convert data to Buffer
      let sendData: Buffer;
      if (data instanceof Buffer) {
        sendData = data;
      } else if (typeof data === "string") {
        sendData = Buffer.from(data);
      } else {
        sendData = Buffer.from(JSON.stringify(data));
      }

      const cleanup = () => {
        if (this.handleSocketData) {
          this.socket?.removeListener("data", this.handleSocketData);
        }
        if (this.handleSendError) {
          this.socket?.removeListener("error", this.handleSendError);
        }
        if (this.handleSocketTimeout) {
          this.socket?.removeListener("timeout", this.handleSocketTimeout);
        }
        this.state = ConnectionState.IDLE;
      };

      this.handleSendError = (error: Error) => {
        taskReject(error);
        this.triggerError(error);
        cleanup();
        reject(error);
      };

      this.handleSocketTimeout = () => {
        const error = new Error("TCP connection has timed out");
        this.handleSendError?.(error);
      };

      this.handleSocketData = (packet: Buffer) => {
        dataPackets.push(packet);
        if (packet.subarray(-1)[0] === "\r".charCodeAt(0)) {
          try {
            const data: T = JSON.parse(Buffer.concat(dataPackets).toString());
            taskResolve(data);
            cleanup();
            resolve(data);
          } catch (error) {
            this.handleSendError?.(
              error instanceof Error ? error : new Error(JSON.stringify(error)),
            );
          }
        }
      };

      this.socket.setTimeout(
        timeout ?? this.defaultTimeout,
        this.handleSocketTimeout,
      );
      this.socket.once("data", this.handleSocketData);
      this.socket.once("error", this.handleSendError);
      this.socket.write(sendData, (error) => {
        if (error) {
          this.handleSendError?.(error);
        }
      });
    });
  }

  private triggerError(error: Error) {
    Array.from(this.errorHooks).forEach((hook) => hook(error));
  }

  destroy() {
    this.state = ConnectionState.DESTROYED;
    // Clear socket listeners
    if (this.readyCheckTimer) {
      clearTimeout(this.readyCheckTimer);
      this.readyCheckTimer = undefined;
    }
    this.socket?.removeAllListeners();
    // Clear error hooks
    this.errorHooks.clear();
    try {
      this.socket?.destroy();
    } finally {
      this.socket = undefined;
    }
  }

  isDestroyed(): boolean {
    return this.state === ConnectionState.DESTROYED;
  }

  isIdle(): boolean {
    return this.state === ConnectionState.IDLE;
  }

  isAllocated(): boolean {
    return this.state === ConnectionState.ALLOCATED;
  }
}

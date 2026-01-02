function sleep(timeoutMilliseconds: number) {
  return new Promise((resolve) => setTimeout(resolve, timeoutMilliseconds));
}

import { createPool, Pool } from "../index.js";
import type { IFactory } from "../factory-validator.js";
import type { IOptions } from "../pool-default.js";
import { TcpConnection } from "./tcp.js";

export enum PoolState {
  RUNNING = "RUNNING",
  CLOSING = "CLOSING",
  DESTROYED = "DESTROYED",
}

interface TcpPoolOption {
  remoteHost: string;
  remotePort: number;
  minConnections: number;
  maxConnections: number;
  expireTime: number;
  sendTimeout: number;
  retryDelay: number;
  logger?: {
    info: (message: string) => void;
    error: (message: string) => void;
  };
}

const DEFAULT_MAX_TCP_CONNECT_RETRIES = 3;

export class TcpPool {
  private pool: Pool<TcpConnection>;
  private state = PoolState.RUNNING;
  // private executingTasks: Set<Promise<unknown>> = new Set();

  constructor(private config: TcpPoolOption) {
    this.state = PoolState.RUNNING;
    this.pool = this.createPool();
  }

  private createPool(): Pool<TcpConnection> {
    const factory: IFactory<TcpConnection> = {
      create: async (): Promise<TcpConnection> => {
        return this.createConnection();
      },
      destroy: async (connection: TcpConnection): Promise<void> => {
        return this.destroyConnection(connection);
      },
      validate: async (connection: TcpConnection): Promise<boolean> => {
        return (
          !connection.isDestroyed() &&
          connection.isIdle() &&
          connection.socket !== undefined &&
          !connection.socket.destroyed &&
          connection.socket.readyState === "open" &&
          connection.socket.readable &&
          connection.socket.writable
        );
      },
    };
    const poolOptions: IOptions = {
      min: this.config.minConnections,
      max: this.config.maxConnections,
      idleTimeoutMilliseconds: this.config.expireTime,
      acquireTimeoutMilliseconds: this.config.sendTimeout * 2,
      evictionRunIntervalMilliseconds: this.config.expireTime / 2,
      testOnBorrow: true,
      testOnReturn: true,
    };

    this.config.logger?.info(
      `TCP pool is created, options: ${JSON.stringify(poolOptions)}`,
    );
    return createPool(factory, poolOptions);
  }

  async send<T>(data: Buffer | string | object): Promise<T> {
    if (this.state === PoolState.DESTROYED) {
      throw new Error("TCP pool has been destroyed");
    }
    if (this.state === PoolState.CLOSING) {
      throw new Error("TCP pool is closing");
    }

    const connection = await this.pool.acquire().catch((error) => {
      this.config.logger?.error(
        `Failed to acquire connection: ${JSON.stringify(error)}`,
      );
      throw error;
    });
    try {
      return await connection.executeTask<T>(data, this.config.sendTimeout);
    } catch (error) {
      this.config.logger?.error(
        `Failed to send data: ${JSON.stringify(error)}`,
      );
      throw error;
    } finally {
      this.pool.release(connection);
    }
  }

  async destroy(): Promise<void> {
    if (this.state === PoolState.DESTROYED) {
      return;
    }
    this.state = PoolState.CLOSING;
    // if (this.executingTasks.size > 0) {
    //   this.config.logger?.info(`Waiting for ${this.executingTasks.size} executing tasks...`);
    //   await Promise.allSettled(this.executingTasks);
    // }
    await this.pool
      .drain()
      .then(() => this.pool.clear())
      .catch((error) => {
        this.config.logger?.error(
          `Failed to destroy TCP pool: ${JSON.stringify(error)}`,
        );
      });
    this.state = PoolState.DESTROYED;
    this.config.logger?.info("TCP pool is destroyed");
  }

  isRunning(): boolean {
    return this.state === PoolState.RUNNING;
  }

  isClosing(): boolean {
    return this.state === PoolState.CLOSING;
  }

  isDestroyed(): boolean {
    return this.state === PoolState.DESTROYED;
  }

  getPoolStatus() {
    return {
      state: this.state,
      available: this.pool.available,
      borrowed: this.pool.borrowed,
      max: this.pool.max,
      min: this.pool.min,
      pending: this.pool.pending,
      size: this.pool.size,
      spareResourceCapacity: this.pool.spareResourceCapacity,
    };
  }

  private async createConnection(
    maxTcpConnectRetries = DEFAULT_MAX_TCP_CONNECT_RETRIES,
  ): Promise<TcpConnection> {
    let attempt = 0;
    while (attempt < maxTcpConnectRetries) {
      const connection = new TcpConnection(
        this.config.remoteHost,
        this.config.remotePort,
        this.config.sendTimeout,
      );
      connection.onError((error) => {
        this.config.logger?.error(
          `TCP connection error: ${JSON.stringify(error)}`,
        );
      });
      try {
        await connection.initialize();
        this.config.logger?.info("TCP connection created");
        return connection;
      } catch (error) {
        const errorMessage =
          error instanceof Error ? error.message : JSON.stringify(error);
        if (attempt >= maxTcpConnectRetries) {
          throw new Error(
            `Failed to create TCP connection after ${attempt + 1} attempts: ${errorMessage}`,
          );
        }
        attempt += 1;
        this.config.logger?.info(
          `Failed to create TCP connection, retrying...${attempt}/${maxTcpConnectRetries + 1}`,
        );
        await sleep(this.config.retryDelay);
      }
    }
    throw new Error(
      `Failed to create TCP connection after ${maxTcpConnectRetries + 1} attempts`,
    );
  }

  private destroyConnection(connection: TcpConnection): void {
    try {
      connection.destroy();
      this.config.logger?.info("TCP connection destroyed");
    } catch (error) {
      this.config.logger?.error(
        `Destroy TCP connection error: ${JSON.stringify(error)}`,
      );
    }
  }
}

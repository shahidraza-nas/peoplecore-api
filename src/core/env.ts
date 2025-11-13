import {
  GetSecretValueCommand,
  SecretsManagerClient,
} from '@aws-sdk/client-secrets-manager';

class EnvironmentManager {
  private static instance: EnvironmentManager;
  private secrets: Record<string, string> = {};
  private isInitialized = false;
  private initPromise: Promise<void> | null = null;

  private constructor() {}

  static getInstance(): EnvironmentManager {
    if (!EnvironmentManager.instance) {
      EnvironmentManager.instance = new EnvironmentManager();
    }
    return EnvironmentManager.instance;
  }

  async initialize(): Promise<void> {
    if (this.isInitialized) return;
    if (this.initPromise !== null) return this.initPromise;

    this.initPromise = this.loadSecrets();
    await this.initPromise;
    this.isInitialized = true;
  }

  private async loadSecrets(): Promise<void> {
    const secretId = process.env.AWS_ENV_SECRET_ID;
    if (!secretId) return;

    const client = new SecretsManagerClient();
    const command = new GetSecretValueCommand({ SecretId: secretId });
    const response = await client.send(command);

    if (!response.SecretString) {
      throw new Error('SecretString not found in AWS Secrets Manager response');
    }

    this.secrets = JSON.parse(response.SecretString);
  }

  get<T = string>(name: string, defaultValue?: T): T {
    if (!this.isInitialized) {
      throw new Error('EnvironmentManager not initialized');
    }
    return (this.secrets[name] ?? process.env[name] ?? defaultValue) as T;
  }
}

// Export a singleton instance
export const env = EnvironmentManager.getInstance();

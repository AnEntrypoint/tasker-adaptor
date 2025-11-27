import { register, get, list } from './registry.js';

export class ServiceClient {
  constructor(config = {}) {
    if (!config.baseUrl && !process.env.SERVICE_BASE_URL) {
      throw new Error('ServiceClient requires baseUrl in config or SERVICE_BASE_URL env');
    }
    if (!config.authToken && !process.env.SERVICE_AUTH_TOKEN) {
      throw new Error('ServiceClient requires authToken in config or SERVICE_AUTH_TOKEN env');
    }
    this.config = {
      baseUrl: config.baseUrl || process.env.SERVICE_BASE_URL,
      authToken: config.authToken || process.env.SERVICE_AUTH_TOKEN,
      ...config
    };
  }

  static registerService(alias, endpoint) {
    register('service', alias, () => endpoint);
  }

  static getServiceEndpoint(alias) {
    const factory = get('service', alias);
    return factory ? factory() : alias;
  }

  static listServices() {
    return list('service');
  }

  async call(serviceName, method, params) {
    const endpoint = ServiceClient.getServiceEndpoint(serviceName);
    const url = `${this.config.baseUrl}/functions/v1/${endpoint}`;
    const methodString = Array.isArray(method) ? method.join('.') : method;

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.config.authToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        chain: [{ property: methodString, args: params }]
      })
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Service call failed: ${response.status} ${response.statusText} - ${errorText}`);
    }

    const result = await response.json();
    return result.result || result;
  }
}

export default ServiceClient;

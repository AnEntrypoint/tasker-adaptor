export class ServiceClient {
  constructor(config = {}) {
    this.config = {
      baseUrl: config.baseUrl || (process.env.SERVICE_BASE_URL || 'http://localhost:3000'),
      authToken: config.authToken || '',
      ...config
    };
  }

  async call(serviceName, method, params) {
    const serviceMap = {
      'database': 'wrappedsupabase',
      'keystore': 'wrappedkeystore',
      'openai': 'wrappedopenai',
      'websearch': 'wrappedwebsearch',
      'gapi': 'wrappedgapi'
    };

    const actualServiceName = serviceMap[serviceName] || serviceName;
    const url = `${this.config.baseUrl}/functions/v1/${actualServiceName}`;
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

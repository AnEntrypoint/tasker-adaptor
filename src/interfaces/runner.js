export class Runner {
  async init() {
    throw new Error('init() not implemented');
  }

  async run(_code, _input) {
    throw new Error('run() not implemented');
  }

  async resume(_state, _response) {
    throw new Error('resume() not implemented');
  }

  async status() {
    throw new Error('status() not implemented');
  }

  async dispose() {
    throw new Error('dispose() not implemented');
  }
}

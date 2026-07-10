// Loaded via --require before all modules. Patches both the global resolver
// and any dns.Resolver instances (used by the MongoDB driver internally).
const dns = require('dns');

dns.setServers(['8.8.8.8', '1.1.1.1']);

const OriginalResolver = dns.Resolver;
dns.Resolver = class PatchedResolver extends OriginalResolver {
  constructor(options) {
    super(options);
    this.setServers(['8.8.8.8', '1.1.1.1']);
  }
};

console.log('[dns-patch] DNS servers patched:', dns.getServers());

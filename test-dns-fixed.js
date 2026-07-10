const dns = require('dns');
const dnsPromises = require('dns').promises;

// Force Node.js to use Google's DNS instead of fe80::1
dns.setServers(['8.8.8.8', '1.1.1.1']);

async function testDNS() {
  try {
    console.log('Testing with explicit DNS servers (8.8.8.8, 1.1.1.1)...');
    const result = await dnsPromises.resolveSrv('_mongodb._tcp.cluster0.mpoagiv.mongodb.net');
    console.log('✅ DNS SRV resolution SUCCESS:', JSON.stringify(result, null, 2));
  } catch (err) {
    console.error('❌ DNS SRV resolution FAILED:', err.message);
  }
}

testDNS();

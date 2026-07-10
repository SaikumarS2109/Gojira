// test-dns.js
const dns = require('dns').promises;

async function testDNS() {
  try {
    console.log('Testing DNS resolution...');
    const result = await dns.resolveSrv('_mongodb._tcp.cluster0.mpoagiv.mongodb.net');
    console.log('✅ DNS SRV resolution SUCCESS:', result);
  } catch (err) {
    console.error('❌ DNS SRV resolution FAILED:', err.message);
  }
}

testDNS();
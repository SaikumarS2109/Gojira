// test-dns-regular.js
const dns = require('dns').promises;

async function testDNS() {
  try {
    console.log('Testing regular A record DNS...');
    const result = await dns.resolve4('cluster0.mpoagiv.mongodb.net');
    console.log('✅ Regular DNS resolution SUCCESS:', result);
  } catch (err) {
    console.error('❌ Regular DNS resolution FAILED:', err.message);
  }

  try {
    console.log('\nTesting SRV record DNS...');
    const result = await dns.resolveSrv('_mongodb._tcp.cluster0.mpoagiv.mongodb.net');
    console.log('✅ SRV DNS resolution SUCCESS:', result);
  } catch (err) {
    console.error('❌ SRV DNS resolution FAILED:', err.message);
  }
}

testDNS();
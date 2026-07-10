export async function register() {
  try {
    const dns = await import('dns');
    dns.setServers(['8.8.8.8', '1.1.1.1']);
    console.log('DNS servers set to:', dns.getServers());
  } catch {
    // Edge runtime — dns module unavailable, skip
  }
}

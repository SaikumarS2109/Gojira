import * as dns from 'dns';
import { promisify } from 'util';
import { NextResponse } from 'next/server';
import mongoose from 'mongoose';

const resolveSrv = promisify(dns.resolveSrv);

export async function GET() {
  try {
    dns.setServers(['1.1.1.1', '1.0.0.1']);
    console.log('DNS Servers:', dns.getServers());

    const result = await resolveSrv('_mongodb._tcp.cluster0.mpoagiv.mongodb.net');

    // Try connecting
    console.log('Attempting MongoDB connection...');
    await mongoose.connect(process.env.MONGODB_URI!, {
      bufferCommands: false,
    });
    console.log('MongoDB connected!');

    return NextResponse.json({
      status: 'success',
      dnsServers: dns.getServers(),
      srvResult: result,
      mongodbConnected: true,
    });
  } catch (error: any) {
    console.error('Test error:', error);
    return NextResponse.json({
      status: 'error',
      dnsServers: dns.getServers(),
      error: error.message,
      code: error.code,
    });
  }
}

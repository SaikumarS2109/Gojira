import { NextAuthOptions } from 'next-auth';
import CredentialsProvider from 'next-auth/providers/credentials';
import bcryptjs from 'bcryptjs';
import { connectDB } from './mongodb';
import { User } from '@/models/User';

export const authOptions: NextAuthOptions = {
  providers: [
    CredentialsProvider({
      name: 'Credentials',
      credentials: {
        email: { label: 'Email', type: 'email', placeholder: 'user@example.com' },
        password: { label: 'Password', type: 'password' },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          throw new Error('Email and password are required');
        }

        await connectDB();

        const user = await User.findOne({ email: credentials.email });
        if (!user) {
          throw new Error('No user found with this email');
        }

        const isPasswordValid = await bcryptjs.compare(
          credentials.password,
          user.passwordHash
        );
        if (!isPasswordValid) {
          throw new Error('Invalid password');
        }

        return {
          id: user._id.toString(),
          email: user.email,
          name: user.name,
          role: (user.role ?? 'user') as 'user' | 'admin',
        };
      },
    }),
  ],
  session: {
    strategy: 'jwt',
  },
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
        token.role = (user as { role?: 'user' | 'admin' }).role ?? 'user';
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.id as string;
        session.user.role = (token.role as 'user' | 'admin') ?? 'user';
      }
      return session;
    },
  },
  pages: {
    signIn: '/login',
  },
};

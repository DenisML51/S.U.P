import { Resend } from 'resend';
import { env } from '../env.js';
const resend = new Resend(env.RESEND_API_KEY);
export const sendVerificationCode = async (email, code) => {
    await resend.emails.send({
        from: env.RESEND_FROM,
        to: email,
        subject: 'Into the Dark - verification code',
        text: `Your verification code is ${code}. It expires in 10 minutes.`
    });
};

import * as Handlebars from 'handlebars';
import { EmailLayout } from './layout.template';

export type EmailKind = 'invite' | 'verifyEmail' | 'resetPassword' | 'passwordChanged';

interface Copy {
  subject: string;
  heading: string;
  paragraphs: string[];
  buttonText: string;
  footnote: string;
}

const FALLBACK = {
  es: 'Si el botón no funciona, copia este enlace en tu navegador:',
  en: 'If the button does not work, copy this link into your browser:',
};

const FOOTER = {
  es: '© 2026 Coaster App. Todos los derechos reservados.',
  en: '© 2026 Coaster App. All rights reserved.',
};

const COPY: Record<EmailKind, Record<string, Copy>> = {
  invite: {
    es: {
      subject: 'Invitación a Coaster',
      heading: '¡Te han invitado! 🎉',
      paragraphs: [
        '<strong style="color: #0e0e0e;">{{inviterName}}</strong> te ha invitado a unirte al equipo de <strong style="color: #0e0e0e;">{{establishmentName}}</strong> en Coaster.',
        'Con Coaster verás tus turnos, ficharás y gestionarás la despensa desde el móvil. Para empezar, elige una contraseña o entra con tu cuenta de Google.',
      ],
      buttonText: 'Aceptar la invitación',
      footnote: 'El enlace caduca en 7 días. Si no esperabas esta invitación, puedes ignorar este correo.',
    },
    en: {
      subject: 'You have been invited to Coaster',
      heading: 'You have been invited! 🎉',
      paragraphs: [
        '<strong style="color: #0e0e0e;">{{inviterName}}</strong> has invited you to join the team at <strong style="color: #0e0e0e;">{{establishmentName}}</strong> on Coaster.',
        'With Coaster you can see your shifts, clock in and manage the pantry from your phone. To start, choose a password or continue with your Google account.',
      ],
      buttonText: 'Accept the invitation',
      footnote: 'The link expires in 7 days. If you were not expecting this invitation, you can ignore this email.',
    },
  },
  verifyEmail: {
    es: {
      subject: 'Confirma tu correo en Coaster',
      heading: 'Confirma tu correo',
      paragraphs: [
        'Hola <strong style="color: #0e0e0e;">{{name}}</strong>, confirma que esta dirección es tuya para terminar de asegurar tu cuenta.',
      ],
      buttonText: 'Confirmar mi correo',
      footnote: 'El enlace caduca en 24 horas. Si no has creado ninguna cuenta, puedes ignorar este correo.',
    },
    en: {
      subject: 'Confirm your email on Coaster',
      heading: 'Confirm your email',
      paragraphs: [
        'Hi <strong style="color: #0e0e0e;">{{name}}</strong>, confirm this address is yours to finish securing your account.',
      ],
      buttonText: 'Confirm my email',
      footnote: 'The link expires in 24 hours. If you did not create an account, you can ignore this email.',
    },
  },
  resetPassword: {
    es: {
      subject: 'Cambia tu contraseña de Coaster',
      heading: 'Cambia tu contraseña',
      paragraphs: [
        'Hola <strong style="color: #0e0e0e;">{{name}}</strong>, alguien ha pedido cambiar la contraseña de esta cuenta.',
        'Si has sido tú, elige una nueva desde el botón. Si no, no hace falta que hagas nada: tu contraseña sigue siendo la de siempre.',
      ],
      buttonText: 'Elegir una contraseña nueva',
      footnote: 'El enlace caduca en 1 hora y solo se puede usar una vez.',
    },
    en: {
      subject: 'Change your Coaster password',
      heading: 'Change your password',
      paragraphs: [
        'Hi <strong style="color: #0e0e0e;">{{name}}</strong>, somebody asked to change the password on this account.',
        'If it was you, pick a new one from the button below. If it was not, there is nothing to do: your password has not changed.',
      ],
      buttonText: 'Choose a new password',
      footnote: 'The link expires in 1 hour and can only be used once.',
    },
  },
  passwordChanged: {
    es: {
      subject: 'Tu contraseña de Coaster ha cambiado',
      heading: 'Tu contraseña ha cambiado',
      paragraphs: [
        'Hola <strong style="color: #0e0e0e;">{{name}}</strong>, la contraseña de tu cuenta acaba de cambiar y se han cerrado todas las sesiones abiertas.',
        'Si has sido tú, ya está todo hecho. <strong style="color: #0e0e0e;">Si no</strong>, pide una contraseña nueva ahora mismo desde el botón.',
      ],
      buttonText: 'No he sido yo',
      footnote: 'Este aviso se envía siempre que la contraseña cambia.',
    },
    en: {
      subject: 'Your Coaster password has changed',
      heading: 'Your password has changed',
      paragraphs: [
        'Hi <strong style="color: #0e0e0e;">{{name}}</strong>, the password on your account has just changed and every open session was closed.',
        'If that was you, there is nothing else to do. <strong style="color: #0e0e0e;">If it was not</strong>, ask for a new password right now from the button below.',
      ],
      buttonText: 'This was not me',
      footnote: 'This notice goes out every time a password changes.',
    },
  },
};

const layout = Handlebars.compile(EmailLayout);

const languageOf = (lang: string): string => (COPY.invite[lang] ? lang : 'es');

export interface RenderedEmail {
  subject: string;
  html: string;
}

export const renderEmail = (
  kind: EmailKind,
  lang: string,
  actionUrl: string,
  values: Record<string, string>,
): RenderedEmail => {
  const language = languageOf(lang);
  const copy = COPY[kind][language];

  return {
    subject: copy.subject,
    html: layout({
      lang: language,
      subject: copy.subject,
      heading: copy.heading,
      paragraphs: copy.paragraphs.map((paragraph) => Handlebars.compile(paragraph)(values)),
      buttonText: copy.buttonText,
      actionUrl,
      fallbackText: FALLBACK[language as 'es' | 'en'],
      footnote: copy.footnote,
      footerText: FOOTER[language as 'es' | 'en'],
    }),
  };
};

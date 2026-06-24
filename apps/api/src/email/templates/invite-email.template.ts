export const InviteEmailTranslations: Record<string, Record<string, string>> = {
  en: {
    subject: 'You have been invited to Coaster',
    title: 'Coaster',
    heading: 'You have been invited! 🎉',
    greeting: 'Hello,',
    body1_start: '',
    body1_inviter: '{{inviterName}}',
    body1_mid: ' has invited you to join the team at ',
    body1_bar: '{{barName}}',
    body1_end: ' on our platform.',
    body2: 'With Coaster you can see your shifts, manage the pantry and communicate with your team directly from your mobile phone, without needing complicated passwords.',
    buttonText: 'Enter Coaster',
    ignoreText: 'If you were not expecting this invitation, you can safely ignore this email.',
    footerText: '© 2026 Coaster App. All rights reserved.',
  },
  es: {
    subject: 'Invitación a Coaster',
    title: 'Coaster',
    heading: '¡Has sido invitado! 🎉',
    greeting: 'Hola,',
    body1_start: '',
    body1_inviter: '{{inviterName}}',
    body1_mid: ' te ha invitado a unirte al equipo de ',
    body1_bar: '{{barName}}',
    body1_end: ' en nuestra plataforma.',
    body2: 'Con Coaster podrás ver tus turnos, gestionar la despensa y comunicarte con tu equipo directamente desde tu móvil, sin necesidad de contraseñas complicadas.',
    buttonText: 'Entrar a Coaster',
    ignoreText: 'Si no esperabas esta invitación, puedes ignorar este correo tranquilamente.',
    footerText: '© 2026 Coaster App. Todos los derechos reservados.',
  },
};

export const InviteEmailTemplate = `
<!DOCTYPE html PUBLIC "-//W3C//DTD XHTML 1.0 Transitional//EN" "http://www.w3.org/TR/xhtml1/DTD/xhtml1-transitional.dtd">
<html dir="ltr" lang="{{lang}}">
  <head>
    <meta content="width=device-width" name="viewport" />
    <meta content="text/html; charset=UTF-8" http-equiv="Content-Type" />
    <meta name="x-apple-disable-message-reformatting" />
    <meta content="IE=edge" http-equiv="X-UA-Compatible" />
    <meta content="telephone=no,address=no,email=no,date=no,url=no" name="format-detection" />
    <title>{{subject}}</title>
    <style type="text/css">
      body {
        margin: 0;
        padding: 0;
        background-color: #f6f9fc;
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
        -webkit-font-smoothing: antialiased;
      }
      a.button:hover { background-color: #e87b43 !important; }
    </style>
  </head>
  <body
    style="margin: 0; padding: 0; background-color: #f6f9fc; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;"
  >
    <div style="display: none; max-height: 0px; overflow: hidden; opacity: 0; mso-hide: all;">
      {{heading}}
    </div>

    <table
      border="0"
      cellpadding="0"
      cellspacing="0"
      width="100%"
      style="background-color: #f6f9fc; padding: 40px 10px;"
    >
      <tr>
        <td align="center">
          <table
            border="0"
            cellpadding="0"
            cellspacing="0"
            width="100%"
            style="max-width: 600px; background-color: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 20px rgba(0,0,0,0.05);"
          >
            <tr>
              <td align="center" style="background-color: #0e0e0e; padding: 32px 20px;">
                <h1 style="color: #ffffff; margin: 0; font-size: 28px; font-weight: 700; letter-spacing: -0.5px;">
                  {{title}}
                </h1>
              </td>
            </tr>

            <tr>
              <td style="padding: 40px 32px;">
                <h2 style="color: #0e0e0e; font-size: 22px; margin: 0 0 24px 0; font-weight: 600;">
                  {{heading}}
                </h2>

                <p style="color: #475569; font-size: 16px; line-height: 24px; margin: 0 0 16px 0;">{{greeting}}</p>

                <p style="color: #475569; font-size: 16px; line-height: 24px; margin: 0 0 16px 0;">
                  {{body1_start}}<strong style="color: #0e0e0e;">{{body1_inviter}}</strong>{{body1_mid}}<strong style="color: #0e0e0e;">{{body1_bar}}</strong>{{body1_end}}
                </p>

                <p style="color: #475569; font-size: 16px; line-height: 24px; margin: 0 0 32px 0;">
                  {{body2}}
                </p>

                <table border="0" cellpadding="0" cellspacing="0" width="100%">
                  <tr>
                    <td align="center">
                      <a
                        href="https://coaster.business/login"
                        class="button"
                        target="_blank"
                        style="display: inline-block; background-color: #ff9159; color: #000000; font-size: 16px; font-weight: 600; text-decoration: none; padding: 16px 32px; border-radius: 8px;"
                      >
                        {{buttonText}}
                      </a>
                    </td>
                  </tr>
                </table>

                <p style="color: #94a3b8; font-size: 14px; line-height: 21px; margin: 32px 0 0 0; text-align: center;">
                  {{ignoreText}}
                </p>
              </td>
            </tr>

            <tr>
              <td align="center" style="background-color: #f8fafc; padding: 24px; border-top: 1px solid #e2e8f0;">
                <p style="color: #64748b; font-size: 13px; margin: 0;">
                  {{footerText}}
                </p>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>
`;

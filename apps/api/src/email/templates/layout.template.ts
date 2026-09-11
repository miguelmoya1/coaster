export const EmailLayout = `
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
                  Coaster
                </h1>
              </td>
            </tr>

            <tr>
              <td style="padding: 40px 32px;">
                <h2 style="color: #0e0e0e; font-size: 22px; margin: 0 0 24px 0; font-weight: 600;">
                  {{heading}}
                </h2>

                {{#each paragraphs}}
                <p style="color: #475569; font-size: 16px; line-height: 24px; margin: 0 0 16px 0;">{{{this}}}</p>
                {{/each}}

                <table border="0" cellpadding="0" cellspacing="0" width="100%" style="margin-top: 16px;">
                  <tr>
                    <td align="center">
                      <a
                        href="{{actionUrl}}"
                        class="button"
                        target="_blank"
                        style="display: inline-block; background-color: #ff9159; color: #000000; font-size: 16px; font-weight: 600; text-decoration: none; padding: 16px 32px; border-radius: 8px;"
                      >
                        {{buttonText}}
                      </a>
                    </td>
                  </tr>
                </table>

                <p style="color: #94a3b8; font-size: 14px; line-height: 21px; margin: 32px 0 0 0; text-align: center; word-break: break-all;">
                  {{fallbackText}}<br /><a href="{{actionUrl}}" style="color: #94a3b8;">{{actionUrl}}</a>
                </p>

                <p style="color: #94a3b8; font-size: 14px; line-height: 21px; margin: 16px 0 0 0; text-align: center;">
                  {{footnote}}
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

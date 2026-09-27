package email

import (
	"bytes"
	_ "embed"
	"html/template"
)

// The emails, with the same texts as apps/api/src/email/templates. The paragraphs are
// templates too: html/template escapes the names that go into them.

// emailKind is one of the four emails. The names are the ones the test mailbox uses.
type emailKind string

const (
	kindInvite          emailKind = "invite"
	kindVerifyEmail     emailKind = "verifyEmail"
	kindResetPassword   emailKind = "resetPassword"
	kindPasswordChanged emailKind = "passwordChanged"
)

type emailCopy struct {
	Subject    string
	Heading    string
	Paragraphs []string
	ButtonText string
	Footnote   string
}

var fallbackText = map[string]string{
	"es": "Si el botón no funciona, copia este enlace en tu navegador:",
	"en": "If the button does not work, copy this link into your browser:",
}

var footerText = map[string]string{
	"es": "© 2026 Coaster App. Todos los derechos reservados.",
	"en": "© 2026 Coaster App. All rights reserved.",
}

var emailCopies = map[emailKind]map[string]emailCopy{
	kindInvite: {
		"es": {
			Subject: "Invitación a Coaster",
			Heading: "¡Te han invitado! 🎉",
			Paragraphs: []string{
				`<strong style="color: #0e0e0e;">{{.inviterName}}</strong> te ha invitado a unirte al equipo de <strong style="color: #0e0e0e;">{{.establishmentName}}</strong> en Coaster.`,
				`Con Coaster verás tus turnos, ficharás y gestionarás la despensa desde el móvil. Para empezar, elige una contraseña o entra con tu cuenta de Google.`,
			},
			ButtonText: "Aceptar la invitación",
			Footnote:   "El enlace caduca en 7 días. Si no esperabas esta invitación, puedes ignorar este correo.",
		},
		"en": {
			Subject: "You have been invited to Coaster",
			Heading: "You have been invited! 🎉",
			Paragraphs: []string{
				`<strong style="color: #0e0e0e;">{{.inviterName}}</strong> has invited you to join the team at <strong style="color: #0e0e0e;">{{.establishmentName}}</strong> on Coaster.`,
				`With Coaster you can see your shifts, clock in and manage the pantry from your phone. To start, choose a password or continue with your Google account.`,
			},
			ButtonText: "Accept the invitation",
			Footnote:   "The link expires in 7 days. If you were not expecting this invitation, you can ignore this email.",
		},
	},
	kindVerifyEmail: {
		"es": {
			Subject: "Confirma tu correo en Coaster",
			Heading: "Confirma tu correo",
			Paragraphs: []string{
				`Hola <strong style="color: #0e0e0e;">{{.name}}</strong>, confirma que esta dirección es tuya para terminar de asegurar tu cuenta.`,
			},
			ButtonText: "Confirmar mi correo",
			Footnote:   "El enlace caduca en 24 horas. Si no has creado ninguna cuenta, puedes ignorar este correo.",
		},
		"en": {
			Subject: "Confirm your email on Coaster",
			Heading: "Confirm your email",
			Paragraphs: []string{
				`Hi <strong style="color: #0e0e0e;">{{.name}}</strong>, confirm this address is yours to finish securing your account.`,
			},
			ButtonText: "Confirm my email",
			Footnote:   "The link expires in 24 hours. If you did not create an account, you can ignore this email.",
		},
	},
	kindResetPassword: {
		"es": {
			Subject: "Cambia tu contraseña de Coaster",
			Heading: "Cambia tu contraseña",
			Paragraphs: []string{
				`Hola <strong style="color: #0e0e0e;">{{.name}}</strong>, alguien ha pedido cambiar la contraseña de esta cuenta.`,
				`Si has sido tú, elige una nueva desde el botón. Si no, no hace falta que hagas nada: tu contraseña sigue siendo la de siempre.`,
			},
			ButtonText: "Elegir una contraseña nueva",
			Footnote:   "El enlace caduca en 1 hora y solo se puede usar una vez.",
		},
		"en": {
			Subject: "Change your Coaster password",
			Heading: "Change your password",
			Paragraphs: []string{
				`Hi <strong style="color: #0e0e0e;">{{.name}}</strong>, somebody asked to change the password on this account.`,
				`If it was you, pick a new one from the button below. If it was not, there is nothing to do: your password has not changed.`,
			},
			ButtonText: "Choose a new password",
			Footnote:   "The link expires in 1 hour and can only be used once.",
		},
	},
	kindPasswordChanged: {
		"es": {
			Subject: "Tu contraseña de Coaster ha cambiado",
			Heading: "Tu contraseña ha cambiado",
			Paragraphs: []string{
				`Hola <strong style="color: #0e0e0e;">{{.name}}</strong>, la contraseña de tu cuenta acaba de cambiar y se han cerrado todas las sesiones abiertas.`,
				`Si has sido tú, ya está todo hecho. <strong style="color: #0e0e0e;">Si no</strong>, pide una contraseña nueva ahora mismo desde el botón.`,
			},
			ButtonText: "No he sido yo",
			Footnote:   "Este aviso se envía siempre que la contraseña cambia.",
		},
		"en": {
			Subject: "Your Coaster password has changed",
			Heading: "Your password has changed",
			Paragraphs: []string{
				`Hi <strong style="color: #0e0e0e;">{{.name}}</strong>, the password on your account has just changed and every open session was closed.`,
				`If that was you, there is nothing else to do. <strong style="color: #0e0e0e;">If it was not</strong>, ask for a new password right now from the button below.`,
			},
			ButtonText: "This was not me",
			Footnote:   "This notice goes out every time a password changes.",
		},
	},
}

//go:embed templates/layout.html
var layoutSource string

var layout = template.Must(template.New("layout").Parse(layoutSource))

// layoutData fills templates/layout.html.
type layoutData struct {
	Lang         string
	Subject      string
	Heading      string
	Paragraphs   []template.HTML
	ButtonText   string
	ActionURL    string
	FallbackText string
	Footnote     string
	FooterText   string
}

type renderedEmail struct {
	Subject string
	HTML    string
}

// renderEmail writes an email in language, or in Spanish when there is no copy for it.
func renderEmail(kind emailKind, language, actionURL string, values map[string]string) (renderedEmail, error) {
	if _, ok := emailCopies[kindInvite][language]; !ok {
		language = "es"
	}
	texts := emailCopies[kind][language]

	data := layoutData{
		Lang:         language,
		Subject:      texts.Subject,
		Heading:      texts.Heading,
		ButtonText:   texts.ButtonText,
		ActionURL:    actionURL,
		FallbackText: fallbackText[language],
		Footnote:     texts.Footnote,
		FooterText:   footerText[language],
	}

	for _, paragraph := range texts.Paragraphs {
		rendered, err := renderParagraph(paragraph, values)
		if err != nil {
			return renderedEmail{}, err
		}
		data.Paragraphs = append(data.Paragraphs, rendered)
	}

	var html bytes.Buffer
	if err := layout.Execute(&html, data); err != nil {
		return renderedEmail{}, err
	}

	return renderedEmail{Subject: texts.Subject, HTML: html.String()}, nil
}

// renderParagraph fills one paragraph. The markup of the copy is kept and the values are
// escaped, so the result can go into the layout as it is.
func renderParagraph(paragraph string, values map[string]string) (template.HTML, error) {
	parsed, err := template.New("paragraph").Option("missingkey=zero").Parse(paragraph)
	if err != nil {
		return "", err
	}

	var out bytes.Buffer
	if err := parsed.Execute(&out, values); err != nil {
		return "", err
	}

	return template.HTML(out.String()), nil
}

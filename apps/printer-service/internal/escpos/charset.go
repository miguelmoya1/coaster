package escpos

import (
	"fmt"
	"strings"
	"unicode"

	"golang.org/x/text/encoding/charmap"
	"golang.org/x/text/unicode/norm"
)

type CodePage struct {
	Name    string
	Command byte
	charmap *charmap.Charmap
}

var (
	CP858  = CodePage{"cp858", 19, charmap.CodePage858}
	CP850  = CodePage{"cp850", 2, charmap.CodePage850}
	CP437  = CodePage{"cp437", 0, charmap.CodePage437}
	CP1252 = CodePage{"cp1252", 16, charmap.Windows1252}
)

var codePages = map[string]CodePage{
	CP858.Name:  CP858,
	CP850.Name:  CP850,
	CP437.Name:  CP437,
	CP1252.Name: CP1252,
}

func LookupCodePage(name string) (CodePage, error) {
	cp, ok := codePages[strings.ToLower(strings.TrimSpace(name))]
	if !ok {
		return CodePage{}, fmt.Errorf("unknown code page %q (supported: cp858, cp850, cp437, cp1252)", name)
	}
	return cp, nil
}

var plainEquivalents = map[rune]string{
	'‘': "'", '’': "'", '‚': "'",
	'“': `"`, '”': `"`, '„': `"`,
	'–': "-", '—': "-", '−': "-",
	'…': "...",
	'€': "EUR",
	'•': "*",
	'½': "1/2",
	'¼': "1/4",
	'¾': "3/4",
	'™': "(TM)",
	'®': "(R)",
	'©': "(C)",
}

var baseLettersWithoutStroke = map[rune]rune{
	'Ł': 'L', 'ł': 'l',
	'Đ': 'D', 'đ': 'd',
	'Ð': 'D', 'ð': 'd',
	'Ø': 'O', 'ø': 'o',
	'Ħ': 'H', 'ħ': 'h',
	'Ŧ': 'T', 'ŧ': 't',
	'Þ': 'P', 'þ': 'p',
}

func (cp CodePage) Sanitize(s string) string {
	var b strings.Builder
	b.Grow(len(s))

	for _, r := range s {
		if isZeroWidth(r) {
			continue
		}

		switch {
		case isCollapsibleSpace(r):
			b.WriteByte(' ')

		case cp.encodable(r):
			b.WriteRune(r)

		case plainEquivalents[r] != "":
			b.WriteString(cp.Sanitize(plainEquivalents[r]))

		default:
			if base, ok := baseLetterOf(r); ok && cp.encodable(base) {
				b.WriteRune(base)
			} else {
				b.WriteByte('?')
			}
		}
	}

	return b.String()
}

func (cp CodePage) Encode(s string) []byte {
	out := make([]byte, 0, len(s))
	for _, r := range s {
		if b, ok := cp.charmap.EncodeRune(r); ok {
			out = append(out, b)
			continue
		}
		out = append(out, '?')
	}
	return out
}

func (cp CodePage) encodable(r rune) bool {
	_, ok := cp.charmap.EncodeRune(r)
	return ok
}

func isZeroWidth(r rune) bool {
	switch r {
	case '\u200b', '\u200c', '\u200d', '\ufeff':
		return true
	}
	return false
}

func isCollapsibleSpace(r rune) bool {
	return r != '\n' && unicode.IsSpace(r)
}

func baseLetterOf(r rune) (rune, bool) {
	if base, ok := baseLettersWithoutStroke[r]; ok {
		return base, true
	}

	decomposed := []rune(norm.NFD.String(string(r)))
	if len(decomposed) == 0 {
		return 0, false
	}

	base := decomposed[0]
	if base == r || unicode.Is(unicode.Mn, base) {
		return 0, false
	}
	return base, true
}

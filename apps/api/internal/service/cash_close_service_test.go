package service

import (
	"context"
	"errors"
	"slices"
	"testing"
	"time"

	"coaster-api/internal/core/domain"
)

func TestCashClosePreviewWhenTheTillWasNeverClosed(t *testing.T) {
	repo := &fakeCashCloseRepository{}
	service := NewCashCloseService(repo)

	preview, err := service.Preview(context.Background(), "e1")
	if err != nil {
		t.Fatal(err)
	}

	if preview.Since != nil || preview.OpeningFloat != 0 || preview.OpenOrders != 0 || preview.OpenOrdersCharged != 0 {
		t.Errorf("preview = %+v, want it to start from the beginning with no float", preview)
	}
	if !slices.Equal(repo.establishmentIDs, []string{"e1"}) {
		t.Errorf("read establishments %v", repo.establishmentIDs)
	}
}

func TestCashClosePreviewStartsWhereTheLastCloseEnded(t *testing.T) {
	closedAt := time.Date(2026, 9, 23, 23, 40, 0, 0, time.UTC)
	repo := &fakeCashCloseRepository{
		last:     &domain.LastCashClose{ClosedAt: closedAt, OpeningFloat: 15000},
		unclosed: []domain.CashCloseOrder{{Status: domain.OrderClosed, AmountPaidCash: 1100}},
		charges:  []domain.OpenOrderCharge{{AmountPaidCash: 500}, {AmountPaidCard: 250}},
	}

	preview, err := NewCashCloseService(repo).Preview(context.Background(), "e1")
	if err != nil {
		t.Fatal(err)
	}

	want := domain.CashClosePreview{
		CashCloseTotals:   domain.CashCloseTotals{ClosedOrders: 1, CashAmount: 1100},
		OpenOrders:        2,
		OpenOrdersCharged: 750,
		OpeningFloat:      15000,
	}
	if preview.Since == nil || !preview.Since.Equal(closedAt) {
		t.Fatalf("since = %v, want %s", preview.Since, closedAt)
	}
	preview.Since = nil
	if preview != want {
		t.Errorf("preview = %+v, want %+v", preview, want)
	}
}

func TestCashClosePreviewFailsWithTheRepository(t *testing.T) {
	broken := errors.New("database down")

	if _, err := NewCashCloseService(&fakeCashCloseRepository{err: broken}).Preview(context.Background(), "e1"); !errors.Is(err, broken) {
		t.Errorf("err = %v, want %v", err, broken)
	}
}

func TestCashCloseCloseCountsTheCash(t *testing.T) {
	repo := &fakeCashCloseRepository{
		closed: domain.CashClose{ID: "close-1", CashCloseTotals: domain.CashCloseTotals{ClosedOrders: 2, CashAmount: 2200}},
	}
	notes := "  Sin incidencias  "

	closed, err := NewCashCloseService(repo).Close(context.Background(), "e1", "u1", domain.CloseCashInput{
		OpeningFloat: 15000,
		CountedCash:  17100,
		Notes:        &notes,
	})
	if err != nil {
		t.Fatal(err)
	}

	input := repo.closeInput
	if input == nil || input.EstablishmentID != "e1" || input.ClosedByID != "u1" || input.OpeningFloat != 15000 || input.CountedCash != 17100 {
		t.Fatalf("closed with %+v", input)
	}
	if input.Notes == nil || *input.Notes != "Sin incidencias" {
		t.Fatalf("notes = %v, want them trimmed", input.Notes)
	}
	if closed.ExpectedCash != 17200 || closed.Difference != -100 {
		t.Errorf("expected cash %d, difference %d; want 17200 and -100", closed.ExpectedCash, closed.Difference)
	}
}

func TestCashCloseCloseWithBlankNotes(t *testing.T) {
	repo := &fakeCashCloseRepository{}
	blank := "   "

	if _, err := NewCashCloseService(repo).Close(context.Background(), "e1", "u1", domain.CloseCashInput{Notes: &blank}); err != nil {
		t.Fatal(err)
	}
	if repo.closeInput.Notes != nil {
		t.Errorf("notes = %q, want nil", *repo.closeInput.Notes)
	}
}

func TestCashCloseCloseFailsWithTheRepository(t *testing.T) {
	broken := errors.New("database down")

	if _, err := NewCashCloseService(&fakeCashCloseRepository{err: broken}).Close(context.Background(), "e1", "u1", domain.CloseCashInput{}); !errors.Is(err, broken) {
		t.Errorf("err = %v, want %v", err, broken)
	}
}

func TestCashCloseVoidKeepsTheArqueo(t *testing.T) {
	repo := &fakeCashCloseRepository{
		closed: domain.CashClose{OpeningFloat: 15000, CountedCash: 17100, CashCloseTotals: domain.CashCloseTotals{CashAmount: 2200}},
	}

	voided, err := NewCashCloseService(repo).Void(context.Background(), "e1", "close-1", "u2")
	if err != nil {
		t.Fatal(err)
	}

	if repo.voidInput == nil || *repo.voidInput != (domain.VoidCashClose{EstablishmentID: "e1", CashCloseID: "close-1", VoidedByID: "u2"}) {
		t.Fatalf("voided with %+v", repo.voidInput)
	}
	if voided.ExpectedCash != 17200 || voided.Difference != -100 {
		t.Errorf("expected cash %d, difference %d; want 17200 and -100", voided.ExpectedCash, voided.Difference)
	}
}

func TestCashCloseVoidFailsWithTheRepository(t *testing.T) {
	notLast := domain.BadRequest(domain.CodeCashCloseNotLast)

	if _, err := NewCashCloseService(&fakeCashCloseRepository{err: notLast}).Void(context.Background(), "e1", "close-1", "u2"); !errors.Is(err, notLast) {
		t.Errorf("err = %v, want %v", err, notLast)
	}
}

func TestCashCloseListByDateReadsTheDayInMadrid(t *testing.T) {
	tests := []struct {
		date     string
		from, to time.Time
	}{
		{date: "2026-09-27", from: time.Date(2026, 9, 26, 22, 0, 0, 0, time.UTC), to: time.Date(2026, 9, 27, 22, 0, 0, 0, time.UTC)},
		{date: "2026-10-25", from: time.Date(2026, 10, 24, 22, 0, 0, 0, time.UTC), to: time.Date(2026, 10, 25, 23, 0, 0, 0, time.UTC)},
		{date: "2026-03-29", from: time.Date(2026, 3, 28, 23, 0, 0, 0, time.UTC), to: time.Date(2026, 3, 29, 22, 0, 0, 0, time.UTC)},
	}

	for _, tt := range tests {
		t.Run(tt.date, func(t *testing.T) {
			repo := &fakeCashCloseRepository{recent: []domain.CashClose{
				{ID: "close-1", OpeningFloat: 15000, CountedCash: 57550, CashCloseTotals: domain.CashCloseTotals{CashAmount: 42050}},
			}}

			closes, err := NewCashCloseService(repo).ListByDate(context.Background(), "e1", tt.date)
			if err != nil {
				t.Fatal(err)
			}

			if len(repo.closedBetween) != 2 || !repo.closedBetween[0].Equal(tt.from) || !repo.closedBetween[1].Equal(tt.to) {
				t.Errorf("read closes between %v, want %s and %s", repo.closedBetween, tt.from, tt.to)
			}
			if len(closes) != 1 || closes[0].ExpectedCash != 57050 || closes[0].Difference != 500 {
				t.Errorf("closes = %+v, want them with the arqueo", closes)
			}
		})
	}
}

func TestCashCloseListByDateRejectsWhatIsNotADay(t *testing.T) {
	for _, date := range []string{"27/09/2026", "2026-02-30", "2026-09-27T10:00:00Z", "yesterday"} {
		repo := &fakeCashCloseRepository{}

		if _, err := NewCashCloseService(repo).ListByDate(context.Background(), "e1", date); !domain.HasCode(err, domain.CodeInvalidDate) {
			t.Errorf("%s: err = %v, want %s", date, err, domain.CodeInvalidDate)
		}
		if repo.closedBetween != nil {
			t.Errorf("%s: read the closes anyway", date)
		}
	}
}

func TestCashCloseListAddsTheArqueo(t *testing.T) {
	repo := &fakeCashCloseRepository{recent: []domain.CashClose{
		{ID: "close-2", OpeningFloat: 15000, CountedCash: 57550, CashCloseTotals: domain.CashCloseTotals{CashAmount: 42050}},
		{ID: "close-1", OpeningFloat: 0, CountedCash: 1100, CashCloseTotals: domain.CashCloseTotals{CashAmount: 1100}},
	}}

	closes, err := NewCashCloseService(repo).List(context.Background(), "e1")
	if err != nil {
		t.Fatal(err)
	}

	if len(closes) != 2 || closes[0].ExpectedCash != 57050 || closes[0].Difference != 500 || closes[1].ExpectedCash != 1100 || closes[1].Difference != 0 {
		t.Errorf("closes = %+v", closes)
	}
}

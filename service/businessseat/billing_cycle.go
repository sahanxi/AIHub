package businessseat

import (
	"errors"
	"time"

	"github.com/QuantumNous/new-api/model"
	"github.com/shopspring/decimal"
)

var ErrUnsupportedBillingCadence = errors.New("unsupported billing cadence")

type CycleWindow struct {
	Start time.Time
	End   time.Time
}

type BillingCycleService struct{}

func NewBillingCycleService() *BillingCycleService {
	return &BillingCycleService{}
}

func (s *BillingCycleService) WorkspaceLocation(ws *model.BusinessWorkspace) (*time.Location, error) {
	tz := ws.BillingTimezone
	if tz == "" {
		tz = "UTC"
	}
	return time.LoadLocation(tz)
}

func (s *BillingCycleService) AnchorTime(ws *model.BusinessWorkspace) (time.Time, error) {
	loc, err := s.WorkspaceLocation(ws)
	if err != nil {
		return time.Time{}, err
	}
	return time.Unix(ws.BillingAnchorAt, 0).In(loc), nil
}

func (s *BillingCycleService) addPeriod(start time.Time, cadence string) time.Time {
	switch cadence {
	case model.BusinessBillingCadenceMonthly:
		return addMonthsPreservingDay(start, 1)
	case model.BusinessBillingCadenceAnnual:
		return start.AddDate(1, 0, 0)
	default:
		return start
	}
}

func addMonthsPreservingDay(t time.Time, months int) time.Time {
	year, month, day := t.Date()
	hour, min, sec := t.Clock()
	loc := t.Location()
	targetMonth := int(month) + months
	targetYear := year + (targetMonth-1)/12
	targetMonth = (targetMonth-1)%12 + 1
	lastDay := daysInMonth(targetYear, time.Month(targetMonth))
	if day > lastDay {
		day = lastDay
	}
	return time.Date(targetYear, time.Month(targetMonth), day, hour, min, sec, 0, loc)
}

func daysInMonth(year int, month time.Month) int {
	return time.Date(year, month+1, 0, 0, 0, 0, 0, time.UTC).Day()
}

func (s *BillingCycleService) GetCurrentCycle(ws *model.BusinessWorkspace, at time.Time) (CycleWindow, error) {
	anchor, err := s.AnchorTime(ws)
	if err != nil {
		return CycleWindow{}, err
	}
	loc := anchor.Location()
	at = at.In(loc)
	if at.Before(anchor) {
		return CycleWindow{}, errors.New("timestamp before billing anchor")
	}
	start := anchor
	for {
		end := s.addPeriod(start, ws.BillingCadence)
		if at.Before(end) {
			return CycleWindow{Start: start, End: end}, nil
		}
		start = end
	}
}

func (s *BillingCycleService) GetNextCycle(ws *model.BusinessWorkspace, current CycleWindow) CycleWindow {
	return CycleWindow{Start: current.End, End: s.addPeriod(current.End, ws.BillingCadence)}
}

func (s *BillingCycleService) IsWithinCycleStartGraceWindow(ws *model.BusinessWorkspace, at time.Time, cycleStart time.Time) bool {
	graceMinutes := ws.CycleStartGraceMinutes
	if graceMinutes <= 0 {
		graceMinutes = 60
	}
	graceEnd := cycleStart.Add(time.Duration(graceMinutes) * time.Minute)
	return !at.Before(cycleStart) && !at.After(graceEnd)
}

func (s *BillingCycleService) CalculateRemainingRatio(cycleStart, cycleEnd, at time.Time) decimal.Decimal {
	total := cycleEnd.Sub(cycleStart)
	if total <= 0 {
		return decimal.Zero
	}
	remaining := cycleEnd.Sub(at)
	if remaining <= 0 {
		return decimal.Zero
	}
	if remaining > total {
		remaining = total
	}
	return decimal.NewFromInt(remaining.Nanoseconds()).
		Div(decimal.NewFromInt(total.Nanoseconds()))
}

func (s *BillingCycleService) AdvancePrepaidThrough(ws *model.BusinessWorkspace, currentPrepaidThrough int64, cycles int) (int64, error) {
	if cycles <= 0 {
		return currentPrepaidThrough, nil
	}
	loc, err := s.WorkspaceLocation(ws)
	if err != nil {
		return 0, err
	}
	start := time.Unix(currentPrepaidThrough, 0).In(loc)
	for i := 0; i < cycles; i++ {
		cycle := CycleWindow{Start: start, End: s.addPeriod(start, ws.BillingCadence)}
		start = cycle.End
	}
	return start.Unix(), nil
}

func (s *BillingCycleService) RenewalCycleWindow(ws *model.BusinessWorkspace, prepaidThrough int64) (CycleWindow, error) {
	loc, err := s.WorkspaceLocation(ws)
	if err != nil {
		return CycleWindow{}, err
	}
	start := time.Unix(prepaidThrough, 0).In(loc)
	end := s.addPeriod(start, ws.BillingCadence)
	return CycleWindow{Start: start, End: end}, nil
}

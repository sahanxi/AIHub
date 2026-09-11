package businessseat

import (
	"errors"
	"fmt"
	"strings"
	"time"

	"github.com/QuantumNous/new-api/model"
	"github.com/QuantumNous/new-api/setting"
	"github.com/shopspring/decimal"
	"gorm.io/gorm"
)

type QuoteInput struct {
	UserId       int
	ProductId    int
	WorkspaceId  int
	ChatgptEmail string
	OrderType    string
	QuoteAt      time.Time
}

type QuoteResult struct {
	QuoteType                string
	CycleStartAt             int64
	CycleEndAt               int64
	NextCycleStartAt         int64
	NextCycleEndAt           int64
	ProrationRatio           decimal.Decimal
	CurrentCycleAmount       decimal.Decimal
	NextCycleAmount          decimal.Decimal
	TotalAmount              decimal.Decimal
	PrepaidThrough           int64
	RenewalWindowOpensAt     int64
	RenewalPaymentDeadlineAt int64
	RenewalLeadDays          int
	PriceVersionId           int
	Currency                 string
}

type QuoteService struct {
	billing *BillingCycleService
}

func NewQuoteService() *QuoteService {
	return &QuoteService{billing: NewBillingCycleService()}
}

func (s *QuoteService) CreateQuote(input QuoteInput) (*model.BusinessQuote, error) {
	if input.OrderType == "" {
		input.OrderType = model.BusinessOrderTypeNew
	}
	if input.QuoteAt.IsZero() {
		input.QuoteAt = time.Now()
	}
	email := normalizeEmail(input.ChatgptEmail)
	if email == "" {
		return nil, errors.New("chatgpt email required")
	}
	_ = model.CancelPendingBusinessQuotesForUser(input.UserId, email, input.OrderType)

	product, err := model.GetBusinessProductById(input.ProductId)
	if err != nil {
		return nil, err
	}
	if !product.Enabled {
		return nil, errors.New("product not available")
	}

	ws, err := model.GetBusinessWorkspaceById(input.WorkspaceId)
	if err != nil {
		return nil, err
	}
	if ws.Status != model.BusinessWorkspaceStatusActive {
		return nil, errors.New("workspace not active")
	}

	atUnix := input.QuoteAt.Unix()
	pv, err := model.GetEffectiveBusinessPriceVersion(product.Id, ws.Id, atUnix)
	if err != nil {
		return nil, model.ErrBusinessPricingNotConfigured
	}
	if pv.BillingCadence != ws.BillingCadence {
		return nil, model.ErrBusinessBillingCadenceMismatch
	}

	result, err := s.calculateQuote(ws, pv, input.OrderType, input.QuoteAt)
	if err != nil {
		return nil, err
	}

	ttl := setting.BusinessSeatQuoteTTLSeconds()
	if ttl <= 0 {
		ttl = 900
	}
	quote := &model.BusinessQuote{
		UserId:                   input.UserId,
		WorkspaceId:              ws.Id,
		ProductId:                product.Id,
		PriceVersionId:           pv.Id,
		ChatgptEmail:             email,
		QuoteType:                result.QuoteType,
		QuoteAt:                  atUnix,
		ExpiresAt:                atUnix + int64(ttl),
		CycleStartAt:             result.CycleStartAt,
		CycleEndAt:               result.CycleEndAt,
		NextCycleStartAt:         result.NextCycleStartAt,
		NextCycleEndAt:           result.NextCycleEndAt,
		ProrationRatio:           result.ProrationRatio,
		CurrentCycleAmount:       result.CurrentCycleAmount,
		NextCycleAmount:          result.NextCycleAmount,
		TotalAmount:              result.TotalAmount,
		Currency:                 result.Currency,
		PrepaidThrough:           result.PrepaidThrough,
		RenewalWindowOpensAt:     result.RenewalWindowOpensAt,
		RenewalPaymentDeadlineAt: result.RenewalPaymentDeadlineAt,
		RenewalLeadDays:          result.RenewalLeadDays,
		OrderType:                input.OrderType,
		Status:                   model.BusinessQuoteStatusPending,
	}
	if err := model.DB.Create(quote).Error; err != nil {
		return nil, err
	}
	model.RecordBusinessSeatAudit(input.UserId, "QUOTE_CREATED", "quote", quote.Id,
		fmt.Sprintf("type=%s total=%s %s", quote.QuoteType, FormatMoney(quote.TotalAmount, quote.Currency), quote.Currency))
	return quote, nil
}

func (s *QuoteService) calculateQuote(ws *model.BusinessWorkspace, pv *model.BusinessPriceVersion, orderType string, at time.Time) (QuoteResult, error) {
	switch orderType {
	case model.BusinessOrderTypeRenewal:
		return QuoteResult{}, errors.New("renewal quote requires subscription context")
	case model.BusinessOrderTypeNew, model.BusinessOrderTypeReactivation:
		return s.calculateInitialQuote(ws, pv, at)
	default:
		return QuoteResult{}, fmt.Errorf("unsupported order type: %s", orderType)
	}
}

func (s *QuoteService) calculateInitialQuote(ws *model.BusinessWorkspace, pv *model.BusinessPriceVersion, at time.Time) (QuoteResult, error) {
	price := pv.PriceAmount
	currency := pv.Currency
	fullCycle := RoundMoney(price, currency)
	current, err := s.billing.GetCurrentCycle(ws, at)
	if err != nil {
		return QuoteResult{}, err
	}
	next := s.billing.GetNextCycle(ws, current)
	renewalTiming, err := s.billing.RenewalTiming(ws, current.End.Unix())
	if err != nil {
		return QuoteResult{}, err
	}

	if s.billing.IsWithinCycleStartGraceWindow(ws, at, current.Start) {
		return QuoteResult{
			QuoteType:                model.BusinessQuoteTypeCycleStartFull,
			CycleStartAt:             current.Start.Unix(),
			CycleEndAt:               current.End.Unix(),
			NextCycleStartAt:         next.Start.Unix(),
			NextCycleEndAt:           next.End.Unix(),
			ProrationRatio:           decimal.NewFromInt(1),
			CurrentCycleAmount:       fullCycle,
			NextCycleAmount:          fullCycle,
			TotalAmount:              fullCycle,
			PrepaidThrough:           current.End.Unix(),
			RenewalWindowOpensAt:     renewalTiming.RenewalWindowOpensAt,
			RenewalPaymentDeadlineAt: renewalTiming.RenewalPaymentDeadlineAt,
			RenewalLeadDays:          renewalTiming.RenewalLeadDays,
			PriceVersionId:           pv.Id,
			Currency:                 currency,
		}, nil
	}

	ratio := s.billing.CalculateRemainingRatio(current.Start, current.End, at)
	prorated := MultiplyAndRound(price, ratio, currency)

	return QuoteResult{
		QuoteType:                model.BusinessQuoteTypeMidCycleProratedOnly,
		CycleStartAt:             current.Start.Unix(),
		CycleEndAt:               current.End.Unix(),
		NextCycleStartAt:         next.Start.Unix(),
		NextCycleEndAt:           next.End.Unix(),
		ProrationRatio:           ratio,
		CurrentCycleAmount:       prorated,
		NextCycleAmount:          fullCycle,
		TotalAmount:              prorated,
		PrepaidThrough:           current.End.Unix(),
		RenewalWindowOpensAt:     renewalTiming.RenewalWindowOpensAt,
		RenewalPaymentDeadlineAt: renewalTiming.RenewalPaymentDeadlineAt,
		RenewalLeadDays:          renewalTiming.RenewalLeadDays,
		PriceVersionId:           pv.Id,
		Currency:                 currency,
	}, nil
}

func (s *QuoteService) CreateRenewalQuote(userId int, subscriptionId int) (*model.BusinessQuote, error) {
	return s.createRenewalQuoteAt(userId, subscriptionId, time.Now())
}

func (s *QuoteService) createRenewalQuoteAt(userId int, subscriptionId int, at time.Time) (*model.BusinessQuote, error) {
	sub, err := model.GetBusinessSeatSubscriptionById(subscriptionId)
	if err != nil {
		return nil, err
	}
	if sub.UserId != userId {
		return nil, errors.New("subscription not owned by user")
	}
	ws, err := model.GetBusinessWorkspaceById(sub.WorkspaceId)
	if err != nil {
		return nil, err
	}
	if err := s.validateRenewalQuoteRequest(sub, ws, at); err != nil {
		return nil, err
	}
	var quote *model.BusinessQuote
	err = model.DB.Transaction(func(tx *gorm.DB) error {
		var txErr error
		quote, txErr = s.createRenewalQuoteInTx(tx, userId, sub, ws, at)
		return txErr
	})
	return quote, err
}

func (s *QuoteService) validateRenewalQuoteRequest(sub *model.BusinessSeatSubscription, ws *model.BusinessWorkspace, at time.Time) error {
	renewable := map[string]bool{
		model.BusinessSubscriptionStatusActive:         true,
		model.BusinessSubscriptionStatusExpiring:       true,
		model.BusinessSubscriptionStatusPendingRemoval: true,
	}
	if !renewable[sub.Status] {
		return errors.New("subscription not renewable in current status")
	}
	atUnix := at.Unix()
	pv, err := model.GetEffectiveBusinessPriceVersion(sub.ProductId, sub.WorkspaceId, atUnix)
	if err != nil {
		return model.ErrBusinessPricingNotConfigured
	}
	if pv.BillingCadence != ws.BillingCadence {
		return model.ErrBusinessBillingCadenceMismatch
	}
	cycle, err := s.billing.RenewalCycleWindow(ws, sub.PrepaidThrough)
	if err != nil {
		return err
	}
	existing, err := model.FindRenewalOrderForServicePeriod(sub.Id, cycle.Start.Unix(), cycle.End.Unix())
	if err != nil {
		return err
	}
	if existing != nil && existing.Status == model.BusinessOrderStatusPaid {
		return errors.New("renewal already paid for this billing period")
	}
	renewalTiming, err := s.billing.RenewalTiming(ws, sub.PrepaidThrough)
	if err != nil {
		return err
	}
	if atUnix < renewalTiming.RenewalWindowOpensAt {
		return errors.New("renewal window not open yet")
	}
	return nil
}

func (s *QuoteService) createRenewalQuoteInTx(tx *gorm.DB, userId int, sub *model.BusinessSeatSubscription, ws *model.BusinessWorkspace, at time.Time) (*model.BusinessQuote, error) {
	atUnix := at.Unix()
	pv, err := model.GetEffectiveBusinessPriceVersionTx(tx, sub.ProductId, sub.WorkspaceId, atUnix)
	if err != nil {
		return nil, model.ErrBusinessPricingNotConfigured
	}
	if pv.BillingCadence != ws.BillingCadence {
		return nil, model.ErrBusinessBillingCadenceMismatch
	}

	cycle, err := s.billing.RenewalCycleWindow(ws, sub.PrepaidThrough)
	if err != nil {
		return nil, err
	}
	existing, err := model.FindRenewalOrderForServicePeriodTx(tx, sub.Id, cycle.Start.Unix(), cycle.End.Unix())
	if err != nil {
		return nil, err
	}
	if existing != nil && existing.Status == model.BusinessOrderStatusPaid {
		return nil, errors.New("renewal already paid for this billing period")
	}

	renewalTiming, err := s.billing.RenewalTiming(ws, sub.PrepaidThrough)
	if err != nil {
		return nil, err
	}
	if atUnix < renewalTiming.RenewalWindowOpensAt {
		return nil, errors.New("renewal window not open yet")
	}

	full := RoundMoney(pv.PriceAmount, pv.Currency)
	ttl := setting.BusinessSeatQuoteTTLSeconds()
	if ttl <= 0 {
		ttl = 900
	}

	quote := &model.BusinessQuote{
		UserId:                   userId,
		WorkspaceId:              ws.Id,
		ProductId:                sub.ProductId,
		PriceVersionId:           pv.Id,
		ChatgptEmail:             sub.ChatgptEmail,
		QuoteType:                model.BusinessQuoteTypeRenewalFull,
		QuoteAt:                  atUnix,
		ExpiresAt:                atUnix + int64(ttl),
		CycleStartAt:             cycle.Start.Unix(),
		CycleEndAt:               cycle.End.Unix(),
		NextCycleStartAt:         cycle.Start.Unix(),
		NextCycleEndAt:           cycle.End.Unix(),
		ProrationRatio:           decimal.NewFromInt(1),
		CurrentCycleAmount:       full,
		NextCycleAmount:          full,
		TotalAmount:              full,
		Currency:                 pv.Currency,
		PrepaidThrough:           cycle.End.Unix(),
		RenewalWindowOpensAt:     renewalTiming.RenewalWindowOpensAt,
		RenewalPaymentDeadlineAt: renewalTiming.RenewalPaymentDeadlineAt,
		RenewalLeadDays:          renewalTiming.RenewalLeadDays,
		OrderType:                model.BusinessOrderTypeRenewal,
		Status:                   model.BusinessQuoteStatusPending,
	}
	if err := tx.Create(quote).Error; err != nil {
		return nil, err
	}
	_ = model.RecordBusinessSeatAuditTx(tx, userId, "QUOTE_CREATED", "quote", quote.Id, "type=RENEWAL")
	return quote, nil
}

func (s *QuoteService) ValidateQuoteForOrder(quoteId, userId int) (*model.BusinessQuote, error) {
	quote, err := model.GetBusinessQuoteById(quoteId)
	if err != nil {
		return nil, err
	}
	if quote.UserId != userId {
		return nil, errors.New("quote not owned by user")
	}
	if quote.Status != model.BusinessQuoteStatusPending {
		return nil, errors.New("quote not available")
	}
	if quote.ExpiresAt <= time.Now().Unix() {
		_ = model.DB.Model(quote).Update("status", model.BusinessQuoteStatusExpired).Error
		return nil, model.ErrBusinessQuoteExpired
	}
	return quote, nil
}

func (s *QuoteService) MarkQuoteUsed(tx *gorm.DB, quoteId int) error {
	return tx.Model(&model.BusinessQuote{}).
		Where("id = ? AND status = ?", quoteId, model.BusinessQuoteStatusPending).
		Update("status", model.BusinessQuoteStatusUsed).Error
}

func normalizeEmail(email string) string {
	return strings.ToLower(strings.TrimSpace(email))
}

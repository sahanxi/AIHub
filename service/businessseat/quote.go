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
	QuoteType          string
	CycleStartAt       int64
	CycleEndAt         int64
	NextCycleStartAt   int64
	NextCycleEndAt     int64
	ProrationRatio     decimal.Decimal
	CurrentCycleAmount decimal.Decimal
	NextCycleAmount    decimal.Decimal
	TotalAmount        decimal.Decimal
	PrepaidThrough     int64
	PriceVersionId     int
	Currency           string
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
	pv, err := model.GetEffectiveBusinessPriceVersion(product.Id, atUnix)
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
		UserId:             input.UserId,
		WorkspaceId:        ws.Id,
		ProductId:          product.Id,
		PriceVersionId:     pv.Id,
		ChatgptEmail:       email,
		QuoteType:          result.QuoteType,
		QuoteAt:            atUnix,
		ExpiresAt:          atUnix + int64(ttl),
		CycleStartAt:       result.CycleStartAt,
		CycleEndAt:         result.CycleEndAt,
		NextCycleStartAt:   result.NextCycleStartAt,
		NextCycleEndAt:     result.NextCycleEndAt,
		ProrationRatio:     result.ProrationRatio,
		CurrentCycleAmount: result.CurrentCycleAmount,
		NextCycleAmount:    result.NextCycleAmount,
		TotalAmount:        result.TotalAmount,
		Currency:           result.Currency,
		PrepaidThrough:     result.PrepaidThrough,
		OrderType:          input.OrderType,
		Status:             model.BusinessQuoteStatusPending,
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
	case model.BusinessOrderTypeRenewal, model.BusinessOrderTypeReactivation:
		return QuoteResult{}, errors.New("renewal quote requires subscription context")
	case model.BusinessOrderTypeNew:
		return s.calculateInitialQuote(ws, pv, at)
	default:
		return QuoteResult{}, fmt.Errorf("unsupported order type: %s", orderType)
	}
}

func (s *QuoteService) calculateInitialQuote(ws *model.BusinessWorkspace, pv *model.BusinessPriceVersion, at time.Time) (QuoteResult, error) {
	price := pv.PriceAmount
	currency := pv.Currency
	current, err := s.billing.GetCurrentCycle(ws, at)
	if err != nil {
		return QuoteResult{}, err
	}
	next := s.billing.GetNextCycle(ws, current)

	if s.billing.IsWithinCycleStartGraceWindow(ws, at, current.Start) {
		full := RoundMoney(price, currency)
		return QuoteResult{
			QuoteType:          model.BusinessQuoteTypeCycleStartFull,
			CycleStartAt:       current.Start.Unix(),
			CycleEndAt:         current.End.Unix(),
			NextCycleStartAt:   next.Start.Unix(),
			NextCycleEndAt:     next.End.Unix(),
			ProrationRatio:     decimal.NewFromInt(1),
			CurrentCycleAmount: full,
			NextCycleAmount:    decimal.Zero,
			TotalAmount:        full,
			PrepaidThrough:     current.End.Unix(),
			PriceVersionId:     pv.Id,
			Currency:           currency,
		}, nil
	}

	ratio := s.billing.CalculateRemainingRatio(current.Start, current.End, at)
	prorated := MultiplyAndRound(price, ratio, currency)
	nextFull := RoundMoney(price, currency)
	total := RoundMoney(prorated.Add(nextFull), currency)

	return QuoteResult{
		QuoteType:          model.BusinessQuoteTypeMidCycleProratedPlusNext,
		CycleStartAt:       current.Start.Unix(),
		CycleEndAt:         current.End.Unix(),
		NextCycleStartAt:   next.Start.Unix(),
		NextCycleEndAt:     next.End.Unix(),
		ProrationRatio:     ratio,
		CurrentCycleAmount: prorated,
		NextCycleAmount:    nextFull,
		TotalAmount:        total,
		PrepaidThrough:     next.End.Unix(),
		PriceVersionId:     pv.Id,
		Currency:           currency,
	}, nil
}

func (s *QuoteService) CreateRenewalQuote(userId int, subscriptionId int) (*model.BusinessQuote, error) {
	sub, err := model.GetBusinessSeatSubscriptionById(subscriptionId)
	if err != nil {
		return nil, err
	}
	if sub.UserId != userId {
		return nil, errors.New("subscription not owned by user")
	}
	renewable := map[string]bool{
		model.BusinessSubscriptionStatusActive:         true,
		model.BusinessSubscriptionStatusExpiring:       true,
		model.BusinessSubscriptionStatusPendingRemoval: true,
	}
	if !renewable[sub.Status] {
		return nil, errors.New("subscription not renewable in current status")
	}

	ws, err := model.GetBusinessWorkspaceById(sub.WorkspaceId)
	if err != nil {
		return nil, err
	}
	at := time.Now()
	atUnix := at.Unix()
	pv, err := model.GetEffectiveBusinessPriceVersion(sub.ProductId, atUnix)
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
	full := RoundMoney(pv.PriceAmount, pv.Currency)
	ttl := setting.BusinessSeatQuoteTTLSeconds()
	if ttl <= 0 {
		ttl = 900
	}

	quote := &model.BusinessQuote{
		UserId:             userId,
		WorkspaceId:        ws.Id,
		ProductId:          sub.ProductId,
		PriceVersionId:     pv.Id,
		ChatgptEmail:       sub.ChatgptEmail,
		QuoteType:          model.BusinessQuoteTypeRenewalFull,
		QuoteAt:            atUnix,
		ExpiresAt:          atUnix + int64(ttl),
		CycleStartAt:       cycle.Start.Unix(),
		CycleEndAt:         cycle.End.Unix(),
		NextCycleStartAt:   cycle.Start.Unix(),
		NextCycleEndAt:     cycle.End.Unix(),
		ProrationRatio:     decimal.NewFromInt(1),
		CurrentCycleAmount: full,
		NextCycleAmount:    decimal.Zero,
		TotalAmount:        full,
		Currency:           pv.Currency,
		PrepaidThrough:     cycle.End.Unix(),
		OrderType:          model.BusinessOrderTypeRenewal,
		Status:             model.BusinessQuoteStatusPending,
	}
	if err := model.DB.Create(quote).Error; err != nil {
		return nil, err
	}
	model.RecordBusinessSeatAudit(userId, "QUOTE_CREATED", "quote", quote.Id, "type=RENEWAL")
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
